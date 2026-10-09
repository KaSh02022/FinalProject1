// "Insights" tab of My Tasks: counts over the tasks the list already loaded (GET /task/my-task).
// Completed = task.status === "completed" (contract §7, set by PUT /task/:id/move). The other groups come
// from the column the task sits in, read the same way as the board (getColumnStatus on the column title).
import { getColumnStatus } from "../pages/Project/board/columnStatus.js";
import { isTaskCompleted } from "./taskMove.js";

export const STATUS_GROUPS = [
    { key: "todo", label: "To do" },
    { key: "progress", label: "In progress" },
    { key: "review", label: "Review" },
    { key: "completed", label: "Completed" },
    { key: "other", label: "Other" },
];

const columnTitle = (task) =>
    task?.columnId && typeof task.columnId === "object" ? task.columnId.title || task.columnId.name || "" : task?.columnTitle || "";

/** Group of one task: completed / todo / progress / review / other */
export function getTaskGroup(task) {
    if (isTaskCompleted(task)) return "completed";
    if (!task?.columnId) return "todo"; // backlog: not started
    const kind = getColumnStatus(columnTitle(task)).kind;
    if (kind === "todo" || kind === "backlog") return "todo";
    if (kind === "progress" || kind === "review") return kind;
    // a "Done" column without status completed (older data) or a custom column
    return "other";
}

const pointsOf = (task) => Number(task?.point ?? task?.points) || 0;

const dayDiff = (due, today) => Math.ceil((due.getTime() - today.getTime()) / 86400000);

/**
 * @param tasks       tasks shown by My Tasks (already filtered by the search box)
 * @param getDueDate  task => Date | string | null — the same due date the list uses
 * @param now         Date
 */
export function computeMyTaskStats(tasks, getDueDate, now = new Date()) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const groups = Object.fromEntries(STATUS_GROUPS.map((g) => [g.key, { ...g, count: 0, points: 0 }]));
    const projects = new Map();
    let overdue = 0;
    let dueSoon = 0;
    let points = 0;

    for (const task of tasks || []) {
        const group = getTaskGroup(task);
        const p = pointsOf(task);
        groups[group].count += 1;
        groups[group].points += p;
        points += p;

        if (group !== "completed") {
            const raw = getDueDate ? getDueDate(task) : null;
            const due = raw ? new Date(raw) : null;
            if (due && !Number.isNaN(due.getTime())) {
                due.setHours(0, 0, 0, 0);
                const diff = dayDiff(due, today);
                if (diff < 0) overdue += 1;
                else if (diff <= 2) dueSoon += 1;
            }
        }

        const project = task?.projectId && typeof task.projectId === "object" ? task.projectId : null;
        const projectId = String(project?._id || project?.id || task?.projectId || "");
        if (projectId) {
            const entry = projects.get(projectId) || { id: projectId, name: project?.name || "", color: project?.color || "", total: 0, completed: 0 };
            entry.total += 1;
            if (group === "completed") entry.completed += 1;
            projects.set(projectId, entry);
        }
    }

    const total = (tasks || []).length;
    return {
        total,
        points,
        completed: groups.completed.count,
        completionRate: total > 0 ? Math.round((groups.completed.count / total) * 100) : null,
        overdue,
        dueSoon,
        // "Other" is only listed when something is in it
        groups: STATUS_GROUPS.map((g) => groups[g.key]).filter((g) => g.key !== "other" || g.count > 0),
        projects: [...projects.values()].sort((a, b) => b.total - a.total),
    };
}
