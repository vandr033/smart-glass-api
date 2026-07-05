import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { integerQueryParamSchema } from "./query-schemas.js";
test("clamps oversized perPage values instead of rejecting them", () => {
    const schema = z.object({
        perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
    });
    const result = schema.parse({ perPage: "250" });
    assert.equal(result.perPage, 100);
});
test("clamps undersized values to the minimum", () => {
    const schema = z.object({
        page: integerQueryParamSchema({ defaultValue: 1, min: 1, max: 100 }),
    });
    const result = schema.parse({ page: 0 });
    assert.equal(result.page, 1);
});
//# sourceMappingURL=query-schemas.test.js.map