import test from "node:test";
import assert from "node:assert/strict";
import {
    buildCanonicalSupplierMap,
    escapeRegExp,
    findMatchingExistingSupplier,
    getRawSlipSupplier,
    getSlipMonthKey,
    isSameSupplier,
    namesMatchingSupplier,
    planSupplierRename,
    resolveMergeScope,
    stripSupplierPrefix,
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

test("stripSupplierPrefix treats merchant names as literal text", () => {
    assert.equal(escapeRegExp("Shop (Sandton"), "Shop \\(Sandton");
    assert.doesNotThrow(() => stripSupplierPrefix("Sandton", "Shop (Sandton"));
    assert.equal(stripSupplierPrefix("Sandton", "Shop (Sandton"), "Sandton");
    assert.equal(stripSupplierPrefix("Shop (Sandton City", "Shop (Sandton"), "City");
    assert.equal(stripSupplierPrefix("A+ Mall", "A+"), "Mall");
    assert.equal(stripSupplierPrefix("Clicks* Claremont", "Clicks*"), "Claremont");
});

test("planSupplierRename keeps a suburb and still preserves the branch", () => {
    const kept = planSupplierRename(
        { title: "Engen Blouberg Motors", place: "Cape Town" },
        "Engen"
    );
    assert.equal(kept.title, "Engen");
    assert.equal(kept.place, "Blouberg Motors, Cape Town");

    const moved = planSupplierRename(
        { title: "Engen Blouberg Motors", place: "Engen Blouberg Motors" },
        "Engen"
    );
    assert.equal(moved.place, "Blouberg Motors");

    const alreadyThere = planSupplierRename(
        { title: "Engen Hermanus", place: "Hermanus" },
        "Engen"
    );
    assert.equal(alreadyThere.place, "Hermanus");

    const legalOnly = planSupplierRename(
        { title: "Checkers (Pty) Ltd", place: "" },
        "Checkers"
    );
    assert.equal(legalOnly.place, null);
    assert.equal(legalOnly.title, "Checkers");
});

test("namesMatchingSupplier rejects names that are not the same supplier", () => {
    const result = namesMatchingSupplier(
        ["Engen Blouberg Motors", "Woolworths", "Engen"],
        "Engen"
    );
    assert.deepEqual(result.accepted, ["Engen Blouberg Motors", "Engen"]);
    assert.deepEqual(result.rejected, ["Woolworths"]);
});

test("resolveMergeScope keeps contributors on their own slips", () => {
    assert.deepEqual(
        resolveMergeScope({
            role: "CONTRIBUTOR",
            userId: "user-1",
            companyId: "co-1",
            includeCompanyMembers: true,
        }),
        { kind: "own", userId: "user-1" }
    );
    assert.deepEqual(
        resolveMergeScope({
            role: "COMPANY_ADMIN",
            userId: "admin-1",
            companyId: "co-1",
            includeCompanyMembers: false,
        }),
        { kind: "own", userId: "admin-1" }
    );
    assert.deepEqual(
        resolveMergeScope({
            role: "COMPANY_ADMIN",
            userId: "admin-1",
            companyId: "co-1",
            includeCompanyMembers: true,
        }),
        { kind: "company", companyId: "co-1" }
    );
    assert.equal(
        resolveMergeScope({
            role: "ACCOUNTANT",
            userId: "acc-1",
            companyId: "co-1",
            includeCompanyMembers: true,
        }).kind,
        "forbidden"
    );
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
