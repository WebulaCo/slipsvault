import test from "node:test";
import assert from "node:assert/strict";
import { readScannedMerchant } from "./ocr";

test("readScannedMerchant keeps the store and the branch in different fields", () => {
    assert.deepEqual(
        readScannedMerchant({ merchant: "Woolworths", location: "Cavendish" }),
        { merchant: "Woolworths", location: "Cavendish" }
    );
    assert.deepEqual(
        readScannedMerchant({ merchant: "Woolworths", location: "Woolworths" }),
        { merchant: "Woolworths", location: "" }
    );
    assert.deepEqual(
        readScannedMerchant({ place: "Engen Blouberg" }),
        { merchant: "Engen Blouberg", location: "" }
    );
    assert.deepEqual(
        readScannedMerchant({
            merchant: "Engen",
            location: "Blouberg",
            place: "Engen Blouberg",
        }),
        { merchant: "Engen", location: "Blouberg" }
    );
});
