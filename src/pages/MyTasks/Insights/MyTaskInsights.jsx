import { useMemo } from "react";
import { AlarmClock, CircleCheck, Gauge, ListTodo, PieChart, TriangleAlert } from "lucide-react";
import { computeMyTaskStats } from "../../../utils/myTaskStats.js";
import { ChartCard, ChartStats, EmptyBlock } from "../../Dashboard/analytics/chartKit.jsx";

const percent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

/**
 * "Insights" tab of My Tasks: where my tasks stand, from the list already loaded (no extra request).
 * Status bars use the board's status tokens so the colors mean the same thing everywhere.
 */
function MyTaskInsights({ tasks, getDueDate, searchQuery }) {
    const stats = useMemo(() => computeMyTaskStats(tasks, getDueDate), [tasks, getDueDate]);
    const maxCount = Math.max(1, ...stats.groups.map((g) => g.count));

    if (stats.total === 0) {
        return (
            <EmptyBlock
                icon={<PieChart className="icon" />}
                title={searchQuery ? "No tasks match the search" : "No tasks assigned to you yet"}
                desc="Statistics appear as soon as you have tasks."
            />
        );
    }

    return (
        <div className="my-insights">
            <ChartStats
                items={[
                    { label: "Tasks", value: <span className="my-insights-kpi"><ListTodo className="icon icon-sm" aria-hidden="true" />{stats.total}</span> },
                    { label: "Completed", value: <span className="my-insights-kpi is-done"><CircleCheck className="icon icon-sm" aria-hidden="true" />{stats.completed} · {stats.completionRate}%</span> },
                    { label: "Overdue", value: <span className={`my-insights-kpi${stats.overdue ? " is-danger" : ""}`}><TriangleAlert className="icon icon-sm" aria-hidden="true" />{stats.overdue}</span> },
                    { label: "Due in 2 days", value: <span className={`my-insights-kpi${stats.dueSoon ? " is-warning" : ""}`}><AlarmClock className="icon icon-sm" aria-hidden="true" />{stats.dueSoon}</span> },
                    { label: "Story points", value: <span className="my-insights-kpi"><Gauge className="icon icon-sm" aria-hidden="true" />{stats.points} pts</span> },
                ]}
            />

            <div className="my-insights-grid">
                <ChartCard
                    id="my-status"
                    title="Tasks by status"
                    subtitle={searchQuery ? `Tasks matching “${searchQuery}”` : "Completed = confirmed by the board (moved to Done)"}
                >
                    <ul className="status-bars">
                        {stats.groups.map((g) => (
                            <li key={g.key} className={`status-bar-row kind-${g.key}`}>
                                <span className="status-bar-label">{g.label}</span>
                                <span className="status-bar-track" aria-hidden="true">
                                    <span className="status-bar-fill" style={{ width: `${(g.count / maxCount) * 100}%` }} />
                                </span>
                                <span className="status-bar-value">
                                    <strong>{g.count}</strong> · {percent(g.count, stats.total)}% · {g.points} pts
                                </span>
                            </li>
                        ))}
                    </ul>
                </ChartCard>

                <ChartCard id="my-projects" title="Progress by project" subtitle="Completed / assigned to you">
                    <ul className="project-progress-list">
                        {stats.projects.map((p) => (
                            <li key={p.id} className="project-progress-row">
                                <span className="project-progress-name">
                                    <span className="project-color-dot" style={{ background: p.color || "var(--color-text-subtle)" }} aria-hidden="true" />
                                    {p.name || "Project"}
                                </span>
                                <span
                                    className="progress-bar"
                                    role="progressbar"
                                    aria-label={`${p.name || "Project"} progress`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={percent(p.completed, p.total)}
                                >
                                    <span className="progress-bar-fill" style={{ width: `${percent(p.completed, p.total)}%` }} />
                                </span>
                                <span className="project-progress-value">{p.completed}/{p.total}</span>
                            </li>
                        ))}
                    </ul>
                </ChartCard>
            </div>
        </div>
    );
}

export default MyTaskInsights;
