// Dashboard "Portfolio health": numbers derived from data the backend returns, nothing estimated.
//  - completion = task.status === "completed" (contract §7), never the column position
//  - budget spent = completed story points x project.costPerPoint; without a cost per point there is NO figure
//  - plan adherence = real / planned points of the current week (weekly-expectancy), only where a plan exists
import { isTaskCompleted } from "./taskMove.js";
import { summarizeWeeklyExpectancy } from "./weeklyExpectancy.js";

const pointsOf = (task) => Number(task?.point ?? task?.points) || 0;
const finite = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);
export const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : null);

/** Progress of one project from its tasks */
export function projectProgress(project, tasks) {
    const list = Array.isArray(tasks) ? tasks : [];
    let completed = 0;
    let points = 0;
    let completedPoints = 0;
    for (const task of list) {
        const p = pointsOf(task);
        points += p;
        if (isTaskCompleted(task)) {
            completed += 1;
            completedPoints += p;
        }
    }
    return {
        id: String(project?._id || project?.id || ""),
        name: project?.name || "Untitled project",
        color: project?.color || "",
        total: list.length,
        completed,
        percent: pct(completed, list.length),
        points,
        completedPoints,
    };
}

// <80% on track, 80–100% watch, >100% over budget
export const budgetTone = (percent) => (percent === null ? "none" : percent > 100 ? "over" : percent >= 80 ? "watch" : "ok");

/**
 * Budget burn of one project. null when the project has no budget.
 * spent / percent are null when no cost per point is set (shown as "not set", never guessed).
 */
export function budgetUsage(project, progress) {
    const budget = finite(project?.budget);
    if (!budget || budget <= 0) return null;
    const rate = finite(project?.costPerPoint);
    const hasRate = rate !== null && rate > 0;
    const spent = hasRate ? progress.completedPoints * rate : null;
    const percent = hasRate ? Math.round((spent / budget) * 100) : null;
    return {
        id: progress.id,
        name: progress.name,
        color: progress.color,
        budget,
        costPerPoint: hasRate ? rate : null,
        spent,
        remaining: hasRate ? budget - spent : null,
        percent,
        tone: budgetTone(percent),
        // value of all planned points at this rate: tells whether the plan itself fits the budget
        plannedCost: hasRate ? progress.points * rate : null,
    };
}

const userIdOf = (user) => (user && typeof user === "object" ? String(user._id || user.id || "") : String(user || ""));

/**
 * Workload per person over every project's tasks. Only populated assignees have a name
 * (GET /task/project/:id populates username / email); plain ids are counted under "Unknown user".
 */
export function teamWorkload(taskLists) {
    const people = new Map();
    for (const tasks of taskLists || []) {
        for (const task of tasks || []) {
            const done = isTaskCompleted(task);
            const p = pointsOf(task);
            for (const assignee of task?.assignees || []) {
                const id = userIdOf(assignee);
                if (!id) continue;
                const named = assignee && typeof assignee === "object";
                const entry = people.get(id) || {
                    id,
                    name: (named && (assignee.username || assignee.name)) || "Unknown user",
                    email: (named && assignee.email) || "",
                    active: 0,
                    completed: 0,
                    activePoints: 0,
                };
                if (done) entry.completed += 1;
                else {
                    entry.active += 1;
                    entry.activePoints += p;
                }
                people.set(id, entry);
            }
        }
    }
    return [...people.values()]
        .map((e) => ({ ...e, total: e.active + e.completed }))
        .sort((a, b) => b.activePoints - a.activePoints || b.active - a.active || a.name.localeCompare(b.name));
}

/**
 * Plan adherence of one project from its parsed weekly-expectancy (parseWeeklyExpectancy):
 * latest real progress / planned points of the current week (or of the last week once past the plan), max 100.
 * null when it cannot be measured (no weeks, no plan yet).
 */
export function planAdherence(parsed) {
    const summary = summarizeWeeklyExpectancy(parsed);
    if (!summary || !summary.planEntry) return null;
    const plan = summary.planEntry.expectancy;
    if (!(plan > 0)) return null;
    const real = summary.latestReal ? summary.latestReal.realProgress : 0;
    return Math.min(100, Math.round((real / plan) * 100));
}

/** Average adherence over the projects where it could be measured */
export function averageAdherence(values) {
    const measured = (values || []).filter((v) => typeof v === "number");
    if (measured.length === 0) return { average: null, measured: 0 };
    return { average: Math.round(measured.reduce((s, v) => s + v, 0) / measured.length), measured: measured.length };
}
