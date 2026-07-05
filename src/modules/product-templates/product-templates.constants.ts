export const PRODUCT_TEMPLATES_API_PATH = "/product-templates";
export const PRODUCT_TEMPLATE_VERSIONS_API_PATH = "/product-template-versions";

export const PRODUCT_TEMPLATE_TYPES = [
  "WINDOW",
  "DOOR",
  "SHOWER",
  "FACADE",
  "RAILING",
  "MIRROR",
  "CUSTOM",
  "SERVICE",
] as const;

export const PRODUCT_TEMPLATE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
] as const;

export const PRODUCT_TEMPLATE_VERSION_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "ARCHIVED",
] as const;

export const PRODUCT_TEMPLATE_INPUT_TYPES = [
  "NUMBER",
  "TEXT",
  "SELECT",
  "BOOLEAN",
  "MATERIAL_SELECT",
] as const;

export const PRODUCT_TEMPLATE_MATERIAL_RULE_TYPES = [
  "LINEAR_CUT",
  "SHEET_CUT",
  "UNIT_QUANTITY",
  "PACKAGE_QUANTITY",
  "SERVICE_COST",
] as const;

export const PRODUCT_TEMPLATE_LABOR_TYPES = [
  "FABRICATION",
  "INSTALLATION",
  "TRANSPORT",
  "OTHER",
] as const;

export const PRODUCT_TEMPLATE_READ_PERMISSIONS = [
  "quotations.create",
  "quotations.update",
] as const;

export const PRODUCT_TEMPLATE_MANAGE_PERMISSION =
  "system.settings.update";

export const PRODUCT_TEMPLATE_SIMULATION_HISTORY_PERMISSION =
  "system.settings.read";

export const PRODUCT_TEMPLATE_ENTITY_TYPES = {
  accessoryRule: "ProductTemplateAccessoryRule",
  input: "ProductTemplateInput",
  laborRule: "ProductTemplateLaborRule",
  materialRule: "ProductTemplateMaterialRule",
  simulation: "ProductTemplateSimulation",
  template: "ProductTemplate",
  version: "ProductTemplateVersion",
} as const;
