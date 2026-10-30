import test from "node:test";
import assert from "node:assert/strict";
import { formatAmount, sharedCurrency } from "./money";

test("sharedCurrency is used only when every slip agrees", () => {
    assert.equal(sharedCurrency(["R", "R", " R "]), "R");
    assert.equal(sharedCurrency(["R", "$"]), null);
    assert.equal(sharedCurrency([null, ""]), null);
    assert.equal(formatAmount(12.5, "R"), "R12.50");
    assert.equal(formatAmount(12.5, null), "12.50");
});
