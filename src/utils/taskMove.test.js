// Run with `npm test`. Shapes follow BACKEND_FRONTEND_SYNC_REPORT B2 (PUT /task/:id/move → { message, taskId, task }).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    getDestinationIndex, applyMoveToColumns, mergeMovedTask, buildMovePayload, isTaskCompleted, orderOf,
} from "./taskMove.js";

const cols = () => [
    { _id: "todo", title: "Todo", taskOrderIds: ["a", "b", "c"] },
    { _id: "prog", title: "In Progress", taskOrderIds: ["d"] },
    { _id: "done", title: "Done", taskOrderIds: [] },
];

test("payload is exactly { sourceColumnId, destColumnId, destinationIndex }", () => {
    assert.deepEqual(buildMovePayload("todo", "done", 2), { sourceColumnId: "todo", destColumnId: "done", destinationIndex: 2 });
    assert.deepEqual(buildMovePayload({ _id: "todo" }, { _id: "done" }, -3), { sourceColumnId: "todo", destColumnId: "done", destinationIndex: 0 });
    assert.equal(buildMovePayload("", "done", 0).sourceColumnId, null); // backlog
});

test("column dropdown appends to the end of the destination (not index 0)", () => {
    assert.equal(getDestinationIndex(cols()[1], "a"), 1);
    assert.equal(getDestinationIndex(cols()[2], "a"), 0);
    // the moving task itself is not counted (backend removes it first)
    assert.equal(getDestinationIndex(cols()[0], "a"), 2);
});

test("drag onto a filtered list: index is the position before the neighbour in the full order", () => {
    assert.equal(getDestinationIndex(cols()[0], "x", "c"), 2);
    assert.equal(getDestinationIndex(cols()[0], "a", "c"), 1);
    assert.equal(getDestinationIndex(cols()[0], "x", "missing"), 3);
});

test("applyMoveToColumns mirrors the backend order change", () => {
    const moved = applyMoveToColumns(cols(), "b", "todo", "done", 0);
    assert.deepEqual(orderOf(moved[0]), ["a", "c"]);
    assert.deepEqual(orderOf(moved[2]), ["b"]);
    assert.deepEqual(orderOf(moved[1]), ["d"]);
    // same-column reorder
    const reordered = applyMoveToColumns(cols(), "c", "todo", "todo", 0);
    assert.deepEqual(orderOf(reordered[0]), ["c", "a", "b"]);
    // index is clamped like the backend
    assert.deepEqual(orderOf(applyMoveToColumns(cols(), "a", "todo", "prog", 99)[1]), ["d", "a"]);
    // applying the same move twice (own socket echo) is idempotent
    const twice = applyMoveToColumns(moved, "b", "todo", "done", 0);
    assert.deepEqual(twice.map(orderOf), moved.map(orderOf));
});

test("Todo → Done: status/completedAt/completedDate come from response.task, populated assignees kept", () => {
    const inState = { _id: "a", title: "A", columnId: "todo", status: "pending", completedAt: null, assignees: [{ _id: "u1", username: "Ann" }] };
    const server = { _id: "a", columnId: "done", status: "completed", completedAt: "2026-10-09T01:00:00.000Z", completedDate: "2026-10-09T01:00:00.000Z", assignees: ["u1"] };
    const next = mergeMovedTask(inState, server, "done");
    assert.equal(next.status, "completed");
    assert.ok(next.completedAt && next.completedDate);
    assert.equal(next.columnId, "done");
    assert.deepEqual(next.assignees, [{ _id: "u1", username: "Ann" }]);
    assert.equal(isTaskCompleted(next), true);
});

test("Done → Todo resets completion; Todo → In Progress stays pending", () => {
    const done = { _id: "a", columnId: "done", status: "completed", completedAt: "x", completedDate: "x" };
    const back = mergeMovedTask(done, { status: "pending", completedAt: null, completedDate: null }, "todo");
    assert.deepEqual([back.status, back.completedAt, back.completedDate, back.columnId], ["pending", null, null, "todo"]);
    const progress = mergeMovedTask({ _id: "b", columnId: "todo", status: "pending" }, { status: "pending", completedAt: null, completedDate: null }, "prog");
    assert.equal(isTaskCompleted(progress), false);
});

test("older response without task: only the column changes", () => {
    const next = mergeMovedTask({ _id: "a", columnId: "todo", status: "pending" }, undefined, "done");
    assert.deepEqual([next.columnId, next.status], ["done", "pending"]);
});

test("no UI path changes a column with PUT /task/:id {columnId}", () => {
    for (const file of ["../pages/MyTasks/MyTasks.jsx", "../pages/Project/ProjectBoard.jsx"]) {
        const src = readFileSync(new URL(file, import.meta.url), "utf8");
        assert.equal(/handleUpdateTaskField\(\{\s*columnId/.test(src), false, `${file} still sends columnId through updateTask`);
        assert.equal(/updateTask\([^)]*columnId/.test(src), false, file);
    }
});

test("no call to the shadowed /task/project/portfolio or the unmounted /task/:id/review", () => {
    // code only: comments may name the endpoints to explain why they are not used
    const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const sources = ["../../api.jsx", "../pages/Dashboard/KPI/KPI.jsx"].map((f) => stripComments(readFileSync(new URL(f, import.meta.url), "utf8")));
    for (const src of sources) assert.equal(/\/task\/project\/portfolio/.test(src), false);
    assert.match(sources[0], /\/project\/portfolio`/);
    assert.equal(/\/review`/.test(sources[0]), false);
});
