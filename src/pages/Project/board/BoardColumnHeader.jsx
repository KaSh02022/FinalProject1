import { Plus } from "lucide-react";
import { getColumnStatus } from "./columnStatus.js";

function BoardColumnHeader({ title, count, canCreateTask, onAddTask }) {
    const { kind, Icon } = getColumnStatus(title);
    return (
        <div className="board-column-header">
            <Icon className={`icon icon-md board-column-status status-${kind}`} aria-hidden="true" />
            <h2 className="board-column-title" title={title}>{title}</h2>
            <span className="board-column-count" aria-label={`${count} ${count === 1 ? "task" : "tasks"}`}>{count}</span>
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
