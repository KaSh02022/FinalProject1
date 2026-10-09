import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMyTaskStats, getTaskGroup } from "./myTaskStats.js";

const col = (title) => ({ _id: title, title });
const now = new Date(2026, 9, 9, 10);

test("getTaskGroup: status completed wins over the column", () => {
    assert.equal(getTaskGroup({ status: "completed", columnId: col("To Do") }), "completed");
});

test("getTaskGroup: from the column title, backlog = to do, unknown / unconfirmed done = other", () => {
    assert.equal(getTaskGroup({ columnId: col("In Progress") }), "progress");
    assert.equal(getTaskGroup({ columnId: col("Review") }), "review");
    assert.equal(getTaskGroup({ columnId: null }), "todo");
    assert.equal(getTaskGroup({ columnId: col("Done"), status: "pending" }), "other");
    assert.equal(getTaskGroup({ columnId: col("Blocked") }), "other");
});

test("computeMyTaskStats: counts, points, due buckets and projects", () => {
    const due = { a: new Date(2026, 9, 8), b: new Date(2026, 9, 10), c: new Date(2026, 9, 30), d: new Date(2026, 9, 1) };
    const project = { _id: "p1", name: "Alpha", color: "#123456" };
    const tasks = [
        { _id: "a", columnId: col("To Do"), point: 3, projectId: project },
        { _id: "b", columnId: col("In Progress"), point: 5, projectId: project },
        { _id: "c", columnId: col("Review"), points: 2, projectId: "p2" },
        { _id: "d", columnId: col("Done"), status: "completed", point: 1, projectId: project },
    ];
    const stats = computeMyTaskStats(tasks, (t) => due[t._id], now);
    assert.equal(stats.total, 4);
    assert.equal(stats.points, 11);
    assert.equal(stats.completed, 1);
    assert.equal(stats.completionRate, 25);
    assert.equal(stats.overdue, 1); // a (d is completed, not counted)
    assert.equal(stats.dueSoon, 1); // b
    assert.deepEqual(stats.groups.map((g) => [g.key, g.count]), [["todo", 1], ["progress", 1], ["review", 1], ["completed", 1]]);
    assert.deepEqual(stats.projects.map((p) => [p.id, p.total, p.completed]), [["p1", 3, 1], ["p2", 1, 0]]);
});

test("computeMyTaskStats: empty list has no completion rate (not 0%)", () => {
    const stats = computeMyTaskStats([], () => null, now);
    assert.equal(stats.completionRate, null);
    assert.equal(stats.groups.some((g) => g.key === "other"), false);
});
