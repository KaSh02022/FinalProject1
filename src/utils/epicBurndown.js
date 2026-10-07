// Epic Burndown — GET /task/project/:projectId/epic-burndown.
// The backend returns the chart directly: { totalPoints, currentWeek, weeks: [{ week, planned, actual }] }
// (no `success` / `data` wrapper). The frontend never recalculates planned/actual or the weeks: it only
// checks the shape and passes the backend values through unchanged — `actual: null` (week not reached yet)
// stays null so the chart leaves a gap. Not to be confused with Weekly Points (/member/.../weekly-points).

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

const isWeek = (item) =>
    item !== null &&
    typeof item === "object" &&
    typeof item.week === "string" &&
    isNumber(item.planned) &&
    (item.actual === null || isNumber(item.actual));

// Response body → { totalPoints, currentWeek, weeks } in backend order, or null when the body
// does not have the documented shape (then the UI shows an error instead of guessing).
export function parseEpicBurndown(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const { totalPoints, currentWeek, weeks } = body;
    if (!isNumber(totalPoints) || !isNumber(currentWeek)) return null;
    if (!Array.isArray(weeks) || weeks.length === 0 || !weeks.every(isWeek)) return null;
    return {
        totalPoints,
        currentWeek,
        weeks: weeks.map(({ week, planned, actual }) => ({ week, planned, actual })),
    };
}

// The weeks[] entry of the backend's currentWeek (labels are "Week 1".."Week 6"), or null
export function findCurrentWeek(burndown) {
    if (!burndown) return null;
    return burndown.weeks.find((w) => w.week === `Week ${burndown.currentWeek}`) || null;
}

// Error thrown by api.jsx (`error.status` = HTTP status; fetch network failures have none) → UI state.
//  "auth"      401 / 403 (api.jsx already signs out + redirects) or 404 "User not found" from the token check
//  "not-found" 404 { success:false, message:"Project not found" } or 400 "Invalid Project ID"
//  "network"   no response at all (backend down / offline)
//  "server"    500 and anything else
export function getBurndownErrorKind(error) {
    const status = error?.status;
    if (status === 401 || status === 403) return "auth";
    if (status === 404) return error.message === "User not found" ? "auth" : "not-found";
    if (status === 400) return "not-found";
    if (!status) {
        // api.jsx throws a status-less "Account banned" after its suspended-account redirect
        if (error?.message === "Account banned") return "auth";
        return "network";
    }
    return "server";
}
