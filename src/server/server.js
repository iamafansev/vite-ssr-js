import fs from "node:fs";
import path from "node:path";
import express from "express";
import { fileURLToPath } from "node:url";
import compression from "compression";
import serveStatic from "serve-static";

import { render } from "./render";

const PORT = process.env.PORT || 5173;

const dirname = path.dirname(fileURLToPath(import.meta.url));

const resolve = (p) => path.resolve(dirname, "..", "..", p);

export const createServer = async () => {
  const indexProd = fs.readFileSync(resolve("dist/client/index.html"), "utf-8");

  const app = express();

  app.use(compression());
  app.use(serveStatic(resolve("dist/client"), {
    index: false,
  }));

  app.use("*", async (req, res) => {
    try {
      const url = req.originalUrl;
      const template = indexProd;
      const appHtml = render(url);

      const html = template.replace(`<!--app-html-->`, appHtml);

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      res.status(500).end(e.stack);
    }
  });

  return { app };
};

createServer().then(({ app }) => app.listen(PORT));
