// Fixtures follow BACKEND_FRONTEND_SYNC_REPORT A1 (example produced by the real controller).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseWeeklyExpectancy, summarizeWeeklyExpectancy, getWeeklyExpectancyErrorKind } from "./weeklyExpectancy.js";
import { parseEpicBurndown } from "./epicBurndown.js";

const sample = () => ({
    success: true, currentProjectWeek: 3, maxProjectWeek: 5,
    weeks: [
        { week: "Week 1", weekNumber: 1, expectancy: 13, realProgress: 5 },
        { week: "Week 2", weekNumber: 2, expectancy: 18, realProgress: 5 },
        { week: "Week 3", weekNumber: 3, expectancy: 18, realProgress: 13 },
        { week: "Week 4", weekNumber: 4, expectancy: 18, realProgress: null },
        { week: "Week 5", weekNumber: 5, expectancy: 26, realProgress: null },
    ],
});
const httpError = (status, message) => Object.assign(new Error(message), { status });

test("values and order are used exactly as returned (no Start point, dynamic week count)", () => {
    const parsed = parseWeeklyExpectancy(sample());
    assert.deepEqual(parsed.weeks, sample().weeks);
    assert.equal(parsed.weeks.length, parsed.maxProjectWeek);
    assert.deepEqual(parsed.weeks.map((w) => w.week), ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]);
});

test("realProgress null stays null (future weeks are a gap, not 0)", () => {
    const parsed = parseWeeklyExpectancy(sample());
    assert.deepEqual(parsed.weeks.map((w) => w.realProgress), [5, 5, 13, null, null]);
});

test("weeks: [] (no tasks / unknown project) is a valid empty answer", () => {
    assert.deepEqual(parseWeeklyExpectancy({ success: true, weeks: [] }), { currentProjectWeek: null, maxProjectWeek: null, weeks: [] });
    assert.equal(summarizeWeeklyExpectancy(parseWeeklyExpectancy({ success: true, weeks: [] })), null);
});

test("currentProjectWeek may be past maxProjectWeek", () => {
    const body = { success: true, currentProjectWeek: 7, maxProjectWeek: 2, weeks: [
        { week: "Week 1", weekNumber: 1, expectancy: 3, realProgress: 3 },
        { week: "Week 2", weekNumber: 2, expectancy: 8, realProgress: 5 },
    ] };
    const s = summarizeWeeklyExpectancy(parseWeeklyExpectancy(body));
    assert.equal(s.pastPlan, true);
    assert.equal(s.nowEntry, null);
    assert.equal(s.planEntry.week, "Week 2");
    assert.equal(s.latestReal.realProgress, 5);
});

test("summary reads the current week and the latest real value", () => {
    const s = summarizeWeeklyExpectancy(parseWeeklyExpectancy(sample()));
    assert.equal(s.nowEntry.week, "Week 3");
    assert.equal(s.planEntry.expectancy, 18);
    assert.equal(s.latestReal.realProgress, 13);
});

test("the two charts never accept each other's response", () => {
    const burndown = { totalPoints: 21, currentWeek: 3, weeks: [{ week: "Start", planned: 21, actual: 21 }] };
    assert.equal(parseWeeklyExpectancy(burndown), null);
    assert.equal(parseEpicBurndown(sample()), null);
    const src = readFileSync(new URL("./weeklyExpectancy.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
    assert.equal(/epicBurndown|epic-burndown/.test(src), false);
});

test("malformed bodies are rejected", () => {
    assert.equal(parseWeeklyExpectancy(null), null);
    assert.equal(parseWeeklyExpectancy({ success: false, weeks: [] }), null);
    assert.equal(parseWeeklyExpectancy({ ...sample(), currentProjectWeek: undefined }), null);
    const bad = sample(); bad.weeks[3].realProgress = "0";
    assert.equal(parseWeeklyExpectancy(bad), null);
});

test("errors: 400 invalid id, auth, network, server", () => {
    assert.equal(getWeeklyExpectancyErrorKind(httpError(400, "Invalid Project ID")), "invalid-project");
    assert.equal(getWeeklyExpectancyErrorKind(httpError(401, "token is not valid or expired")), "auth");
    assert.equal(getWeeklyExpectancyErrorKind(httpError(500, "Server error")), "server");
    assert.equal(getWeeklyExpectancyErrorKind(new TypeError("Failed to fetch")), "network");
});

test("request uses GET /task/project/:projectId/weekly-expectancy with the shared auth headers", () => {
    const api = readFileSync(new URL("../../api.jsx", import.meta.url), "utf8");
    const fn = api.slice(api.indexOf("export const fetchWeeklyExpectancy"));
    const body = fn.slice(0, fn.indexOf("};") + 2);
    assert.match(body, /\/task\/project\/\$\{encodeURIComponent\(projectId\)\}\/weekly-expectancy/);
    assert.match(body, /headers: getAuthHeaders\(\)/);
});
