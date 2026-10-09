import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarRange, ChevronDown, ChartGantt } from "lucide-react";
import { fetchProjectById, fetchTasksByProject, fetchMembersByProject } from "../../../api.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import ProjectHeader from "../../components/project/ProjectHeader.jsx";
import { withFallback, failureMessage } from "../../utils/requestState.js";
import { buildTimeline, filterTimelineRows } from "../../utils/timeline.js";
import { formatDayDMY } from "../../utils/projectSchedule.js";
import { avatarToneClass, getInitials } from "../../utils/avatar.js";
import { LoadingBlock, EmptyBlock } from "../Dashboard/analytics/chartKit.jsx";
import "./project.css";

const GROUP_LABEL = { todo: "To do", progress: "In progress", review: "Review", completed: "Completed", other: "Other" };
const shortDay = (date) => (date ? `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}` : "");

const memberUser = (m) => (m?.userId && typeof m.userId === "object" ? m.userId : m);
const memberUserId = (m) => String(memberUser(m)?._id || memberUser(m)?.id || m?.userId || "");
const personName = (p) => (p && typeof p === "object" ? p.username || p.name || p.email : "") || "Unknown user";

/**
 * Timeline (Gantt by week) of one project. Tasks only carry a planned `week`, so each bar sits in that week;
 * an unfinished task whose week has passed is drawn up to the current week (hatched = slipping).
 */
