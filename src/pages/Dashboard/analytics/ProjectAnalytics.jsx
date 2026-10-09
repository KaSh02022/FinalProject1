import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, FolderKanban } from "lucide-react";
import ErrorState from "../../../components/common/ErrorState.jsx";
import { failureMessage } from "../../../utils/requestState.js";
import { socket } from "../../../utils/socket.js";
import { fetchProjects } from "../../../../api.jsx";
import EpicBurndown from "../EpicBurndown/EpicBurndown.jsx";
import WeeklyExpectancy from "../WeeklyExpectancy/WeeklyExpectancy.jsx";
import { LoadingBlock, EmptyBlock } from "./chartKit.jsx";

// last project picked on the dashboard (per-browser convenience only)
const STORAGE_KEY = "dashboard.burndownProjectId";
const readStoredProjectId = () => {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
};
const storeProjectId = (id) => {
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* storage unavailable: nothing to remember */ }
};

// task events after which both charts may change (they are computed per request; there is no chart event)
const TASK_EVENTS = ["task_created", "task_updated", "task_moved", "task_deleted"];

/**
 * Project analytics on the dashboard: one project picker (GET /project) for two independent charts —
 * Epic Burndown (remaining points) and Plan vs. Real Progress (cumulative). Each chart fetches its own
 * endpoint; this component only picks the project and tells them to refetch when a task changes.
 */
function ProjectAnalytics() {
    const [projects, setProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [projectsError, setProjectsError] = useState(null);
    const [projectsKey, setProjectsKey] = useState(0);
    const [selectedId, setSelectedId] = useState("");
    const [refreshToken, setRefreshToken] = useState(0);
    const refreshTimer = useRef(null);

    useEffect(() => {
        let cancelled = false;
        fetchProjects()
            .then((data) => {
                if (cancelled) return;
                const list = Array.isArray(data) ? data : [];
                setProjects(list);
                setSelectedId((current) => {
                    const has = (id) => id && list.some((p) => p._id === id);
                    if (has(current)) return current;
                    const stored = readStoredProjectId();
                    return has(stored) ? stored : (list[0]?._id || "");
                });
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Error loading projects for the dashboard charts:", err);
                setProjectsError(err);
            })
            .finally(() => {
                if (!cancelled) setProjectsLoading(false);
            });
        return () => { cancelled = true; };
    }, [projectsKey]);

    // live refresh: one room subscription for both charts
    useEffect(() => {
        if (!selectedId) return;
        const refresh = () => {
            clearTimeout(refreshTimer.current);
            // one refetch for a burst of events (a move emits several)
            refreshTimer.current = setTimeout(() => setRefreshToken((k) => k + 1), 400);
        };
        socket.emit("join_project", selectedId);
        TASK_EVENTS.forEach((event) => socket.on(event, refresh));
        return () => {
            clearTimeout(refreshTimer.current);
            socket.emit("leave_project", selectedId);
            TASK_EVENTS.forEach((event) => socket.off(event, refresh));
        };
    }, [selectedId]);

    const selectProject = (id) => {
        setSelectedId(id);
        storeProjectId(id);
    };
    const reloadProjects = () => {
        setProjectsLoading(true);
        setProjectsError(null);
        setProjectsKey((k) => k + 1);
        setRefreshToken((k) => k + 1);
    };

    const selectedProject = projects.find((p) => p._id === selectedId) || null;

    let content;
    if (projectsLoading) {
        content = <div className="card analytics-placeholder"><LoadingBlock text="Loading projects…" /></div>;
    } else if (projectsError) {
        content = (
            <ErrorState
                title="Couldn't load projects"
                message={failureMessage({ error: projectsError })}
                onRetry={reloadProjects}
            />
        );
    } else if (projects.length === 0) {
        content = (
            <div className="card analytics-placeholder">
                <EmptyBlock
                    icon={<FolderKanban className="icon" />}
                    title="No projects yet"
                    desc="Create a project to follow its progress here."
                    action={<Link to="/project" className="btn btn-outline btn-sm">Go to Projects</Link>}
                />
            </div>
        );
    } else {
        content = (
            <div className="analytics-grid">
                <EpicBurndown
                    projectId={selectedId}
                    projectName={selectedProject?.name}
                    refreshToken={refreshToken}
                    onReloadProjects={reloadProjects}
                />
                <WeeklyExpectancy
                    projectId={selectedId}
                    projectName={selectedProject?.name}
                    refreshToken={refreshToken}
                />
            </div>
        );
    }

    return (
        <section className="analytics" aria-labelledby="analytics-title">
            <div className="analytics-header">
                <div>
                    <h2 id="analytics-title" className="section-title">Project analytics</h2>
                    <p className="section-subtitle">Story points of one project, updated live when its tasks change.</p>
                </div>
                {!projectsLoading && !projectsError && projects.length > 0 && (
                    <div className="select-wrap analytics-project">
                        <select
                            className="select"
                            aria-label="Project for the charts"
                            value={selectedId}
                            onChange={(e) => selectProject(e.target.value)}
                        >
                            {projects.map((p) => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="icon icon-sm" aria-hidden="true" />
                    </div>
                )}
            </div>
            {content}
        </section>
    );
}

export default ProjectAnalytics;
