// Plan vs. Real Progress — GET /task/project/:projectId/weekly-expectancy (BACKEND_FRONTEND_SYNC_REPORT A1).
// A cumulative burn-UP chart, NOT the Epic Burndown: different wrapper, week count and completion rule, so it
// has its own parser. Values are shown exactly as returned:
//   { success: true, currentProjectWeek, maxProjectWeek, weeks: [{ week, weekNumber, expectancy, realProgress }] }
//   { success: true, weeks: [] }   ← project without tasks (or an unknown project id)
// realProgress is null for weeks that have not happened yet and stays null (a gap, never 0).

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

const isWeek = (item) =>
    item !== null &&
    typeof item === "object" &&
    typeof item.week === "string" &&
    isNumber(item.weekNumber) &&
    isNumber(item.expectancy) &&
    (item.realProgress === null || isNumber(item.realProgress));

/** Response body → { currentProjectWeek, maxProjectWeek, weeks } (backend order) or null for an unknown shape */
export function parseWeeklyExpectancy(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    if (body.success !== true || !Array.isArray(body.weeks)) return null;
    if (body.weeks.length === 0) return { currentProjectWeek: null, maxProjectWeek: null, weeks: [] };
    if (!body.weeks.every(isWeek)) return null;
    // both numbers come with a non-empty weeks array; currentProjectWeek may be larger than maxProjectWeek
    if (!isNumber(body.currentProjectWeek) || !isNumber(body.maxProjectWeek)) return null;
    return {
        currentProjectWeek: body.currentProjectWeek,
        maxProjectWeek: body.maxProjectWeek,
        weeks: body.weeks.map(({ week, weekNumber, expectancy, realProgress }) => ({ week, weekNumber, expectancy, realProgress })),
    };
}

/**
 * Values to summarise the chart (read from the backend weeks, nothing recalculated):
 *  - nowEntry: the week of currentProjectWeek, or the last week when the project ran past the plan
 *  - latestReal: the last week that has realProgress
 */
export function summarizeWeeklyExpectancy(data) {
    if (!data || data.weeks.length === 0) return null;
    const nowEntry = data.weeks.find((w) => w.weekNumber === data.currentProjectWeek) || null;
    const pastPlan = data.currentProjectWeek > data.maxProjectWeek;
    const reached = data.weeks.filter((w) => w.realProgress !== null);
    return {
        nowEntry,
        pastPlan,
        planEntry: nowEntry || (pastPlan ? data.weeks[data.weeks.length - 1] : null),
        latestReal: reached.length > 0 ? reached[reached.length - 1] : null,
    };
}

// API error → UI state. The endpoint has no 404 (an unknown project answers 200 with weeks: []).
export function getWeeklyExpectancyErrorKind(error) {
    const status = error?.status;
    if (status === 401 || status === 403) return "auth";
    if (status === 404 && error.message === "User not found") return "auth";
    if (status === 400) return "invalid-project";
    if (!status) return error?.message === "Account banned" ? "auth" : "network";
    return "server";
}