export default function ProjectTimeline() {
    const { id: projectId } = useParams();
    const [data, setData] = useState({ loading: true, project: null, tasks: [], members: [], failures: [] });
    const [reloadKey, setReloadKey] = useState(0);
    const [userId, setUserId] = useState("");
    const [hideCompleted, setHideCompleted] = useState(false);

    useEffect(() => {
        if (!projectId) return;
        let cancelled = false;
        const failures = [];
        Promise.all([
            withFallback(fetchProjectById(projectId), null, failures, "project"),
            withFallback(fetchTasksByProject(projectId), [], failures, "tasks"),
            withFallback(fetchMembersByProject(projectId), [], failures, "members"),
        ]).then(([p, t, m]) => {
            if (cancelled) return;
            setData({
                loading: false,
                project: p?.data || p,
                tasks: Array.isArray(t) ? t : (t?.data || []),
                members: Array.isArray(m) ? m : (m?.data || []),
                failures,
            });
        });
        return () => { cancelled = true; };
    }, [projectId, reloadKey]);

    const timeline = useMemo(() => buildTimeline(data.project, data.tasks), [data.project, data.tasks]);
    const rows = useMemo(() => filterTimelineRows(timeline.rows, { userId, hideCompleted }), [timeline.rows, userId, hideCompleted]);
    const slippedCount = timeline.rows.filter((r) => r.slipped).length;

    const retry = () => {
        setData((d) => ({ ...d, loading: true }));
        setReloadKey((k) => k + 1);
    };
    const coreFailure = data.failures.find((f) => f.label !== "members");
    const membersFailed = data.failures.some((f) => f.label === "members");

    if (!data.loading && coreFailure) {
        return (
            <main className="page-content">
                <ErrorState title="Couldn't load the project timeline" message={failureMessage(coreFailure)} onRetry={retry} />
            </main>
        );
    }

    const weekCount = timeline.weeks.length;

    return (
        <>
            <ProjectHeader
                projectId={projectId}
                project={data.project}
                memberCount={data.members.length}
                taskCount={data.tasks.length}
                startDate={formatDayDMY(data.project?.startDate || data.project?.createdAt) || "Not set"}
                endDate={formatDayDMY(data.project?.date || data.project?.endDate) || "Not set"}
                loading={data.loading}
            />

            <main className="page-content timeline-page">
                {membersFailed && (
                    <ErrorState variant="inline" title="Project members could not be loaded." message="The person filter is unavailable." onRetry={retry} />
                )}

                {data.loading ? (
                    <div className="card analytics-placeholder"><LoadingBlock text="Loading timeline…" /></div>
                ) : data.tasks.length === 0 ? (
                    <div className="card">
                        <EmptyBlock
                            icon={<ChartGantt className="icon" />}
                            title="No tasks to plan yet"
                            desc="Tasks appear on the timeline in the week they are planned for."
                            action={<Link className="btn btn-primary btn-sm" to={`/projectboard/${projectId}`}>Open the board</Link>}
                        />
                    </div>
                ) : (
                    <section className="card timeline-card" aria-labelledby="timeline-title">
                        <header className="timeline-toolbar">
                            <div className="timeline-heading">
                                <h2 id="timeline-title" className="chart-card-title">Timeline by week</h2>
                                <p className="chart-card-subtitle">
                                    {timeline.currentWeek ? `Now: week ${timeline.currentWeek} of ${weekCount}` : `Project not started — ${weekCount} week${weekCount === 1 ? "" : "s"} planned`}
                                    {slippedCount > 0 && ` · ${slippedCount} unfinished task${slippedCount === 1 ? "" : "s"} past the planned week`}
                                </p>
                            </div>
                            <div className="timeline-filters">
                                {!membersFailed && (
                                    <div className="select-wrap">
                                        <select className={`select${userId ? " is-active" : ""}`} aria-label="Filter by person" value={userId} onChange={(e) => setUserId(e.target.value)}>
                                            <option value="">Everyone</option>
                                            {data.members.map((m) => (
                                                <option key={memberUserId(m)} value={memberUserId(m)}>{personName(memberUser(m))}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="icon icon-sm" aria-hidden="true" />
                                    </div>
                                )}
                                <label className="timeline-check">
                                    <input type="checkbox" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} />
                                    Hide completed
                                </label>
                            </div>
                        </header>

                        <ul className="timeline-legend" aria-label="Legend">
                            {["todo", "progress", "review", "completed"].map((g) => (
                                <li key={g} className={`timeline-legend-item kind-${g}`}><span className="timeline-swatch" aria-hidden="true" />{GROUP_LABEL[g]}</li>
                            ))}
                            <li className="timeline-legend-item is-slipped"><span className="timeline-swatch" aria-hidden="true" />Past planned week</li>
                        </ul>

                        {rows.length === 0 ? (
                            <p className="chart-note">No task matches the filters.</p>
                        ) : (
                            <div className="timeline-scroll">
                                <div className="timeline-grid" style={{ "--weeks": weekCount }} role="table" aria-label="Tasks by planned week">
                                    <div className="timeline-row timeline-head" role="row">
                                        <span className="timeline-task-cell" role="columnheader">Task</span>
                                        {timeline.weeks.map((w) => (
                                            <span key={w.number} role="columnheader" className={`timeline-week${w.number === timeline.currentWeek ? " is-now" : ""}`}>
                                                <strong>W{w.number}</strong>
                                                {w.start && <span className="timeline-week-date">{shortDay(w.start)}</span>}
                                            </span>
                                        ))}
                                    </div>
                                    {rows.map((row) => {
                                        const names = row.assignees.map(personName);
                                        const label = `${row.title}: ${GROUP_LABEL[row.group]}, planned week ${row.week}${row.slipped ? `, not finished — now week ${timeline.currentWeek}` : ""}, ${row.points} pts`;
                                        return (
                                            <div className="timeline-row" role="row" key={row.id}>
                                                <span className="timeline-task-cell" role="rowheader">
                                                    <span className="timeline-task-title" title={row.title}>{row.title}</span>
                                                    <span className="timeline-task-people">
                                                        {row.assignees.slice(0, 3).map((a, i) => (
                                                            <span key={i} className={`avatar avatar-xs ${avatarToneClass(typeof a === "object" ? a?._id : a)}`} title={personName(a)} aria-hidden="true">{getInitials(personName(a))}</span>
                                                        ))}
                                                        {names.length === 0 && <span className="timeline-unassigned">Unassigned</span>}
                                                    </span>
                                                </span>
                                                {timeline.currentWeek && (
                                                    <span className="timeline-now-col" style={{ gridColumn: timeline.currentWeek + 1 }} aria-hidden="true" />
                                                )}
                                                <span
                                                    role="cell"
                                                    className={`timeline-bar kind-${row.group}${row.slipped ? " is-slipped" : ""}`}
                                                    style={{ gridColumn: `${row.from + 1} / ${row.to + 2}` }}
                                                    title={label}
                                                    aria-label={label}
                                                >
                                                    <span className="timeline-bar-text">{row.points} pts</span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <p className="chart-note">
                            <CalendarRange className="icon icon-sm" aria-hidden="true" /> Week 1 starts on the project start date; a task's week is set on the board.
                            {timeline.truncated && " Tasks planned after week 52 are shown in the last column."}
                        </p>
                    </section>
                )}
            </main>
        </>
    );
}
