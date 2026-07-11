import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateModuleScaffold } from "./module-generator/engine.js";
const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const backendRoot = path.resolve(currentDir, "..");
const moduleName = process.argv[2];
if (!moduleName) {
    console.error("El nombre del módulo es obligatorio. Ejemplo: npm run create:module productos");
    process.exit(1);
}
generateModuleScaffold({
    backendRoot,
    moduleName,
})
    .then((result) => {
    console.log(`Estructura del módulo "${result.names.routeSegment}" creada correctamente.`);
    console.log(`Backend: ${result.backendModuleDir}`);
    console.log(`Frontend: ${result.frontendModuleDir}`);
})
    .catch((error) => {
    const message = error instanceof Error ? error.message : "La generación del módulo falló.";
    console.error(message);
    process.exit(1);
});
//# sourceMappingURL=create-module.js.map