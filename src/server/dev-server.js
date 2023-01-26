import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createServer as createViteServer } from "vite";
import { performance } from "perf_hooks";

import { printServerInfo } from "./utils/printServerInfo.js";

if (!globalThis.ssrStartTime) {
  globalThis.ssrStartTime = performance.now();
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = (p) => path.resolve(dirname, "..", "..", p);

const root = process.cwd();
const PORT = process.env.PORT || 5173;

export const createServer = async () => {
  const app = express();

  const vite = await createViteServer({
    root,
    server: {
      middlewareMode: true,
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res) => {
    try {
      const url = req.originalUrl;

      const indexHtml = fs.readFileSync(resolve("index.html"), "utf-8");
      const template = await vite.transformIndexHtml(url, indexHtml);

      const { render } = await vite.ssrLoadModule("src/server/render.jsx");

      const appHtml = render(url);

      const html = template.replace(`<!--app-html-->`, appHtml);

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      res.status(500).end(e.stack);
    }
  });

  return { app, vite };
};

createServer().then(({ app, vite }) =>
  app.listen(PORT, () =>
    printServerInfo({ viteServer: vite, port: Number(PORT) })
  )
);
