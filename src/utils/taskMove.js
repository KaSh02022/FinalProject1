// Moving a task between / within columns — PUT /task/:id/move { sourceColumnId, destColumnId, destinationIndex }.
// The backend owns completion: moving into a "Done" column sets status "completed" + completedAt/completedDate,
// moving out resets them (BACKEND_FRONTEND_SYNC_REPORT B2). Changing a task's column with PUT /task/:id {columnId}
// does NOT update status, so every column change in the UI goes through this endpoint.
//
// These helpers are pure so the board, the list and My Tasks apply exactly what the backend does.

export const idOf = (value) => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "object") return String(value._id || value.id || "");
    return String(value);
};

// Column.taskOrderIds as plain id strings
export const orderOf = (column) =>
    (Array.isArray(column?.taskOrderIds) ? column.taskOrderIds : []).map(idOf).filter(Boolean);

/**
 * Index for `destinationIndex`. The backend removes the task from the destination order and then inserts it at
 * `destinationIndex` (clamped to 0..length), so the index is counted in the destination order WITHOUT the task.
 *  - beforeTaskId: put the task right before that task (drag & drop onto a filtered list)
 *  - otherwise:    put it at the end of the column
 */
export function getDestinationIndex(destColumn, taskId, beforeTaskId) {
    const order = orderOf(destColumn).filter((id) => id !== String(taskId));
    if (beforeTaskId) {
        const at = order.indexOf(String(beforeTaskId));
        if (at !== -1) return at;
    }
    return order.length;
}

/**
 * Same taskOrderIds change the backend makes: drop the task from the source column (and from the
 * destination), then insert it at destinationIndex. Returns a new columns array; other columns untouched.
 * onlyIfMissing: leave the destination as is when it already lists the task (e.g. a created task seen twice).
 */
export function applyMoveToColumns(columns, taskId, sourceColumnId, destColumnId, destinationIndex, onlyIfMissing = false) {
    const id = String(taskId);
    const src = idOf(sourceColumnId);
    const dest = idOf(destColumnId);
    return (columns || []).map((column) => {
        const colId = idOf(column);
        if (colId !== src && colId !== dest) return column;
        if (onlyIfMissing && colId === dest && orderOf(column).includes(id)) return column;
        const order = orderOf(column).filter((x) => x !== id);
        if (colId === dest) {
            const at = Math.max(0, Math.min(Number(destinationIndex) || 0, order.length));
            order.splice(at, 0, id);
        }
        return { ...column, taskOrderIds: order };
    });
}

// Fields the backend changes on a move. Everything else (populated assignees, title...) is kept from the
// task already in state: response.task / socket payload.task are NOT populated (assignees are plain ids).
const MOVE_FIELDS = ["status", "completedAt", "completedDate", "updatedAt"];

/**
 * Merge the backend's moved task into the task in state.
 * `serverTask` may be missing (older backend: { message, taskId } only) — then only the column changes.
 */
export function mergeMovedTask(task, serverTask, destColumnId) {
    const next = { ...task, columnId: idOf(destColumnId) || idOf(task?.columnId) };
    if (serverTask && typeof serverTask === "object") {
        MOVE_FIELDS.forEach((field) => {
            if (field in serverTask) next[field] = serverTask[field] ?? null;
        });
        if (serverTask.columnId) next.columnId = idOf(serverTask.columnId);
    }
    return next;
}

// Body for PUT /task/:id/move — exactly the documented contract, nothing else
export const buildMovePayload = (sourceColumnId, destColumnId, destinationIndex) => ({
    sourceColumnId: idOf(sourceColumnId) || null,
    destColumnId: idOf(destColumnId),
    destinationIndex: Math.max(0, Number(destinationIndex) || 0),
});

// "Done" as shown by the UI: the backend's task.status (contract §7) — never guessed from the column name
export const isTaskCompleted = (task) => task?.status === "completed";
