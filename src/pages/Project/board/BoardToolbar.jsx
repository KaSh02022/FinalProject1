import { CircleCheck, ChevronDown, Gauge, ListTodo, Plus, Search, X } from "lucide-react";

/**
 * Board toolbar: search + week filter (the two filters the board already had), active-filter chips
 * and the "Add task" action. Purely presentational — the page owns the filter state and logic.
 * `summary` ({ tasks, points, completed }) is the project context shown next to the action.
 */
function BoardToolbar({
    summary,
    searchQuery,
    onSearchChange,
    selectedWeek,
    onWeekChange,
    totalWeeks,
    canCreateTask,
    onCreateTask,
}) {
    const trimmedQuery = searchQuery.trim();
    const weekActive = selectedWeek !== "all";
    const hasFilters = Boolean(trimmedQuery) || weekActive;

    return (
        <div className="board-toolbar">
            <div className="board-toolbar-row">
                <div className="board-toolbar-filters">
                    <div className="input-icon-wrap board-search" role="search">
                        <Search className="icon icon-sm" aria-hidden="true" />
                        <input
                            className="input"
                            type="search"
                            placeholder="Search tasks…"
                            aria-label="Search tasks by name"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>

                    <div className="select-wrap board-week">
                        <select
                            className={`select${weekActive ? " is-active" : ""}`}
                            aria-label="Filter by week"
                            value={selectedWeek}
                            onChange={(e) => onWeekChange(e.target.value)}
                        >
                            <option value="all">All weeks</option>
                            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
                                <option key={w} value={w}>Week {w}</option>
                            ))}
                        </select>
                        <ChevronDown className="icon icon-sm" aria-hidden="true" />
                    </div>
                </div>

                {summary && (
                    <ul className="board-summary" aria-label="Board summary">
                        <li title="Tasks on the board"><ListTodo className="icon icon-xs" aria-hidden="true" />{summary.tasks} {summary.tasks === 1 ? "task" : "tasks"}</li>
                        <li title="Story points on the board"><Gauge className="icon icon-xs" aria-hidden="true" />{summary.points} pts</li>
                        <li title="Completed tasks"><CircleCheck className="icon icon-xs" aria-hidden="true" />{summary.completed} completed</li>
                    </ul>
                )}

                {canCreateTask && (
                    <button type="button" className="btn btn-primary board-add-btn" onClick={onCreateTask}>
                        <Plus className="icon icon-sm" aria-hidden="true" />
                        Add task
                    </button>
                )}
            </div>

            {hasFilters && (
                <div className="filter-chips" aria-label="Active filters">
                    {trimmedQuery && (
                        <span className="filter-chip">
                            <span className="filter-chip-label">Search: “{trimmedQuery}”</span>
                            <button type="button" onClick={() => onSearchChange("")} aria-label="Clear search filter">
                                <X className="icon icon-xs" aria-hidden="true" />
                            </button>
                        </span>
                    )}
                    {weekActive && (
                        <span className="filter-chip">
                            <span className="filter-chip-label">Week {selectedWeek}</span>
                            <button type="button" onClick={() => onWeekChange("all")} aria-label="Clear week filter">
                                <X className="icon icon-xs" aria-hidden="true" />
                            </button>
                        </span>
                    )}
                    {trimmedQuery && weekActive && (
                        <button
                            type="button"
                            className="filter-clear-link"
                            onClick={() => {
                                onSearchChange("");
                                onWeekChange("all");
                            }}
                        >
                            Clear all
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default BoardToolbar;
