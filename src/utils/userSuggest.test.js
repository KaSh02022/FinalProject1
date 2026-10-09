import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestInvitees, looksLikeEmail, validateProjectDates } from "./userSuggest.js";

const users = [
    { _id: "1", username: "Anna Nguyen", email: "anna@team.test", status: "Active" },
    { _id: "2", username: "Bao Tran", email: "bao@team.test", status: "Active" },
    { _id: "3", username: "Hanna", email: "hanna@team.test", status: "Inactive" },
    { _id: "4", username: "Lan", email: "lan.anna@team.test" },
];

test("suggestInvitees: empty query gives nothing", () => {
    assert.deepEqual(suggestInvitees(users, [], "  "), []);
});

test("suggestInvitees: matches name or email, prefix matches first, skips suspended", () => {
    const ids = suggestInvitees(users, [], "ann").map((u) => u._id);
    assert.deepEqual(ids, ["1", "4"]); // Hanna is Inactive; Anna starts with "ann"
});

test("suggestInvitees: excludes current members (populated or not)", () => {
    const members = [{ userId: { email: "ANNA@team.test" } }, { email: "lan.anna@team.test" }];
    assert.deepEqual(suggestInvitees(users, members, "anna"), []);
});

test("suggestInvitees: limit", () => {
    assert.equal(suggestInvitees(users, [], "team", 2).length, 2);
});

test("looksLikeEmail", () => {
    assert.equal(looksLikeEmail("a@b.co"), true);
    assert.equal(looksLikeEmail("anna"), false);
});

test("validateProjectDates: unchanged past dates are accepted", () => {
    const saved = { startDate: "2026-09-01", dueDate: "2026-09-30" };
    assert.equal(validateProjectDates(saved, saved, "2026-10-09"), "");
});

test("validateProjectDates: a changed date in the past is refused", () => {
    const saved = { startDate: "2026-09-01", dueDate: "2026-12-30" };
    assert.match(validateProjectDates({ ...saved, startDate: "2026-09-02" }, saved, "2026-10-09"), /start date/);
    assert.match(validateProjectDates({ ...saved, dueDate: "2026-10-01" }, saved, "2026-10-09"), /end date/);
});

test("validateProjectDates: start after end is refused", () => {
    assert.match(validateProjectDates({ startDate: "2026-11-02", dueDate: "2026-11-01" }, {}, "2026-10-09"), /after the end/);
});
