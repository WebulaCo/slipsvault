import test from "node:test";
import assert from "node:assert/strict";
import {
    buildCanonicalSupplierMap,
    findMatchingExistingSupplier,
    getRawSlipSupplier,
    getSlipMonthKey,
    isSameSupplier,
} from "./suppliers";

test("getRawSlipSupplier prioritizes title (Merchant) over place (Location)", () => {
    assert.equal(
        getRawSlipSupplier({ title: "Engen", place: "Hermanus" }),
        "Engen"
    );
    assert.equal(
        getRawSlipSupplier({ title: "Receipt", place: "Woolworths" }),
        "Woolworths"
    );
});

test("isSameSupplier detects branch variants and OCR typos of the same supplier", () => {
    assert.equal(isSameSupplier("Engen", "Engen Blouberg Motors"), true);
    assert.equal(isSameSupplier("Woolworths", "Woolworths Food Gardens"), true);
    assert.equal(isSameSupplier("Woolworths", "Woolworth"), true);
    assert.equal(isSameSupplier("Checkers (Pty) Ltd", "Checkers Hyper"), true);
    assert.equal(isSameSupplier("Engen", "Woolworths"), false);
});

test("findMatchingExistingSupplier matches scanned slip to existing canonical supplier and extracts location", () => {
    const match = findMatchingExistingSupplier("Engen Blouberg Motors", [
        "Woolworths",
        "Engen",
        "Checkers",
    ]);
    assert.ok(match);
    assert.equal(match.canonicalName, "Engen");
    assert.equal(match.extractedLocation, "Blouberg Motors");
});

test("buildCanonicalSupplierMap groups variant supplier names under the base brand", () => {
    const map = buildCanonicalSupplierMap([
        "Engen Blouberg Motors",
        "Engen",
        "Woolworths Gardens",
        "Woolworths",
    ]);
    assert.equal(map.get("engen blouberg motors"), "Engen");
    assert.equal(map.get("engen"), "Engen");
    assert.equal(map.get("woolworths gardens"), "Woolworths");
});

test("getSlipMonthKey uses UTC year and month consistently", () => {
    assert.equal(
        getSlipMonthKey({ date: "2025-11-01T00:00:00.000Z" }),
        "2025-11"
    );
    assert.equal(
        getSlipMonthKey({ date: null, createdAt: "2026-07-29T11:57:48.706Z" }),
        "2026-07"
    );
});
