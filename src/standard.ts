import { Hono } from 'hono';
import { describeRoute, resolver, validator, generateSpecs } from 'hono-openapi';
import { RouteRegistry, REGISTRY, getRegistry } from './registry';
import type { Handler, HttpMethod } from './types';
import type { SpecConfig } from './spec';

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

export { resolver } from 'hono-openapi';

export type StandardDocOptions = {
  tags?: string[];
  summary?: string;
  description?: string;
  deprecated?: boolean;
  security?: Record<string, string[]>[];
  request?: {
    query?: any;
    params?: any;
    json?: any;
    form?: any;
    headers?: any;
  };
  responses?: Record<string, any>;
};

export interface StandardRouterInstance {
  router: Hono;
  route: (path: string, subRouter: any, opts?: StandardDocOptions) => StandardRouterInstance;
  get: (
    path: string,
    handlerOrOpts: Handler | StandardDocOptions,
    handler?: Handler,
  ) => StandardRouterInstance;
  post: (
    path: string,
    handlerOrOpts: Handler | StandardDocOptions,
    handler?: Handler,
  ) => StandardRouterInstance;
  put: (
    path: string,
    handlerOrOpts: Handler | StandardDocOptions,
    handler?: Handler,
  ) => StandardRouterInstance;
  patch: (
    path: string,
    handlerOrOpts: Handler | StandardDocOptions,
    handler?: Handler,
  ) => StandardRouterInstance;
  delete: (
    path: string,
    handlerOrOpts: Handler | StandardDocOptions,
    handler?: Handler,
  ) => StandardRouterInstance;
  doc: (config: SpecConfig) => (c: any) => Promise<Response>;
}

export function createRouter(): StandardRouterInstance {
  const router = new Hono();
  const registry = new RouteRegistry();
  (router as any)[REGISTRY] = registry;

  function addRoute(
    method: HttpMethod,
    path: string,
    handlerOrOpts: Handler | StandardDocOptions,
    maybeHandler?: Handler,
  ) {
    const hasOptions = typeof handlerOrOpts !== 'function';
    const options: StandardDocOptions = hasOptions ? (handlerOrOpts as StandardDocOptions) : {};
    const handler: Handler = hasOptions ? maybeHandler! : (handlerOrOpts as Handler);

    const middlewares: any[] = [];

    const routeDesc: Record<string, any> = {};
    if (options.tags) routeDesc.tags = options.tags;
    if (options.summary) routeDesc.summary = options.summary;
    if (options.description) routeDesc.description = options.description;
    if (options.deprecated) routeDesc.deprecated = options.deprecated;
    if (options.security) routeDesc.security = options.security;
    if (options.responses) routeDesc.responses = options.responses;

    middlewares.push(describeRoute(routeDesc));

    if (options.request?.query) middlewares.push(validator('query', options.request.query));
    if (options.request?.params) middlewares.push(validator('param', options.request.params));
    if (options.request?.json) middlewares.push(validator('json', options.request.json));
    if (options.request?.form) middlewares.push(validator('form', options.request.form));
    if (options.request?.headers) middlewares.push(validator('header', options.request.headers));

    middlewares.push(handler);

    (router as any)[method](path, ...middlewares);

    registry.add({
      method,
      path,
      tags: options.tags,
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
    route(path: string, subRouter: any, opts?: StandardDocOptions) {
      const subRegistry = getRegistry(subRouter);
      if (subRegistry) registry.merge(path, subRegistry, opts as any);
      router.route(path, subRouter);
      return self;
    },
    doc: (config: any) => standardOpenAPIDoc(router, config),
  } as StandardRouterInstance;

  for (const method of HTTP_METHODS) {
    (self as any)[method] = (
      path: string,
      handlerOrOpts: Handler | StandardDocOptions,
      handler?: Handler,
    ) => {
      addRoute(method, path, handlerOrOpts, handler);
      return self;
    };
  }

  return self;
}

export function standardOpenAPIDoc(router: any, config: SpecConfig) {
  let cachedSpecs: any = null;

  return async (c: any) => {
    if (cachedSpecs) return c.json(cachedSpecs);

    const specs = await generateSpecs(router, {
      documentation: {
        info: {
          title: config.title,
          version: config.version,
          ...(config.description ? { description: config.description } : {}),
        },
        ...(config.servers ? { servers: config.servers } : {}),
        ...(config.components ? { components: config.components } : {}),
        ...(config.security ? { security: config.security } : {}),
      },
    });

    if (config.prefix && specs.paths) {
      const prefixedPaths: Record<string, any> = {};
      for (const [path, ops] of Object.entries(specs.paths)) {
        prefixedPaths[config.prefix + path] = ops;
      }
      specs.paths = prefixedPaths as any;
    }

    cachedSpecs = specs;
    return c.json(specs);
  };
}

export { standardOpenAPIDoc as openAPIDoc };
export { generateSpec } from './spec';
export { getRegistry } from './registry';
export type { SpecConfig } from './spec';
export type { Handler, HttpMethod } from './types';
export type { RouteEntry } from './registry';
