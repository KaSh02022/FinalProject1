import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNonNegativeNumber, buildFinancePayload, toNumberInput } from "./projectFinance.js";

test("empty input is not sent (create → backend 0, update → value kept)", () => {
    assert.deepEqual(parseNonNegativeNumber("", "Budget"), { value: undefined });
    assert.deepEqual(parseNonNegativeNumber("   ", "Budget"), { value: undefined });
    assert.deepEqual(buildFinancePayload({ budget: "", costPerPoint: "" }), { payload: {} });
});

test("0 and positive numbers are sent as numbers", () => {
    assert.deepEqual(buildFinancePayload({ budget: "0", costPerPoint: "12.5" }), { payload: { budget: 0, costPerPoint: 12.5 } });
    assert.deepEqual(buildFinancePayload({ budget: "1000" }), { payload: { budget: 1000 } });
});

test("negative or non-numeric values are rejected before the request", () => {
    assert.equal(buildFinancePayload({ budget: "-1" }).error, "Budget must be 0 or more.");
    assert.equal(buildFinancePayload({ budget: "5", costPerPoint: "abc" }).error, "Cost per Point must be a number.");
});

test("projects without the fields show an empty input, 0 shows 0", () => {
    assert.equal(toNumberInput(undefined), "");
    assert.equal(toNumberInput(null), "");
    assert.equal(toNumberInput(0), "0");
    assert.equal(toNumberInput(250), "250");
});
