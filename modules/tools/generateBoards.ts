import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modulesRoot = path.resolve(__dirname, "..", "");

async function generateBoards() {
  const entries = fs.readdirSync(modulesRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "tools") continue;

    const generatorPath = path.join(
      modulesRoot,
      entry.name,
      "frontend",
      "tools",
      "generateBoardSvg.ts"
    );

    if (!fs.existsSync(generatorPath)) continue;

    const generatorModule = await import(pathToFileURL(generatorPath).href);
    if (typeof generatorModule.generateBoardSvgs === "function") {
      await generatorModule.generateBoardSvgs();
    }
  }
}

generateBoards().catch((error) => {
  console.error(error);
  process.exit(1);
});
