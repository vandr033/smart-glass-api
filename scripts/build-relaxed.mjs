import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

const child = spawn(npxCommand, ["tsc", "-p", "tsconfig.json"], {
  cwd: projectRoot,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Failed to start the TypeScript build.", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`TypeScript build was terminated by signal ${signal}.`);
    process.exit(1);
  }

  if (code === 0) {
    process.exit(0);
  }

  console.warn(
    "TypeScript reported errors, but the backend build is configured to continue.",
  );
  process.exit(0);
});
