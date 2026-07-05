const NUMERIC_OPERATORS = new Set([
    "ADD",
    "CONSTANT",
    "DIRECT_INPUT",
    "DIVIDE",
    "IF",
    "INPUT",
    "MULTIPLY",
    "ROUND_UP",
    "SUBTRACT",
]);
const BOOLEAN_OPERATORS = new Set([
    "EQ",
    "GT",
    "GTE",
    "LT",
    "LTE",
    "NEQ",
]);
const SUPPORTED_OPERATORS = new Set([
    ...NUMERIC_OPERATORS,
    ...BOOLEAN_OPERATORS,
]);
class FormulaError extends Error {
    constructor(message, path) {
        super(`${path}: ${message}`);
        this.name = "FormulaError";
    }
}
const isRecord = (value) => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};
const isFiniteNumber = (value) => {
    return typeof value === "number" && Number.isFinite(value);
};
const toFiniteNumber = (value) => {
    if (isFiniteNumber(value)) {
        return value;
    }
    if (typeof value === "string") {
        const trimmedValue = value.trim();
        if (trimmedValue.length === 0) {
            return null;
        }
        const parsedValue = Number(trimmedValue);
        return Number.isFinite(parsedValue) ? parsedValue : null;
    }
    return null;
};
const getNodeType = (value, path) => {
    if (!isRecord(value)) {
        throw new FormulaError("Formula must be an object.", path);
    }
    if (typeof value.type !== "string" || value.type.trim().length === 0) {
        throw new FormulaError("Formula type is required.", path);
    }
    return value.type;
};
const assertString = (value, path, label) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new FormulaError(`${label} must be a non-empty string.`, path);
    }
    return value.trim();
};
const assertInteger = (value, path, label) => {
    const parsedValue = toFiniteNumber(value);
    if (parsedValue === null || !Number.isInteger(parsedValue)) {
        throw new FormulaError(`${label} must be an integer.`, path);
    }
    return parsedValue;
};
const evaluateInputValue = (value, path) => {
    if (value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean") {
        return value;
    }
    throw new FormulaError("Inputs used in formulas must resolve to a string, number, boolean, or null.", path);
};
const assertBooleanResult = (value, path) => {
    if (typeof value !== "boolean") {
        throw new FormulaError("Formula must resolve to a boolean value.", path);
    }
    return value;
};
const assertNumericResult = (value, path) => {
    const parsedValue = toFiniteNumber(value);
    if (parsedValue === null) {
        throw new FormulaError("Formula must resolve to a numeric value.", path);
    }
    return parsedValue;
};
const comparePrimitiveValues = (leftValue, rightValue, operator) => {
    switch (operator) {
        case "GT":
            return assertNumericResult(leftValue, "left") > assertNumericResult(rightValue, "right");
        case "GTE":
            return assertNumericResult(leftValue, "left") >= assertNumericResult(rightValue, "right");
        case "LT":
            return assertNumericResult(leftValue, "left") < assertNumericResult(rightValue, "right");
        case "LTE":
            return assertNumericResult(leftValue, "left") <= assertNumericResult(rightValue, "right");
        case "EQ":
            return leftValue === rightValue;
        case "NEQ":
            return leftValue !== rightValue;
        default:
            throw new Error(`Unsupported comparison operator ${operator}.`);
    }
};
const evaluateNode = (formula, inputValues, path) => {
    const type = getNodeType(formula, path);
    if (!SUPPORTED_OPERATORS.has(type)) {
        throw new FormulaError(`Unknown operator "${type}".`, path);
    }
    const formulaNode = formula;
    switch (type) {
        case "CONSTANT": {
            const constantValue = formulaNode.value;
            const numericValue = toFiniteNumber(constantValue);
            if (numericValue !== null) {
                return numericValue;
            }
            if (typeof constantValue === "boolean") {
                return constantValue;
            }
            throw new FormulaError("CONSTANT.value must be a number or boolean.", `${path}.value`);
        }
        case "INPUT":
        case "DIRECT_INPUT": {
            const keyProperty = type === "DIRECT_INPUT" ? "inputKey" : "key";
            const inputKey = assertString(formulaNode[keyProperty], `${path}.${keyProperty}`, keyProperty);
            if (!(inputKey in inputValues)) {
                throw new FormulaError(`Missing input "${inputKey}".`, path);
            }
            return evaluateInputValue(inputValues[inputKey], path);
        }
        case "ADD": {
            if (!Array.isArray(formulaNode.values) || formulaNode.values.length === 0) {
                throw new FormulaError("ADD.values must be a non-empty array.", `${path}.values`);
            }
            return formulaNode.values.reduce((sum, child, index) => {
                return (sum +
                    assertNumericResult(evaluateNode(child, inputValues, `${path}.values[${index}]`), `${path}.values[${index}]`));
            }, 0);
        }
        case "MULTIPLY": {
            if (!Array.isArray(formulaNode.values) || formulaNode.values.length === 0) {
                throw new FormulaError("MULTIPLY.values must be a non-empty array.", `${path}.values`);
            }
            return formulaNode.values.reduce((product, child, index) => {
                return (product *
                    assertNumericResult(evaluateNode(child, inputValues, `${path}.values[${index}]`), `${path}.values[${index}]`));
            }, 1);
        }
        case "SUBTRACT": {
            return (assertNumericResult(evaluateNode(formulaNode.left, inputValues, `${path}.left`), `${path}.left`) -
                assertNumericResult(evaluateNode(formulaNode.right, inputValues, `${path}.right`), `${path}.right`));
        }
        case "DIVIDE": {
            const divisor = assertNumericResult(evaluateNode(formulaNode.right, inputValues, `${path}.right`), `${path}.right`);
            if (divisor === 0) {
                throw new FormulaError("Division by zero is not allowed.", path);
            }
            return (assertNumericResult(evaluateNode(formulaNode.left, inputValues, `${path}.left`), `${path}.left`) / divisor);
        }
        case "ROUND_UP": {
            const precision = assertInteger(formulaNode.precision, `${path}.precision`, "precision");
            if (precision < 0 || precision > 6) {
                throw new FormulaError("precision must be between 0 and 6.", `${path}.precision`);
            }
            const value = assertNumericResult(evaluateNode(formulaNode.value, inputValues, `${path}.value`), `${path}.value`);
            const factor = 10 ** precision;
            return Math.ceil(value * factor) / factor;
        }
        case "IF": {
            const condition = assertBooleanResult(evaluateNode(formulaNode.condition, inputValues, `${path}.condition`), `${path}.condition`);
            return evaluateNode(condition ? formulaNode.then : formulaNode.else, inputValues, condition ? `${path}.then` : `${path}.else`);
        }
        case "GT":
        case "GTE":
        case "LT":
        case "LTE":
        case "EQ":
        case "NEQ": {
            return comparePrimitiveValues(evaluateNode(formulaNode.left, inputValues, `${path}.left`), evaluateNode(formulaNode.right, inputValues, `${path}.right`), type);
        }
        default:
            throw new FormulaError(`Unknown operator "${type}".`, path);
    }
};
const validateNode = (formula, path, allowedInputKeys, errors) => {
    try {
        const type = getNodeType(formula, path);
        if (!SUPPORTED_OPERATORS.has(type)) {
            throw new FormulaError(`Unknown operator "${type}".`, path);
        }
        const formulaNode = formula;
        switch (type) {
            case "CONSTANT": {
                if (!isFiniteNumber(formulaNode.value) &&
                    typeof formulaNode.value !== "boolean") {
                    throw new FormulaError("CONSTANT.value must be a number or boolean.", `${path}.value`);
                }
                return;
            }
            case "INPUT":
            case "DIRECT_INPUT": {
                const keyProperty = type === "DIRECT_INPUT" ? "inputKey" : "key";
                const inputKey = assertString(formulaNode[keyProperty], `${path}.${keyProperty}`, keyProperty);
                if (allowedInputKeys && !allowedInputKeys.has(inputKey)) {
                    throw new FormulaError(`Unknown input "${inputKey}".`, `${path}.${keyProperty}`);
                }
                return;
            }
            case "ADD":
            case "MULTIPLY": {
                if (!Array.isArray(formulaNode.values) || formulaNode.values.length === 0) {
                    throw new FormulaError(`${type}.values must be a non-empty array.`, `${path}.values`);
                }
                formulaNode.values.forEach((child, index) => {
                    validateNode(child, `${path}.values[${index}]`, allowedInputKeys, errors);
                });
                return;
            }
            case "SUBTRACT":
            case "DIVIDE":
            case "GT":
            case "GTE":
            case "LT":
            case "LTE":
            case "EQ":
            case "NEQ": {
                validateNode(formulaNode.left, `${path}.left`, allowedInputKeys, errors);
                validateNode(formulaNode.right, `${path}.right`, allowedInputKeys, errors);
                return;
            }
            case "ROUND_UP": {
                const precision = assertInteger(formulaNode.precision, `${path}.precision`, "precision");
                if (precision < 0 || precision > 6) {
                    throw new FormulaError("precision must be between 0 and 6.", `${path}.precision`);
                }
                validateNode(formulaNode.value, `${path}.value`, allowedInputKeys, errors);
                return;
            }
            case "IF": {
                validateNode(formulaNode.condition, `${path}.condition`, allowedInputKeys, errors);
                validateNode(formulaNode.then, `${path}.then`, allowedInputKeys, errors);
                validateNode(formulaNode.else, `${path}.else`, allowedInputKeys, errors);
                return;
            }
        }
    }
    catch (error) {
        if (error instanceof FormulaError) {
            errors.push(error.message);
            return;
        }
        throw error;
    }
};
export const validateFormula = (formulaJson, options) => {
    const errors = [];
    const allowedInputKeys = options?.allowedInputKeys
        ? new Set(options.allowedInputKeys)
        : null;
    validateNode(formulaJson, "$", allowedInputKeys, errors);
    return {
        errors,
        isValid: errors.length === 0,
    };
};
export const evaluateFormula = (formulaJson, inputValues, options) => {
    return evaluateNode(formulaJson, inputValues, options?.path ?? "$");
};
export const evaluateNumericFormula = (formulaJson, inputValues, options) => {
    return assertNumericResult(evaluateFormula(formulaJson, inputValues, options), options?.path ?? "$");
};
export const evaluateBooleanFormula = (formulaJson, inputValues, options) => {
    return assertBooleanResult(evaluateFormula(formulaJson, inputValues, options), options?.path ?? "$");
};
//# sourceMappingURL=product-template-formulas.js.map