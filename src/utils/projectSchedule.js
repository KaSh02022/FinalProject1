// Project start date rules shared by the board (and the timeline). Dates are compared as calendar days
// in the user's time zone, so "today" counts as started.

const startOfDay = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
};

// Start date stored on the project (older projects fall back to their creation date)
export const getProjectStart = (project) =>
    startOfDay(project?.startDate || project?.start_date || project?.createdAt || null);

/** true once the start day is reached; a project without a usable start date counts as started */
export function hasProjectStarted(project, now = new Date()) {
    const start = getProjectStart(project);
    const today = startOfDay(now);
    if (!start || !today) return true;
    return today >= start;
}

/**
 * Before the start day, Members (not Managers / Leaders) cannot move tasks between columns.
 * UI rule only — the backend does not check it (PUT /task/:id/move accepts the request).
 */
export const isMoveLockedForRole = ({ isManager, isLeader }, project, now = new Date()) =>
    !isManager && !isLeader && !hasProjectStarted(project, now);

export const formatDayDMY = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
