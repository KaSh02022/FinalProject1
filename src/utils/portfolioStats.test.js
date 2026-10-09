import { test } from "node:test";
import assert from "node:assert/strict";
import { projectProgress, budgetUsage, budgetTone, teamWorkload, planAdherence, averageAdherence } from "./portfolioStats.js";

const tasks = [
    { status: "completed", point: 5, columnId: { position: 3 } },
    { status: "pending", point: 3, columnId: { position: 3 } }, // in a Done column but not completed: not counted
    { status: "pending", points: 2 },
];

test("projectProgress: completion from task.status only", () => {
    const p = projectProgress({ _id: "p1", name: "Alpha" }, tasks);
    assert.deepEqual([p.total, p.completed, p.percent, p.points, p.completedPoints], [3, 1, 33, 10, 5]);
    assert.equal(projectProgress({ _id: "p2" }, []).percent, null);
});

test("budgetUsage: completed points x cost per point", () => {
    const progress = projectProgress({ _id: "p1" }, tasks);
    const usage = budgetUsage({ budget: 100, costPerPoint: 10 }, progress);
    assert.deepEqual([usage.spent, usage.percent, usage.remaining, usage.tone, usage.plannedCost], [50, 50, 50, "ok", 100]);
});

test("budgetUsage: no cost per point = no figure (not an estimate)", () => {
    const usage = budgetUsage({ budget: 100, costPerPoint: 0 }, projectProgress({}, tasks));
    assert.equal(usage.spent, null);
    assert.equal(usage.percent, null);
    assert.equal(usage.tone, "none");
});

test("budgetUsage: project without budget is skipped", () => {
    assert.equal(budgetUsage({ budget: 0, costPerPoint: 5 }, projectProgress({}, tasks)), null);
    assert.equal(budgetUsage({}, projectProgress({}, tasks)), null);
});

test("budgetTone thresholds", () => {
    assert.deepEqual([budgetTone(79), budgetTone(80), budgetTone(100), budgetTone(101)], ["ok", "watch", "watch", "over"]);
});

test("teamWorkload: per assignee across projects, sorted by active points", () => {
    const ann = { _id: "u1", username: "Ann", email: "ann@x.test" };
    const bob = { _id: "u2", username: "Bob" };
    const rows = teamWorkload([
        [{ assignees: [ann], point: 2 }, { assignees: [ann, bob], point: 8 }],
        [{ assignees: [bob], status: "completed", point: 5 }, { assignees: ["u9"], point: 1 }],
    ]);
    assert.deepEqual(rows.map((r) => [r.name, r.active, r.completed, r.total, r.activePoints]), [
        ["Ann", 2, 0, 2, 10],
        ["Bob", 1, 1, 2, 8],
        ["Unknown user", 1, 0, 1, 1],
    ]);
});

const parsed = (currentProjectWeek, weeks) => ({ currentProjectWeek, maxProjectWeek: weeks.length, weeks });
const wk = (n, expectancy, realProgress) => ({ week: `Week ${n}`, weekNumber: n, expectancy, realProgress });

test("planAdherence: latest real / plan of the current week, capped at 100", () => {
    assert.equal(planAdherence(parsed(2, [wk(1, 5, 4), wk(2, 10, 6), wk(3, 15, null)])), 60);
    assert.equal(planAdherence(parsed(1, [wk(1, 4, 9)])), 100);
});

test("planAdherence: past the plan uses the last week", () => {
    assert.equal(planAdherence(parsed(5, [wk(1, 5, 5), wk(2, 10, 8)])), 80);
});

test("planAdherence: not measurable gives null (never 100)", () => {
    assert.equal(planAdherence(null), null);
    assert.equal(planAdherence({ currentProjectWeek: null, maxProjectWeek: null, weeks: [] }), null);
    assert.equal(planAdherence(parsed(1, [wk(1, 0, 0)])), null);
});

test("averageAdherence ignores unmeasured projects", () => {
    assert.deepEqual(averageAdherence([60, null, 100]), { average: 80, measured: 2 });
    assert.deepEqual(averageAdherence([null]), { average: null, measured: 0 });
});
