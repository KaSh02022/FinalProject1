import { Link, useLocation } from "react-router-dom";
import {
    BarChart2,
    Calendar,
    ChartGantt,
    CalendarRange,
    Info,
    LayoutGrid,
    List,
    ListChecks,
    Loader2,
    Settings,
    UsersRound,
} from "lucide-react";

// Project sub-pages, in tab order. Settings is reached through the gear button.
const PROJECT_TABS = [
    { path: "/projectoverview", label: "Overview", Icon: Info },
    { path: "/projectchart", label: "Chart", Icon: BarChart2 },
    { path: "/projectboard", label: "Board", Icon: LayoutGrid },
    { path: "/projectlist", label: "Backlog", Icon: List },
    { path: "/projectcalendar", label: "Calendar", Icon: Calendar },
    { path: "/projecttimeline", label: "Timeline", Icon: ChartGantt },
];

/**
 * Shared header of every project page: name + key facts on one row, actions on the right,
 * section tabs below. Pages pass values they already loaded/formatted — this component
 * fetches nothing and never invents data.
 *
 * @param {string}  projectId
 * @param {object}  project      loaded project (name, description, color)
 * @param {number}  memberCount
 * @param {number}  taskCount    as counted by the page (e.g. Backlog counts backlog tasks)
 * @param {string}  startDate    already formatted by the page
 * @param {string}  endDate      already formatted by the page
 * @param {boolean} loading      project info still loading (Chart page loads it separately)
 */
function ProjectHeader({ projectId, project, memberCount, taskCount, startDate, endDate, loading = false }) {
    const { pathname } = useLocation();
    const onSettings = pathname.startsWith("/projectsetting");
    const description = (project?.description || project?.desc || "").trim();

    return (
        <div className="project-header">
            <div className="project-header-top">
                {loading ? (
                    <div className="project-header-loading" role="status">
                        <Loader2 className="icon icon-md animate-spin" aria-hidden="true" />
                        <span>Loading project…</span>
                    </div>
                ) : (
                    <div className="project-header-main">
                        <div className="project-title-row">
                            <span
                                className="project-color-dot"
                                style={{ background: project?.color || "var(--color-primary-600)" }}
                                aria-hidden="true"
                            ></span>
                            <h1 className="project-title">{project?.name || "Untitled project"}</h1>
                        </div>
                        <ul className="project-meta-row" aria-label="Project details">
                            <li className="project-meta-item" title="Members">
                                <UsersRound className="icon icon-sm" aria-hidden="true" />
                                {memberCount} {memberCount === 1 ? "member" : "members"}
                            </li>
                            <li className="project-meta-item" title="Tasks">
                                <ListChecks className="icon icon-sm" aria-hidden="true" />
                                {taskCount} {taskCount === 1 ? "task" : "tasks"}
                            </li>
                            <li className="project-meta-item" title="Start date – end date">
                                <CalendarRange className="icon icon-sm" aria-hidden="true" />
                                <span>{startDate}</span>
                                <span aria-hidden="true">–</span>
                                <span>{endDate}</span>
                            </li>
                        </ul>
                        {description && (
                            <p className="project-description" title={description}>{description}</p>
                        )}
                    </div>
                )}

                <div className="project-header-actions">
                    <Link
                        to={`/projectsetting/${projectId}`}
                        className={`icon-btn icon-btn-outline${onSettings ? " is-active" : ""}`}
                        aria-label="Project settings"
                        aria-current={onSettings ? "page" : undefined}
                        title="Project settings"
                    >
                        <Settings className="icon" />
                    </Link>
                </div>
            </div>

            <nav className="project-tabs" aria-label="Project sections">
                {PROJECT_TABS.map(({ path, label, Icon }) => {
                    const active = pathname.startsWith(path);
                    return (
                        <Link
                            key={path}
                            to={`${path}/${projectId}`}
                            className={`project-tab${active ? " active" : ""}`}
                            aria-current={active ? "page" : undefined}
                        >
                            <Icon className="icon icon-sm" aria-hidden="true" /> {label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

export default ProjectHeader;
