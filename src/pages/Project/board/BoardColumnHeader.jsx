import { Plus } from "lucide-react";
import { getColumnStatus } from "./columnStatus.js";

/**
 * Column header: status icon, name, task count and the column's story points (sum of the points of the
 * cards shown — display only, no backend value is derived from it).
 */
function BoardColumnHeader({ title, count, points, canCreateTask, onAddTask }) {
    const { kind, Icon } = getColumnStatus(title);
    return (
        <div className="board-column-header">
            <Icon className={`icon icon-md board-column-status status-${kind}`} aria-hidden="true" />
            <h2 className="board-column-title" title={title}>{title}</h2>
            <span className="board-column-count" aria-label={`${count} ${count === 1 ? "task" : "tasks"}`}>{count}</span>
            {typeof points === "number" && (
                <span className="board-column-points" title="Story points in this column" aria-label={`${points} story points`}>
                    {points} pts
                </span>
            )}
            {canCreateTask && (
                <button
                    type="button"
                    className="icon-btn icon-btn-sm board-column-add"
                    onClick={onAddTask}
                    aria-label={`Add task to ${title}`}
                    title={`Add task to ${title}`}
                >
                    <Plus className="icon icon-sm" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}

export default BoardColumnHeader;
