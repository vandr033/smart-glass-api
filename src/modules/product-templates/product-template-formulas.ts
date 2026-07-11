import type { JsonLike } from "../materials/materials.behavior.js";

type FormulaNode = {
  [key: string]: unknown;
  type: string;
};

type ValidateFormulaOptions = {
  allowedInputKeys?: Iterable<string>;
};

type FormulaValidationResult = {
  errors: string[];
  isValid: boolean;
};

type FormulaEvaluationOptions = {
  path?: string;
};

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
  constructor(message: string, path: string) {
    super(`${path}: ${message}`);
    this.name = "FormulaError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const toFiniteNumber = (value: unknown): number | null => {
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

const getNodeType = (value: unknown, path: string): string => {
  if (!isRecord(value)) {
    throw new FormulaError("La fórmula debe ser un objeto.", path);
  }

  if (typeof value.type !== "string" || value.type.trim().length === 0) {
    throw new FormulaError("El tipo de fórmula es obligatorio.", path);
  }

  return value.type;
};

const assertString = (
  value: unknown,
  path: string,
  label: string,
): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FormulaError(`${label} debe ser un texto no vacío.`, path);
  }

  return value.trim();
};

const assertInteger = (
  value: unknown,
  path: string,
  label: string,
): number => {
  const parsedValue = toFiniteNumber(value);

  if (parsedValue === null || !Number.isInteger(parsedValue)) {
    throw new FormulaError(`${label} debe ser un número entero.`, path);
  }

  return parsedValue;
};

const evaluateInputValue = (
  value: unknown,
  path: string,
): JsonLike => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  throw new FormulaError(
    "Las entradas usadas en las fórmulas deben devolver texto, número, sí/no o vacío.",
    path,
  );
};

const assertBooleanResult = (value: JsonLike, path: string): boolean => {
  if (typeof value !== "boolean") {
    throw new FormulaError("La fórmula debe devolver un valor sí/no.", path);
  }

  return value;
};

const assertNumericResult = (value: JsonLike, path: string): number => {
  const parsedValue = toFiniteNumber(value);

  if (parsedValue === null) {
    throw new FormulaError("La fórmula debe devolver un valor numérico.", path);
  }

  return parsedValue;
};

const comparePrimitiveValues = (
  leftValue: JsonLike,
  rightValue: JsonLike,
  operator: string,
): boolean => {
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

const evaluateNode = (
  formula: unknown,
  inputValues: Record<string, unknown>,
  path: string,
): JsonLike => {
  const type = getNodeType(formula, path);

  if (!SUPPORTED_OPERATORS.has(type)) {
    throw new FormulaError(`Unknown operator "${type}".`, path);
  }

  const formulaNode = formula as FormulaNode;

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

      throw new FormulaError(
        "CONSTANT.value must be a number or boolean.",
        `${path}.value`,
      );
    }

    case "INPUT":
    case "DIRECT_INPUT": {
      const keyProperty = type === "DIRECT_INPUT" ? "inputKey" : "key";
      const inputKey = assertString(
        formulaNode[keyProperty],
        `${path}.${keyProperty}`,
        keyProperty,
      );

      if (!(inputKey in inputValues)) {
        throw new FormulaError(`Falta la entrada "${inputKey}".`, path);
      }

      return evaluateInputValue(inputValues[inputKey], path);
    }

    case "ADD": {
      if (!Array.isArray(formulaNode.values) || formulaNode.values.length === 0) {
        throw new FormulaError(
          "Los valores de la suma deben ser una lista no vacía.",
          `${path}.values`,
        );
      }

      return formulaNode.values.reduce((sum, child, index) => {
        return (
          sum +
          assertNumericResult(
            evaluateNode(child, inputValues, `${path}.values[${index}]`),
            `${path}.values[${index}]`,
          )
        );
      }, 0);
    }

    case "MULTIPLY": {
      if (!Array.isArray(formulaNode.values) || formulaNode.values.length === 0) {
        throw new FormulaError(
          "Los valores de la multiplicación deben ser una lista no vacía.",
          `${path}.values`,
        );
      }

      return formulaNode.values.reduce((product, child, index) => {
        return (
          product *
          assertNumericResult(
            evaluateNode(child, inputValues, `${path}.values[${index}]`),
            `${path}.values[${index}]`,
          )
        );
      }, 1);
    }

    case "SUBTRACT": {
      return (
        assertNumericResult(
          evaluateNode(formulaNode.left, inputValues, `${path}.left`),
          `${path}.left`,
        ) -
        assertNumericResult(
          evaluateNode(formulaNode.right, inputValues, `${path}.right`),
          `${path}.right`,
        )
      );
    }

    case "DIVIDE": {
      const divisor = assertNumericResult(
        evaluateNode(formulaNode.right, inputValues, `${path}.right`),
        `${path}.right`,
      );

      if (divisor === 0) {
        throw new FormulaError("No se permite dividir entre cero.", path);
      }

      return (
        assertNumericResult(
          evaluateNode(formulaNode.left, inputValues, `${path}.left`),
          `${path}.left`,
        ) / divisor
      );
    }

    case "ROUND_UP": {
      const precision = assertInteger(
        formulaNode.precision,
        `${path}.precision`,
        "precision",
      );

      if (precision < 0 || precision > 6) {
        throw new FormulaError(
          "La precisión debe estar entre 0 y 6.",
          `${path}.precision`,
        );
      }

      const value = assertNumericResult(
        evaluateNode(formulaNode.value, inputValues, `${path}.value`),
        `${path}.value`,
      );
      const factor = 10 ** precision;

      return Math.ceil(value * factor) / factor;
    }

    case "IF": {
      const condition = assertBooleanResult(
        evaluateNode(formulaNode.condition, inputValues, `${path}.condition`),
        `${path}.condition`,
      );

      return evaluateNode(
        condition ? formulaNode.then : formulaNode.else,
        inputValues,
        condition ? `${path}.then` : `${path}.else`,
      );
    }

    case "GT":
    case "GTE":
    case "LT":
    case "LTE":
    case "EQ":
    case "NEQ": {
      return comparePrimitiveValues(
        evaluateNode(formulaNode.left, inputValues, `${path}.left`),
        evaluateNode(formulaNode.right, inputValues, `${path}.right`),
        type,
      );
    }

    default:
      throw new FormulaError(`Operador desconocido "${type}".`, path);
  }
};

