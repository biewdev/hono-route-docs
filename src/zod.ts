import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import type { RouteConfig } from '@hono/zod-openapi';
import { RouteRegistry, REGISTRY, getRegistry } from './registry';
import { generateSpec } from './spec';
import type { Handler, HttpMethod } from './types';
import type { SpecConfig } from './spec';

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

export type ZodDocOptions = Partial<
  Pick<
    RouteConfig,
    'tags' | 'summary' | 'description' | 'request' | 'responses' | 'security' | 'deprecated'
  >
>;

export interface ZodRouterInstance {
  router: OpenAPIHono;
  route: (path: string, subRouter: any, opts?: ZodDocOptions) => ZodRouterInstance;
  get: (
    path: string,
    handlerOrOpts: Handler | ZodDocOptions,
    handler?: Handler,
  ) => ZodRouterInstance;
  post: (
    path: string,
    handlerOrOpts: Handler | ZodDocOptions,
    handler?: Handler,
  ) => ZodRouterInstance;
  put: (
    path: string,
    handlerOrOpts: Handler | ZodDocOptions,
    handler?: Handler,
  ) => ZodRouterInstance;
  patch: (
    path: string,
    handlerOrOpts: Handler | ZodDocOptions,
    handler?: Handler,
  ) => ZodRouterInstance;
  delete: (
    path: string,
    handlerOrOpts: Handler | ZodDocOptions,
    handler?: Handler,
  ) => ZodRouterInstance;
  doc: (config: SpecConfig) => (c: any) => Response;
}

export function createRouter(): ZodRouterInstance {
  const router = new OpenAPIHono();
  const registry = new RouteRegistry();
  (router as any)[REGISTRY] = registry;

  function applyDocOptions(subRouter: OpenAPIHono, opts: ZodDocOptions) {
    for (const def of (subRouter as any).openAPIRegistry.definitions) {
      if (def.type === 'route') {
        const hasOwnTags = def.route.tags && def.route.tags.length > 0;
        if (opts.tags && !hasOwnTags) def.route.tags = opts.tags;
        if (opts.summary && !def.route.summary) def.route.summary = opts.summary;
        if (opts.description && !def.route.description) def.route.description = opts.description;
        if (opts.security && !def.route.security) def.route.security = opts.security;
        if (opts.deprecated !== undefined && def.route.deprecated === undefined)
          def.route.deprecated = opts.deprecated;
      }
    }
  }

  function addRoute(
    method: HttpMethod,
    path: string,
    handlerOrOpts: Handler | ZodDocOptions,
    maybeHandler?: Handler,
  ) {
    const hasOptions = typeof handlerOrOpts !== 'function';
    const options: ZodDocOptions = hasOptions ? (handlerOrOpts as ZodDocOptions) : {};
    const handler: Handler = hasOptions ? maybeHandler! : (handlerOrOpts as Handler);

    const routeDef = createRoute({
      method,
      path,
      ...options,
      responses: options.responses ?? {
        200: { description: 'Successful response' },
      },
    });

    router.openapi(routeDef, handler as any);

    registry.add({
      method,
      path,
      tags: options.tags as string[],
      summary: options.summary,
      description: options.description,
      deprecated: options.deprecated,
      security: options.security as any,
      responses: (options.responses ?? {
        200: { description: 'Successful response' },
      }) as any,
    });
  }

  const self = {
    router,
    route(path: string, subRouter: any, opts?: ZodDocOptions) {
      const subRegistry = getRegistry(subRouter);
      if (subRegistry) registry.merge(path, subRegistry, opts as any);
      if (opts && subRouter.openAPIRegistry) applyDocOptions(subRouter, opts);
      router.route(path, subRouter);
      return self;
    },
    doc: (config: any) => zodOpenAPIDoc(router, config),
  } as ZodRouterInstance;

  for (const method of HTTP_METHODS) {
    (self as any)[method] = (
      path: string,
      handlerOrOpts: Handler | ZodDocOptions,
      handler?: Handler,
    ) => {
      addRoute(method, path, handlerOrOpts, handler);
      return self;
    };
  }

  return self;
}

export function zodOpenAPIDoc(router: any, config: SpecConfig) {
  return (c: any) => {
    if (typeof router.getOpenAPIDocument === 'function') {
      const docConfig: Record<string, any> = {
        openapi: '3.1.0',
        info: {
          title: config.title,
          version: config.version,
          ...(config.description ? { description: config.description } : {}),
        },
      };

      if (config.servers) docConfig.servers = config.servers;
      if (config.components) docConfig.components = config.components;
      if (config.security) docConfig.security = config.security;

      const doc = router.getOpenAPIDocument(docConfig);

      if (config.prefix && doc.paths) {
        const prefixedPaths: Record<string, any> = {};
        for (const [path, ops] of Object.entries(doc.paths)) {
          prefixedPaths[config.prefix + path] = ops;
        }
        doc.paths = prefixedPaths;
      }

      return c.json(doc);
    }

    const reg = getRegistry(router);
    if (!reg) {
      return c.json({
        openapi: '3.1.0',
        info: { title: config.title, version: config.version },
        paths: {},
      });
    }
    return c.json(generateSpec(reg, config));
  };
}

export { zodOpenAPIDoc as openAPIDoc };
export { generateSpec } from './spec';
export { getRegistry } from './registry';
export type { SpecConfig } from './spec';
export type { Handler, HttpMethod } from './types';
export type { RouteEntry } from './registry';
