import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTimeline, filterTimelineRows, weekOf, MAX_TIMELINE_WEEKS } from "./timeline.js";

const project = { startDate: new Date(2026, 8, 7), date: new Date(2026, 9, 25) }; // 07/09 → 25/10/2026 (7 weeks)
const now = new Date(2026, 9, 9, 12); // 09/10/2026 → week 5

test("weekOf", () => {
    assert.equal(weekOf(new Date(2026, 8, 7), new Date(2026, 8, 7)), 1);
    assert.equal(weekOf(new Date(2026, 8, 7), new Date(2026, 8, 14)), 2);
    assert.equal(weekOf(new Date(2026, 8, 7), new Date(2026, 8, 1)), 0);
});

test("buildTimeline: weeks cover the project, current week, sorted rows", () => {
    const t = buildTimeline(project, [
        { _id: "b", title: "Beta", week: 3, columnId: { title: "In Progress" } },
        { _id: "a", title: "Alpha", week: 3, status: "completed", columnId: { title: "Done" } },
        { _id: "c", title: "Gamma", week: 6, columnId: { title: "To Do" } },
    ], now);
    assert.equal(t.weeks.length, 7);
    assert.equal(t.weeks[0].start.getDate(), 7);
    assert.equal(t.weeks[6].end.getDate(), 25); // last week clipped to the end date
    assert.equal(t.currentWeek, 5);
    assert.deepEqual(t.rows.map((r) => r.id), ["a", "b", "c"]);
});

test("buildTimeline: unfinished task from a past week slips to the current week", () => {
    const t = buildTimeline(project, [
        { _id: "late", week: 2, columnId: { title: "In Progress" } },
        { _id: "done", week: 2, status: "completed" },
    ], now);
    const late = t.rows.find((r) => r.id === "late");
    const done = t.rows.find((r) => r.id === "done");
    assert.deepEqual([late.from, late.to, late.slipped], [2, 5, true]);
    assert.deepEqual([done.from, done.to, done.slipped], [2, 2, false]);
});

test("buildTimeline: tasks planned after the end date extend the grid; huge weeks are capped", () => {
    assert.equal(buildTimeline(project, [{ week: 9 }], now).weeks.length, 9);
    const capped = buildTimeline(project, [{ week: 400 }], now);
    assert.equal(capped.weeks.length, MAX_TIMELINE_WEEKS);
    assert.equal(capped.truncated, true);
    assert.equal(capped.rows[0].from, MAX_TIMELINE_WEEKS);
});

test("buildTimeline: before the start there is no current week and nothing slips", () => {
    const t = buildTimeline({ startDate: new Date(2026, 10, 1) }, [{ week: 1 }], now);
    assert.equal(t.currentWeek, null);
    assert.equal(t.rows[0].slipped, false);
});

test("filterTimelineRows", () => {
    const rows = buildTimeline(project, [
        { _id: "1", week: 1, assignees: [{ _id: "u1" }] },
        { _id: "2", week: 1, assignees: ["u2"], status: "completed" },
    ], now).rows;
    assert.deepEqual(filterTimelineRows(rows, { userId: "u2" }).map((r) => r.id), ["2"]);
    assert.deepEqual(filterTimelineRows(rows, { hideCompleted: true }).map((r) => r.id), ["1"]);
    assert.equal(filterTimelineRows(rows).length, 2);
});
