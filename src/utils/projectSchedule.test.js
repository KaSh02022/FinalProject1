import { test } from "node:test";
import assert from "node:assert/strict";
import { hasProjectStarted, isMoveLockedForRole, getProjectStart, formatDayDMY } from "./projectSchedule.js";

const now = new Date(2026, 9, 9, 15, 30); // 09/10/2026 afternoon, local time

test("hasProjectStarted: start day itself counts as started", () => {
    assert.equal(hasProjectStarted({ startDate: new Date(2026, 9, 9, 23, 0) }, now), true);
});

test("hasProjectStarted: future start", () => {
    assert.equal(hasProjectStarted({ startDate: new Date(2026, 9, 10) }, now), false);
});

test("hasProjectStarted: missing or invalid start date counts as started", () => {
    assert.equal(hasProjectStarted({}, now), true);
    assert.equal(hasProjectStarted({ startDate: "not a date" }, now), true);
    assert.equal(hasProjectStarted(null, now), true);
});

test("getProjectStart falls back to createdAt", () => {
    assert.equal(getProjectStart({ createdAt: "2026-10-01T10:00:00" }).getDate(), 1);
});

test("isMoveLockedForRole: only members before the start", () => {
    const future = { startDate: new Date(2026, 9, 20) };
    assert.equal(isMoveLockedForRole({ isManager: false, isLeader: false }, future, now), true);
    assert.equal(isMoveLockedForRole({ isManager: true, isLeader: false }, future, now), false);
    assert.equal(isMoveLockedForRole({ isManager: false, isLeader: true }, future, now), false);
    assert.equal(isMoveLockedForRole({ isManager: false, isLeader: false }, { startDate: new Date(2026, 9, 1) }, now), false);
});

test("formatDayDMY", () => {
    assert.equal(formatDayDMY(new Date(2026, 0, 5)), "05/01/2026");
    assert.equal(formatDayDMY(null), "");
});
