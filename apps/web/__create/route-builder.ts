/// <reference types="vite/client" />
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import type { Handler } from 'hono/types';
import updatedFetch from '../src/__create/fetch';

const API_BASENAME = '/api';
const api = new Hono();

type RouteMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type RouteHandler = (
  request: Request,
  ctx: { params: Record<string, string> }
) => Promise<Response> | Response;
type RouteModule = Partial<Record<RouteMethod, RouteHandler>>;
type RouteModuleMap = Record<string, RouteModule>;

// Get current directory
const __dirname = join(fileURLToPath(new URL('.', import.meta.url)), '../src/app/api');
if (globalThis.fetch) {
  globalThis.fetch = updatedFetch;
}

const productionRouteModules: RouteModuleMap | null = import.meta.env.DEV
  ? null
  : (import.meta.glob('../src/app/api/**/route.js', {
      eager: true,
    }) as RouteModuleMap);

function toAbsolutePath(routeFile: string): string {
  if (routeFile.startsWith('/')) {
    return routeFile;
  }
  if (routeFile.startsWith(__dirname)) {
    return routeFile;
  }
  return fileURLToPath(new URL(routeFile, import.meta.url));
}

// Recursively find all route.js files
async function findRouteFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir);
  let routes: string[] = [];

  for (const file of files) {
    try {
      const filePath = join(dir, file);
      const statResult = await stat(filePath);

      if (statResult.isDirectory()) {
        routes = routes.concat(await findRouteFiles(filePath));
      } else if (file === 'route.js') {
        // Handle root route.js specially
        if (filePath === join(__dirname, 'route.js')) {
          routes.unshift(filePath); // Add to beginning of array
        } else {
          routes.push(filePath);
        }
      }
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  }

  return routes;
}

// Helper function to transform file path to Hono route path
function getHonoPath(routeFile: string): { name: string; pattern: string }[] {
  const relativePath = routeFile.replace(__dirname, '');
  const parts = relativePath.split('/').filter(Boolean);
  const routeParts = parts.slice(0, -1); // Remove 'route.js'
  if (routeParts.length === 0) {
    return [{ name: 'root', pattern: '' }];
  }
  const transformedParts = routeParts.map((segment) => {
    const match = segment.match(/^\[(\.{3})?([^\]]+)\]$/);
    if (match) {
      const [_, dots, param] = match;
      return dots === '...'
        ? { name: param, pattern: `:${param}{.+}` }
        : { name: param, pattern: `:${param}` };
    }
    return { name: segment, pattern: segment };
  });
  return transformedParts;
}

// Import and register all routes
async function registerRoutes() {
  let routeFiles: string[] = [];
  if (import.meta.env.DEV) {
    routeFiles = (
      await findRouteFiles(__dirname).catch((error) => {
        console.error('Error finding route files:', error);
        return [];
      })
    )
      .slice()
      .sort((a, b) => b.length - a.length);
  } else if (productionRouteModules) {
    routeFiles = Object.keys(productionRouteModules).sort((a, b) => b.length - a.length);
  }

  api.routes = [];

  for (const routeFile of routeFiles) {
    try {
      const route =
        !import.meta.env.DEV && productionRouteModules
          ? (productionRouteModules[routeFile] as RouteModule)
          : await import(/* @vite-ignore */ `${routeFile}?update=${Date.now()}`);

      const methods: RouteMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      for (const method of methods) {
        try {
          const handlerFn = route[method];
          if (!handlerFn) continue;

          const absoluteRoutePath = toAbsolutePath(routeFile);
          const parts = getHonoPath(absoluteRoutePath);
          const honoPath = `/${parts.map(({ pattern }) => pattern).join('/')}`;
          const handler: Handler = async (c) => {
            const params = c.req.param();
            if (import.meta.env.DEV) {
              const updatedRoute = await import(
                /* @vite-ignore */ `${routeFile}?update=${Date.now()}`
              );
              return await updatedRoute[method]!(c.req.raw, { params });
            }
            return await handlerFn(c.req.raw, { params });
          };
          switch (method) {
            case 'GET':
              api.get(honoPath, handler);
              break;
            case 'POST':
              api.post(honoPath, handler);
              break;
            case 'PUT':
              api.put(honoPath, handler);
              break;
            case 'DELETE':
              api.delete(honoPath, handler);
              break;
            case 'PATCH':
              api.patch(honoPath, handler);
              break;
            default:
              console.warn(`Unsupported method: ${method}`);
              break;
          }
        } catch (error) {
          console.error(`Error registering route ${routeFile} for method ${method}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error importing route file ${routeFile}:`, error);
    }
  }
}

// Initial route registration
await registerRoutes();

// Hot reload routes in development
if (import.meta.env.DEV) {
  import.meta.glob('../src/app/api/**/route.js', {
    eager: true,
  });
  if (import.meta.hot) {
    import.meta.hot.accept((newSelf) => {
      registerRoutes().catch((err) => {
        console.error('Error reloading routes:', err);
      });
    });
  }
}

export { api, API_BASENAME };
