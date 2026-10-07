import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Loader2, TrendingDown, FolderKanban, SearchX, LogIn } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
import ErrorState from "../../../components/common/ErrorState.jsx";
import { failureMessage } from "../../../utils/requestState.js";
import { parseEpicBurndown, findCurrentWeek, getBurndownErrorKind } from "../../../utils/epicBurndown.js";
import { socket } from "../../../utils/socket.js";
import { fetchProjects, fetchEpicBurndown } from "../../../../api.jsx";

// last project picked in this widget (per-browser convenience only)
const STORAGE_KEY = "dashboard.burndownProjectId";
const readStoredProjectId = () => {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
};
const storeProjectId = (id) => {
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* storage unavailable: nothing to remember */ }
};

// task events after which the backend burndown may change (it is computed per request, there is no burndown event)
const TASK_EVENTS = ["task_created", "task_updated", "task_moved", "task_deleted"];

const PLANNED_COLOR = "#94a3b8"; // --color-text-subtle
const ACTUAL_COLOR = "#4f46e5";  // --color-primary-600

// narrow screens: 7 full "Week n" labels do not fit side by side → tilt them (labels stay the backend's)
function useNarrowScreen() {
    const query = "(max-width: 639px)";
    const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = () => setNarrow(mql.matches);
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, []);
    return narrow;
}

const formatPoints = (value) => (value === null ? "Not reached yet" : `${value} pts`);

/**
 * Epic Burndown of one project, straight from GET /task/project/:projectId/epic-burndown.
 * planned/actual/weeks/currentWeek are drawn exactly as the backend returns them — nothing is recalculated
 * here, and `actual: null` (future week) stays null so the Actual line simply stops.
 */
