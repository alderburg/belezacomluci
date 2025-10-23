import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  // Log function disabled to reduce console output
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: false,
    ws: false,
    allowedHosts: true as const,
  };

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
    server: serverOptions,
    appType: "custom",
    plugins: [
      ...(viteConfig.plugins || []),
      {
        name: 'disable-hmr-client',
        enforce: 'post',
        transformIndexHtml: {
          order: 'post',
          handler(html) {
            // Remove completamente qualquer script do Vite client
            let transformed = html.replace(/<script[^>]*\/@vite\/client[^>]*><\/script>/g, '');
            // Remove também imports inline do tipo @vite/client
            transformed = transformed.replace(/import\s+.*?from\s+['"]@vite\/client['"]/g, '');
            return transformed;
          },
        },
        transform(code, id) {
          // Interceptar e remover qualquer importação do @vite/client
          if (code.includes('@vite/client')) {
            return code.replace(/import\s+.*?from\s+['"]@vite\/client['"];?/g, '');
          }
          return null;
        },
      },
    ],
  });

  // Serve attached_assets folder
  app.use('/attached_assets', express.static(path.resolve(__dirname, '..', 'attached_assets')));

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip Vite handling only for API routes and static files
    // All other routes should return index.html for SPA routing
    if (url.startsWith('/api') || url.startsWith('/uploads') || url.startsWith('/attached_assets')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      let page = await vite.transformIndexHtml(url, template);
      
      // Remover qualquer script do Vite client que possa ter sido injetado
      page = page.replace(/<script[^>]*type="module"[^>]*>[\s\S]*?@vite\/client[\s\S]*?<\/script>/gi, '');
      page = page.replace(/import\s+["']@vite\/client["']/g, '');
      
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files with proper cache headers
  app.use(express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      // Don't cache HTML files
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