const validateNode = (
  formula: unknown,
  path: string,
  allowedInputKeys: Set<string> | null,
  errors: string[],
): void => {
  try {
    const type = getNodeType(formula, path);

    if (!SUPPORTED_OPERATORS.has(type)) {
      throw new FormulaError(`Operador desconocido "${type}".`, path);
    }

    const formulaNode = formula as FormulaNode;

    switch (type) {
      case "CONSTANT": {
        if (
          !isFiniteNumber(formulaNode.value) &&
          typeof formulaNode.value !== "boolean"
        ) {
          throw new FormulaError(
        "El valor de una constante debe ser un número o un valor sí/no.",
            `${path}.value`,
          );
        }
        return;
      }

      case "INPUT":
      case "DIRECT_INPUT": {
        const keyProperty = type === "DIRECT_INPUT" ? "inputKey" : "key";
        const inputKey = assertString(
          formulaNode[keyProperty],
          `${path}.${keyProperty}`,
          keyProperty,
        );

        if (allowedInputKeys && !allowedInputKeys.has(inputKey)) {
          throw new FormulaError(
            `Entrada desconocida "${inputKey}".`,
            `${path}.${keyProperty}`,
          );
        }

        return;
      }

      case "ADD":
      case "MULTIPLY": {
        if (!Array.isArray(formulaNode.values) || formulaNode.values.length === 0) {
          throw new FormulaError(
            `${type}.values must be a non-empty array.`,
            `${path}.values`,
          );
        }

        formulaNode.values.forEach((child, index) => {
          validateNode(
            child,
            `${path}.values[${index}]`,
            allowedInputKeys,
            errors,
          );
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
        const precision = assertInteger(
          formulaNode.precision,
          `${path}.precision`,
          "precision",
        );

        if (precision < 0 || precision > 6) {
          throw new FormulaError(
            "La precisión debe estar entre 0 y 6.",
            `${path}.precision`,
          );
        }

        validateNode(formulaNode.value, `${path}.value`, allowedInputKeys, errors);
        return;
      }

      case "IF": {
        validateNode(
          formulaNode.condition,
          `${path}.condition`,
          allowedInputKeys,
          errors,
        );
        validateNode(formulaNode.then, `${path}.then`, allowedInputKeys, errors);
        validateNode(formulaNode.else, `${path}.else`, allowedInputKeys, errors);
        return;
      }
    }
  } catch (error) {
    if (error instanceof FormulaError) {
      errors.push(error.message);
      return;
    }

    throw error;
  }
};

export const validateFormula = (
  formulaJson: unknown,
  options?: ValidateFormulaOptions,
): FormulaValidationResult => {
  const errors: string[] = [];
  const allowedInputKeys = options?.allowedInputKeys
    ? new Set(options.allowedInputKeys)
    : null;

  validateNode(formulaJson, "$", allowedInputKeys, errors);

  return {
    errors,
    isValid: errors.length === 0,
  };
};

export const evaluateFormula = (
  formulaJson: unknown,
  inputValues: Record<string, unknown>,
  options?: FormulaEvaluationOptions,
): JsonLike => {
  return evaluateNode(formulaJson, inputValues, options?.path ?? "$");
};

export const evaluateNumericFormula = (
  formulaJson: unknown,
  inputValues: Record<string, unknown>,
  options?: FormulaEvaluationOptions,
): number => {
  return assertNumericResult(
    evaluateFormula(formulaJson, inputValues, options),
    options?.path ?? "$",
  );
};

export const evaluateBooleanFormula = (
  formulaJson: unknown,
  inputValues: Record<string, unknown>,
  options?: FormulaEvaluationOptions,
): boolean => {
  return assertBooleanResult(
    evaluateFormula(formulaJson, inputValues, options),
    options?.path ?? "$",
  );
};
