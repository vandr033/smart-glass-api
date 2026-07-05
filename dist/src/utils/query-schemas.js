import { z } from "zod";
export const integerQueryParamSchema = ({ defaultValue, min = 1, max = Number.POSITIVE_INFINITY, }) => z
    .union([z.number(), z.string(), z.undefined()])
    .transform((value) => {
    if (value === undefined) {
        return defaultValue;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? Number(trimmed) : defaultValue;
    }
    return value;
})
    .transform((value) => {
    if (!Number.isFinite(value)) {
        return defaultValue;
    }
    if (value < min) {
        return min;
    }
    if (max !== Number.POSITIVE_INFINITY && value > max) {
        return max;
    }
    return value;
})
    .refine((value) => Number.isInteger(value), {
    message: "Expected an integer value.",
});
//# sourceMappingURL=query-schemas.js.map