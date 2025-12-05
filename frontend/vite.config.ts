import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modulesDir = path.resolve(__dirname, "../modules");

const moduleAssetTargets =
  fs.existsSync(modulesDir) && fs.statSync(modulesDir).isDirectory()
    ? fs
        .readdirSync(modulesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .flatMap((d) => {
          const publicDir = path.join(modulesDir, d.name, "frontend", "public");

          if (!fs.existsSync(publicDir) || !fs.statSync(publicDir).isDirectory()) {
            return [];
          }

          return [
            {
              src: publicDir.replace(/\\/g, "/") + "/**",
              dest: path.posix.join("modules", d.name),
            },
          ];
        })
    : [];

export default defineConfig({
  root: __dirname,
  publicDir: "public",
  plugins: [
    react({
      include: [
        "**/*.{tsx,ts}",
        path.resolve(__dirname, "../modules") + "/**/*.{tsx,ts}",
        path.resolve(__dirname, "../shared") + "/**/*.{tsx,ts}",
      ],
    }),
    viteStaticCopy({
      targets: moduleAssetTargets,
    }),
  ],
  resolve: {
    alias: {
      "@game-modules": path.resolve(__dirname, "../modules"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  server: {
    fs: {
      strict: false,
      allow: [
        __dirname,
        "..",
        path.resolve(__dirname, "../modules"),
        path.resolve(__dirname, "../shared")
      ],
    },
  },
});