function EpicBurndown() {
    // project picker (GET /project)
    const [projects, setProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [projectsError, setProjectsError] = useState(null);
    const [projectsKey, setProjectsKey] = useState(0);
    const [selectedId, setSelectedId] = useState("");

    // last burndown answer: { projectId, reloadKey, data, error, invalid } — loading is derived from it
    const [result, setResult] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const narrow = useNarrowScreen();
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
                console.error("Error loading projects for the burndown:", err);
                setProjectsError(err);
            })
            .finally(() => {
                if (!cancelled) setProjectsLoading(false);
            });
        return () => { cancelled = true; };
    }, [projectsKey]);

    useEffect(() => {
        if (!selectedId) return;
        let cancelled = false;
        fetchEpicBurndown(selectedId)
            .then((body) => {
                if (cancelled) return;
                const parsed = parseEpicBurndown(body);
                setResult({ projectId: selectedId, reloadKey, data: parsed, error: null, invalid: !parsed });
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Error loading epic burndown:", err);
                setResult({ projectId: selectedId, reloadKey, data: null, error: err, invalid: false });
            });
        return () => { cancelled = true; };
    }, [selectedId, reloadKey]);

    // live refresh: refetch the backend burndown when a task of this project changes
    useEffect(() => {
        if (!selectedId) return;
        const refresh = () => {
            clearTimeout(refreshTimer.current);
            // one refetch for a burst of events (a move emits several)
            refreshTimer.current = setTimeout(() => setReloadKey((k) => k + 1), 400);
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
    const retry = () => setReloadKey((k) => k + 1);
    const reloadProjects = () => {
        setProjectsLoading(true);
        setProjectsError(null);
        setProjectsKey((k) => k + 1);
        setReloadKey((k) => k + 1);
    };

    const selectedProject = projects.find((p) => p._id === selectedId) || null;
    // an answer for another project is never shown under the selected one
    const current = result && result.projectId === selectedId ? result : null;
    // waiting for the latest request; a refresh keeps the previous chart of the same project (dimmed)
    const loading = !current || current.reloadKey !== reloadKey;
    const data = current?.data || null;
    const error = loading ? null : current.error;
    const invalidResponse = !loading && current.invalid;
    const currentEntry = findCurrentWeek(data);

    let body;
    if (projectsLoading) {
        body = <LoadingBlock text="Loading projects..." />;
    } else if (projectsError) {
        body = (
            <ErrorState
                title="Couldn't load projects"
                message={failureMessage({ error: projectsError })}
                onRetry={reloadProjects}
            />
        );
    } else if (projects.length === 0) {
        body = (
            <EmptyBlock
                icon={<FolderKanban className="icon" />}
                title="No projects yet"
                desc="Create a project to follow its burndown here."
                action={<Link to="/project" className="btn btn-outline btn-sm">Go to Projects</Link>}
            />
        );
    } else if (error) {
        const kind = getBurndownErrorKind(error);
        if (kind === "not-found") {
            body = (
                <EmptyBlock
                    icon={<SearchX className="icon" />}
                    title="Project not found"
                    desc="This project no longer exists. Reload the project list and pick another one."
                    action={<button type="button" className="btn btn-outline btn-sm" onClick={reloadProjects}>Reload projects</button>}
                />
            );
        } else if (kind === "auth") {
            body = (
                <EmptyBlock
                    icon={<LogIn className="icon" />}
                    title="Your session has ended"
                    desc="Sign in again to see the burndown."
                    action={<Link to="/login" className="btn btn-outline btn-sm">Sign in</Link>}
                />
            );
        } else {
            body = (
                <ErrorState
                    title="Couldn't load the burndown"
                    message={failureMessage({ error })}
                    onRetry={retry}
                />
            );
        }
    } else if (invalidResponse) {
        body = (
            <ErrorState
                title="Couldn't read the burndown"
                message="The server sent burndown data in an unexpected format."
                onRetry={retry}
            />
        );
    } else if (!data) {
        body = <LoadingBlock text="Loading burndown..." />;
    } else if (data.totalPoints === 0) {
        body = (
            <EmptyBlock
                icon={<TrendingDown className="icon" />}
                title="No story points yet"
                desc="Tasks in this project have no points, so there is nothing to burn down. Add points to tasks on the board."
                action={<Link to={`/projectboard/${selectedId}`} className="btn btn-outline btn-sm">Open board</Link>}
            />
        );
    } else {
        body = (
            <>
                <dl className="burndown-summary">
                    <div className="burndown-summary-item">
                        <dt>Total points</dt>
                        <dd>{data.totalPoints}</dd>
                    </div>
                    <div className="burndown-summary-item">
                        <dt>Current week</dt>
                        <dd>{currentEntry ? currentEntry.week : `Week ${data.currentWeek}`}</dd>
                    </div>
                    {currentEntry && currentEntry.actual !== null && (
                        <div className="burndown-summary-item">
                            <dt>Remaining</dt>
                            <dd>{currentEntry.actual} pts</dd>
                        </div>
                    )}
                    {currentEntry && (
                        <div className="burndown-summary-item">
                            <dt>Planned now</dt>
                            <dd>{currentEntry.planned} pts</dd>
                        </div>
                    )}
                </dl>

                <div className={`burndown-chart${loading ? " is-refreshing" : ""}`} aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.weeks} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="week"
                                interval={0}
                                padding={{ left: 12, right: narrow ? 8 : 28 }}
                                tick={{ fontSize: 12, fill: "#64748b" }}
                                angle={narrow ? -40 : 0}
                                textAnchor={narrow ? "end" : "middle"}
                                height={narrow ? 52 : 30}
                                tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                width={44}
                                tick={{ fontSize: 12, fill: "#64748b" }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                filterNull={false}
                                itemSorter={(item) => (item.dataKey === "planned" ? 0 : 1)}
                                formatter={(value, name) => [formatPoints(value), name]}
                                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                            />
                            {/* itemSorter null: keep Planned → Actual (recharts sorts alphabetically by default) */}
                            <Legend verticalAlign="top" height={32} iconType="plainline" itemSorter={null} />
                            {currentEntry && (
                                <ReferenceLine
                                    x={currentEntry.week}
                                    stroke="#cbd5e1"
                                    strokeDasharray="4 4"
                                    label={{ value: "Now", position: "insideTopRight", fill: "#64748b", fontSize: 11 }}
                                />
                            )}
                            <Line
                                type="linear"
                                dataKey="planned"
                                name="Planned"
                                stroke={PLANNED_COLOR}
                                strokeWidth={2}
                                strokeDasharray="6 4"
                                dot={{ r: 3, fill: PLANNED_COLOR, strokeWidth: 0 }}
                                isAnimationActive={false}
                            />
                            {/* connectNulls off: future weeks (actual null) are a gap, never 0 or a guess */}
                            <Line
                                type="linear"
                                dataKey="actual"
                                name="Actual"
                                stroke={ACTUAL_COLOR}
                                strokeWidth={2.5}
                                connectNulls={false}
                                dot={{ r: 4, fill: ACTUAL_COLOR, strokeWidth: 0 }}
                                activeDot={{ r: 5 }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* the same backend values as text, for screen readers and for checking the chart */}
                <table className="sr-only burndown-table">
                    <caption>Epic burndown of {selectedProject?.name || "the selected project"}</caption>
                    <thead>
                        <tr><th scope="col">Week</th><th scope="col">Planned</th><th scope="col">Actual</th></tr>
                    </thead>
                    <tbody>
                        {data.weeks.map((w) => (
                            <tr key={w.week} data-actual={w.actual === null ? "null" : w.actual}>
                                <th scope="row">{w.week}</th>
                                <td>{w.planned}</td>
                                <td>{w.actual === null ? "No data yet" : w.actual}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="burndown-note">
                    Remaining story points per week from the project start. The Actual line stops at the current week.
                </p>
            </>
        );
    }

    return (
        <section className="card burndown-card" aria-labelledby="burndown-title">
            <div className="burndown-header">
                <div className="burndown-heading">
                    <h2 id="burndown-title" className="burndown-title">Epic Burndown</h2>
                    <p className="burndown-subtitle">Planned vs. actual remaining points</p>
                </div>
                {!projectsLoading && !projectsError && projects.length > 0 && (
                    <div className="select-wrap burndown-project">
                        <select
                            className="select"
                            aria-label="Project for the burndown"
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
            <div className="burndown-body" aria-busy={loading || projectsLoading}>
                {body}
            </div>
        </section>
    );
}

function LoadingBlock({ text }) {
    return (
        <div className="page-loading burndown-loading" role="status">
            <Loader2 className="icon animate-spin" aria-hidden="true" />
            <span>{text}</span>
        </div>
    );
}

function EmptyBlock({ icon, title, desc, action }) {
    return (
        <div className="empty-state burndown-empty">
            <span className="empty-state-icon" aria-hidden="true">{icon}</span>
            <p className="empty-state-title">{title}</p>
            <p className="empty-state-desc">{desc}</p>
            {action}
        </div>
    );
}

export default EpicBurndown;
