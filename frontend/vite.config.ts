import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

function moduleAssetTargets() {
  const modulesRoot = path.resolve(__dirname, "../modules");
  if (!fs.existsSync(modulesRoot)) return [];

  return fs.readdirSync(modulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const publicDir = path.join(modulesRoot, entry.name, "frontend", "public");
      if (!fs.existsSync(publicDir)) return [];

      return [{
        src: path.join(publicDir, "**"),
        dest: path.posix.join("modules", entry.name)
      }];
    });
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: moduleAssetTargets(),
      watch: {}
    })
  ],
  resolve: {
    alias: {
      "@game-modules": path.resolve(__dirname, "../modules/index.ts"),
      "@game-modules/": `${path.resolve(__dirname, "../modules")}/`,
      "react": path.resolve(__dirname, "node_modules/react"),
      "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime.js")
    }
  }
});
