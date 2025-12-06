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
        path.resolve(__dirname, "./src") + "/**/*.{tsx,ts}",
        path.resolve(__dirname, "../shared") + "/**/*.{tsx,ts}",
        path.resolve(__dirname, "../modules") + "/*.{tsx,ts}",
        path.resolve(__dirname, "../modules") + "/*/frontend/**/*.{tsx,ts}",
        path.resolve(__dirname, "../modules") + "/*/shared/**/*.{tsx,ts}",
      ],
      exclude: [
        path.resolve(__dirname, "../functions") + "/**",
        path.resolve(__dirname, "../modules") + "/*/functions/**",
      ],      
    }),
    viteStaticCopy({
      targets: moduleAssetTargets,
    }),
  ],
  resolve: {
    alias: {
      "@game-modules": path.resolve(__dirname, "../modules/frontend.ts"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  build: {
    rollupOptions: {
      external: [
        /\/functions\//,
        /\/modules\/[^/]+\/functions\//,
      ],
    },
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
      deny: [
        path.resolve(__dirname, "../functions"),
        path.resolve(__dirname, "../modules/*/functions"),
      ],
    },
  },
});
