// Project Timeline (Gantt by week). Tasks have no start / end dates — only `week` (1 = the week that starts on
// project.startDate, same as the board and weekly-expectancy). So the timeline is a week grid:
// a task's bar sits in its planned week; an unfinished task whose week has passed "slips" up to this week.
import { getTaskGroup } from "./myTaskStats.js";
import { getProjectStart } from "./projectSchedule.js";

export const MAX_TIMELINE_WEEKS = 52;
const DAY = 86400000;

const startOfDay = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
};

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

/** Week number (1-based) of `date` in a project starting on `start`; 0 before the start */
export function weekOf(start, date) {
    const s = startOfDay(start);
    const d = startOfDay(date);
    if (!s || !d) return null;
    const days = Math.round((d - s) / DAY);
    return days < 0 ? 0 : Math.floor(days / 7) + 1;
}

const plannedWeek = (task) => Math.max(1, Math.floor(Number(task?.week) || 1));

/**
 * @returns {{
 *   weeks: {number, start, end}[],      // grid columns (dates are null when the project has no start date)
 *   currentWeek: number|null,           // null before the start or without a start date
 *   rows: {id, title, week, from, to, group, slipped, points, assignees}[],
 *   truncated: boolean                  // tasks planned beyond MAX_TIMELINE_WEEKS exist
 * }}
 */
export function buildTimeline(project, tasks, now = new Date()) {
    const start = getProjectStart(project);
    const end = startOfDay(project?.date || project?.dueDate || project?.endDate || null);
    const list = Array.isArray(tasks) ? tasks : [];

    const today = start ? weekOf(start, now) : null;
    const currentWeek = today && today > 0 ? today : null;
    const endWeek = start && end && end >= start ? weekOf(start, end) : 0;
    const maxTaskWeek = list.reduce((m, t) => Math.max(m, plannedWeek(t)), 0);

    const wanted = Math.max(1, endWeek, maxTaskWeek, currentWeek || 0);
    const count = Math.min(wanted, MAX_TIMELINE_WEEKS);

    const weeks = Array.from({ length: count }, (_, i) => {
        const weekStart = start ? addDays(start, i * 7) : null;
        let weekEnd = weekStart ? addDays(weekStart, 6) : null;
        if (weekEnd && end && i + 1 === endWeek && end < weekEnd) weekEnd = end;
        return { number: i + 1, start: weekStart, end: weekEnd };
    });

    const rows = list
        .map((task) => {
            const week = plannedWeek(task);
            const group = getTaskGroup(task);
            const slipped = group !== "completed" && currentWeek !== null && currentWeek > week;
            const from = Math.min(week, count);
            const to = Math.min(slipped ? currentWeek : week, count);
            return {
                id: String(task?._id || task?.id || ""),
                title: task?.title || "Untitled task",
                week,
                from,
                to,
                group,
                slipped,
                points: Number(task?.point ?? task?.points) || 0,
                assignees: Array.isArray(task?.assignees) ? task.assignees : [],
            };
        })
        .sort((a, b) => a.week - b.week || a.title.localeCompare(b.title));

    return { weeks, currentWeek: currentWeek && currentWeek <= count ? currentWeek : null, rows, truncated: wanted > MAX_TIMELINE_WEEKS };
}

/** Rows assigned to `userId` ("" = everyone); `hideCompleted` drops completed tasks */
export function filterTimelineRows(rows, { userId = "", hideCompleted = false } = {}) {
    return rows.filter((row) => {
        if (hideCompleted && row.group === "completed") return false;
        if (!userId) return true;
        return row.assignees.some((a) => String(a && typeof a === "object" ? a._id || a.id : a) === String(userId));
    });
}
