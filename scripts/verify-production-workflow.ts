import assert from "node:assert/strict";

import {
  calculateCapacityUtilization,
  calculateProductionProgress,
  isProductionWorkflowTransitionAllowed,
} from "../src/modules/production/production-board.rules.js";

assert.equal(
  isProductionWorkflowTransitionAllowed("PENDING_PLANNING", "SCHEDULED"),
  true,
);
assert.equal(
  isProductionWorkflowTransitionAllowed("PENDING_PLANNING", "COMPLETED"),
  false,
);
assert.equal(
  isProductionWorkflowTransitionAllowed("BLOCKED", "COMPLETED"),
  false,
);
assert.equal(
  isProductionWorkflowTransitionAllowed("PENDING_QUALITY", "COMPLETED"),
  true,
);
assert.equal(calculateCapacityUtilization(480, 960), 50);
assert.equal(calculateCapacityUtilization(480, 0), 0);
assert.equal(calculateProductionProgress(3, 4), 75);
assert.equal(calculateProductionProgress(0, 0), 0);

console.log("Verificación del flujo de producción: OK");
