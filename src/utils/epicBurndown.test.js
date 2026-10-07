// Run with `npm test` (Node's built-in test runner — no extra dependency).
// Fixtures are the documented backend responses (BACKEND_FRONTEND_CONTRACT §5), not app data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEpicBurndown, findCurrentWeek, getBurndownErrorKind } from "./epicBurndown.js";

const LABELS = ["Start", "Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"];

// GET /api/task/project/:projectId/epic-burndown — contract §5.1 example
const sample = () => ({
    totalPoints: 21,
    currentWeek: 3,
    weeks: [
        { week: "Start", planned: 21, actual: 21 },
        { week: "Week 1", planned: 18, actual: 15 },
        { week: "Week 2", planned: 14, actual: 11 },
        { week: "Week 3", planned: 11, actual: 5 },
        { week: "Week 4", planned: 7, actual: null },
        { week: "Week 5", planned: 4, actual: null },
        { week: "Week 6", planned: 0, actual: null },
    ],
});

const httpError = (status, message) => Object.assign(new Error(message), { status });

test("CASE 1: a 7-week response is used as returned (values untouched)", () => {
    const parsed = parseEpicBurndown(sample());
    assert.ok(parsed);
    assert.equal(parsed.weeks.length, 7);
    assert.equal(parsed.totalPoints, 21);
    assert.equal(parsed.currentWeek, 3);
    assert.deepEqual(parsed.weeks, sample().weeks);
});

test("CASE 2: actual null stays null (not 0, not previous value, not planned)", () => {
    const parsed = parseEpicBurndown(sample());
    const future = parsed.weeks.slice(4);
    for (const w of future) {
        assert.equal(w.actual, null);
        assert.notEqual(w.actual, 0);
    }
    // planned is still the backend number in those weeks
    assert.deepEqual(future.map((w) => w.planned), [7, 4, 0]);
});

test("CASE 3: totalPoints 0 is a valid response (the UI shows the empty state)", () => {
    const body = {
        totalPoints: 0,
        currentWeek: 1,
        weeks: LABELS.map((week, i) => ({ week, planned: 0, actual: i <= 1 ? 0 : null })),
    };
    const parsed = parseEpicBurndown(body);
    assert.ok(parsed);
    assert.equal(parsed.totalPoints, 0);
    assert.equal(parsed.weeks[2].actual, null);
});

test("CASE 4: 404 Project not found / 400 Invalid Project ID → not-found state", () => {
    assert.equal(getBurndownErrorKind(httpError(404, "Project not found")), "not-found");
    assert.equal(getBurndownErrorKind(httpError(400, "Invalid Project ID")), "not-found");
});

test("CASE 5: 401 / 403 / 404 User not found / suspended → auth state", () => {
    assert.equal(getBurndownErrorKind(httpError(401, "token is not valid or expired")), "auth");
    assert.equal(getBurndownErrorKind(httpError(401, "not found token")), "auth");
    assert.equal(getBurndownErrorKind(httpError(403, "ACCOUNT_SUSPENDED")), "auth");
    assert.equal(getBurndownErrorKind(httpError(404, "User not found")), "auth");
    // api.jsx throws this (without status) after its suspended-account redirect
    assert.equal(getBurndownErrorKind(new Error("Account banned")), "auth");
});

test("CASE 6: 500 → server error, fetch failure → network error", () => {
    assert.equal(getBurndownErrorKind(httpError(500, "Internal Server Error")), "server");
    assert.equal(getBurndownErrorKind(new TypeError("Failed to fetch")), "network");
});

test("CASE 7: X-axis labels keep the backend order Start → Week 6", () => {
    const parsed = parseEpicBurndown(sample());
    assert.deepEqual(parsed.weeks.map((w) => w.week), LABELS);
    // order comes from the response, not from sorting
    const reversed = { ...sample(), weeks: [...sample().weeks].reverse() };
    assert.deepEqual(parseEpicBurndown(reversed).weeks.map((w) => w.week), [...LABELS].reverse());
});

test("CASE 8: no success/data wrapper is read", () => {
    // a wrapped body is NOT the burndown contract → rejected, never unwrapped
    assert.equal(parseEpicBurndown({ success: true, data: sample() }), null);
    // extra fields on the real body are ignored, not required
    const parsed = parseEpicBurndown({ ...sample(), success: false });
    assert.equal(parsed.totalPoints, 21);
    assert.equal("success" in parsed, false);
    assert.equal("data" in parsed, false);
});

test("CASE 8b: malformed bodies are rejected instead of guessed", () => {
    assert.equal(parseEpicBurndown(null), null);
    assert.equal(parseEpicBurndown([]), null);
    assert.equal(parseEpicBurndown({ totalPoints: "21", currentWeek: 3, weeks: sample().weeks }), null);
    assert.equal(parseEpicBurndown({ totalPoints: 21, currentWeek: 3, weeks: [] }), null);
    const missingActual = sample();
    delete missingActual.weeks[5].actual;
    assert.equal(parseEpicBurndown(missingActual), null);
});

test("CASE 9: Weekly Points is not accepted as burndown data", () => {
    // GET /member/project/:id/weekly-points shape (contract §6)
    const weeklyPoints = { success: true, week: 2, data: [{ _id: "m1", weeklyPoint: 8 }] };
    assert.equal(parseEpicBurndown(weeklyPoints), null);
    // and the burndown code paths never reference that endpoint
    for (const file of ["./epicBurndown.js", "../pages/Dashboard/EpicBurndown/EpicBurndown.jsx"]) {
        const src = readFileSync(new URL(file, import.meta.url), "utf8");
        assert.equal(/weekly-?points|weeklyPoint/i.test(src.replace(/\/\/.*$/gm, "")), false, file);
    }
});

test("burndown request uses GET /task/project/:projectId/epic-burndown with the shared auth headers", () => {
    const api = readFileSync(new URL("../../api.jsx", import.meta.url), "utf8");
    const fn = api.slice(api.indexOf("export const fetchEpicBurndown"));
    const body = fn.slice(0, fn.indexOf("};") + 2);
    assert.match(body, /\/task\/project\/\$\{encodeURIComponent\(projectId\)\}\/epic-burndown/);
    assert.match(body, /headers: getAuthHeaders\(\)/);
    assert.match(body, /return handleResponse\(res\)/);
});

test("findCurrentWeek reads the backend currentWeek entry", () => {
    const parsed = parseEpicBurndown(sample());
    assert.deepEqual(findCurrentWeek(parsed), { week: "Week 3", planned: 11, actual: 5 });
    assert.equal(findCurrentWeek(null), null);
});
