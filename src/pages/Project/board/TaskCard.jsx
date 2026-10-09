import { CalendarDays, CircleAlert, CircleCheck, Clock, Gauge, ListChecks, X } from "lucide-react";
import { avatarToneClass } from "../../../utils/avatar.js";

const MAX_AVATARS = 3;

// Only abnormal deadline states get a visual signal ("On Track" shows nothing — DEC-002)
const DEADLINE_SIGNAL = {
    Overdue: { className: "is-overdue", Icon: CircleAlert, tooltip: "The project due date has passed" },
    Expiring: { className: "is-expiring", Icon: Clock, tooltip: "This week ends soon" },
};

/**
 * Kanban task card — presentation only. The parent (ProjectBoard) owns the Draggable, permissions,
 * week/deadline calculation, assignee lookup and every handler; this component only lays them out.
 *
 * @param {object}   task            task as loaded (title/name, description, priority, checklist)
 * @param {Function} dragRef         Draggable `provided.innerRef`            ┐
 * @param {object}   draggableProps  Draggable `provided.draggableProps` (+style) │ applied as-is to the root —
 * @param {object}   dragHandleProps Draggable `provided.dragHandleProps` (null    │ the whole card is the drag handle
 *                                   when dragging is disabled)                  ┘
 * @param {boolean}  isDragging      Draggable `snapshot.isDragging`
 * @param {boolean}  canDrag         whether the current user may drag this task
 * @param {number}   week            display week (calculated by the parent)
 * @param {number}   points          story points
 * @param {string}   deadlineStatus  'Overdue' | 'Expiring' | 'On Track' (calculated by the parent)
 * @param {Array}    assignees       [{ id, name, initials }]
 * @param {Function} onOpen          open the task drawer
 * @param {Function} [onNotAccept]   leader/manager "Not accept" action; omit to hide the button
 *
 * "Completed" comes from the backend task.status (set by PUT /task/:id/move), never from the column name.
 */
function TaskCard({ task, dragRef, draggableProps, dragHandleProps, isDragging, canDrag, week, points, deadlineStatus, assignees, onOpen, onNotAccept }) {
    const title = task.title || task.name;
    const priority = task.priority || "Medium";
    const description = (task.description || "").trim();
    const checklist = Array.isArray(task.checklist) ? task.checklist : [];
    const checklistDone = checklist.filter((item) => item.completed).length;
    const completed = task.status === "completed";
    // a finished task is not late: no deadline warning on it
    const signal = completed ? undefined : DEADLINE_SIGNAL[deadlineStatus];
    const shownAssignees = assignees.slice(0, MAX_AVATARS);
    const hiddenAssignees = assignees.length - shownAssignees.length;

    // Enter always opens; Space opens only when dnd does not own it (locked card — Space lifts a draggable card)
    const handleKeyDown = (e) => {
        if (e.target !== e.currentTarget) return; // keys on inner buttons are theirs
        if (e.key === "Enter" || (!canDrag && e.key === " ")) {
            e.preventDefault();
            onOpen();
        }
    };

    const accessibleName = [
        title,
        completed && "Completed",
        `Priority ${priority}`,
        `Week ${week}`,
        `${points} points`,
        checklist.length > 0 && `Checklist ${checklistDone} of ${checklist.length}`,
        signal && deadlineStatus,
    ].filter(Boolean).join(". ");

    const classes = ["task-card", canDrag ? "is-draggable" : "is-locked"];
    if (isDragging) classes.push("is-dragging");
    if (completed) classes.push("is-completed");

    return (
        <div
            className={classes.join(" ")}
            ref={dragRef}
            {...draggableProps}
            {...dragHandleProps}
            // a locked card has no drag handle props, so it needs its own keyboard semantics
            role={dragHandleProps ? dragHandleProps.role : "button"}
            tabIndex={dragHandleProps ? dragHandleProps.tabIndex : 0}
            aria-label={accessibleName}
            onClick={onOpen}
            onKeyDown={handleKeyDown}
            style={draggableProps.style}
        >
            <div className="task-card-head">
                <span className={`priority-tag priority-${priority.toLowerCase()}`}>{priority}</span>
                {completed && (
                    <span className="task-card-done" title="Completed">
                        <CircleCheck className="icon icon-xs" aria-hidden="true" />
                        Completed
                    </span>
                )}
            </div>

            <h3 className="task-card-title">{title}</h3>
            {description && <p className="task-card-desc">{description}</p>}

            <ul className="task-card-meta" aria-hidden="true">
                <li title="Week">
                    <CalendarDays className="icon icon-xs" />W{week}
                </li>
                <li title="Story points">
                    <Gauge className="icon icon-xs" />{points} pts
                </li>
                {checklist.length > 0 && (
                    <li
                        title="Checklist"
                        className={checklistDone === checklist.length ? "is-complete" : undefined}
                    >
                        <ListChecks className="icon icon-xs" />{checklistDone}/{checklist.length}
                    </li>
                )}
            </ul>

            {(signal || assignees.length > 0 || onNotAccept) && (
                <div className="task-card-footer">
                    {signal ? (
                        <span className={`task-card-signal ${signal.className}`} title={signal.tooltip} aria-hidden="true">
                            <signal.Icon className="icon icon-xs" />
                            {deadlineStatus}
                        </span>
                    ) : (
                        <span />
                    )}

                    <div className="task-card-end">
                        {assignees.length > 0 && (
                            <div className="avatar-group" aria-label={`Assignees: ${assignees.map((a) => a.name).join(", ")}`}>
                                {shownAssignees.map((a) => (
                                    <span
                                        key={a.id}
                                        className={`avatar avatar-xs ${avatarToneClass(a.id)}`}
                                        title={a.name}
                                    >
                                        {a.initials}
                                    </span>
                                ))}
                                {hiddenAssignees > 0 && (
                                    <span
                                        className="avatar-overflow avatar-xs"
                                        title={assignees.slice(MAX_AVATARS).map((a) => a.name).join(", ")}
                                    >
                                        +{hiddenAssignees}
                                    </span>
                                )}
                            </div>
                        )}

                        {onNotAccept && (
                            <button
                                type="button"
                                className="icon-btn icon-btn-sm task-card-reject"
                                onClick={onNotAccept}
                                aria-label={`Not accept task: ${title}`}
                                data-tooltip="Not accept"
                            >
                                <X className="icon icon-sm" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TaskCard;
