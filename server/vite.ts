
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

// Cache for file paths to avoid repeated path resolutions
const paths = {
  clientTemplate: path.resolve(import.meta.dirname, "..", "client", "index.html"),
  distPath: path.resolve(import.meta.dirname, "public"),
  distIndex: path.resolve(import.meta.dirname, "public", "index.html")
};

// Pre-formatted time options for better performance
const timeOptions: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", timeOptions);
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  // Cache the template if it exists and hasn't changed
  let templateCache: { content: string; mtime: number } | null = null;

  app.use("*", async (req, res, next) => {
    try {
      // Check if template needs to be reloaded
      const stats = await fs.promises.stat(paths.clientTemplate);
      const mtime = stats.mtimeMs;

      let template: string;
      if (!templateCache || templateCache.mtime !== mtime) {
        template = await fs.promises.readFile(paths.clientTemplate, "utf-8");
        templateCache = { content: template, mtime };
      } else {
        template = templateCache.content;
      }

      // Generate unique version for cache busting
      const version = nanoid();
      const updatedTemplate = template.replace(
        'src="/src/main.tsx"',
        `src="/src/main.tsx?v=${version}"`
      );

      const page = await vite.transformIndexHtml(req.originalUrl, updatedTemplate);
      res.status(200).set({ "Content-Type": "text/html" }).send(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Check for dist directory once at startup
  if (!fs.existsSync(paths.distPath)) {
    throw new Error(
      `Could not find the build directory: ${paths.distPath}, make sure to build the client first`
    );
  }

  // Serve static files with caching headers
  app.use(
    express.static(paths.distPath, {
      maxAge: "1d",
      etag: true,
      lastModified: true,
      index: false, // We'll handle index.html ourselves
    })
  );

  // Serve index.html for all unmatched routes
  app.use("*", (_req, res) => {
    res.sendFile(paths.distIndex);
  });
}
