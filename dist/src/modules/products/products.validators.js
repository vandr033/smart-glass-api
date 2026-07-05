import { z } from "zod";
import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import { productMutationSchema } from "./products.schema.js";
const booleanFilterSchema = z
    .enum(["false", "true"])
    .transform((value) => value === "true")
    .optional();
export const productIdParamSchema = z.object({
    id: z.uuid(),
});
export const listProductsQuerySchema = z.object({
    isActive: booleanFilterSchema,
    page: integerQueryParamSchema({ defaultValue: 1, min: 1, max: 100 }),
    perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
    search: z.string().trim().default(""),
    sortBy: z.enum(["createdAt", "name", "updatedAt"]).default("createdAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
});
export const createProductSchema = productMutationSchema;
export const updateProductSchema = productMutationSchema;
//# sourceMappingURL=products.validators.js.map