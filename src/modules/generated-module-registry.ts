import { clientsRouter } from "./clients/clients.routes.js";
import { clientPortalRouter } from "./client-portal/client-portal.routes.js";
import { cuttingRouter } from "./cutting/cutting.routes.js";
import { inventoryRouter } from "./inventory/inventory.routes.js";
import { installationRouter } from "./installation/installation.routes.js";
import { materialsRouter } from "./materials/materials.routes.js";
import { measurementsRouter } from "./measurements/measurements.routes.js";
import { priceListsRouter } from "./price-lists/price-lists.routes.js";
import { profileOptimizationRouter } from "./profile-optimization/profile-optimization.routes.js";
import { productTemplatesRouter } from "./product-templates/product-templates.routes.js";
import { productionRouter } from "./production/production.routes.js";
import { productsRouter } from "./products/products.routes.js";
import { postventaRouter } from "./postventa/postventa.routes.js";
import { projectProfitabilityRouter } from "./project-profitability/project-profitability.routes.js";
import { projectsRouter } from "./projects/projects.routes.js";
import { purchasingRouter } from "./purchasing/purchasing.routes.js";
import { quotationsRouter } from "./quotations/quotations.routes.js";
import { suppliersRouter } from "./suppliers/suppliers.routes.js";
import { tablerosRouter } from "./tableros/tableros.routes.js";

export const generatedPermissionResources = [
  "clients",
  "portal_cliente",
  "inventory",
  "installations",
  "materials",
  "measurements",
  "postventa",
  "price_lists",
  "products",
  "production",
  "projects",
  "purchasing",
  "suppliers",
  "tableros",
] as const;

export const generatedModuleRouters = [
  clientsRouter,
  clientPortalRouter,
  cuttingRouter,
  inventoryRouter,
  installationRouter,
  materialsRouter,
  measurementsRouter,
  priceListsRouter,
  profileOptimizationRouter,
  productTemplatesRouter,
  productionRouter,
  productsRouter,
  postventaRouter,
  projectProfitabilityRouter,
  projectsRouter,
  purchasingRouter,
  quotationsRouter,
  suppliersRouter,
  tablerosRouter,
] as const;
