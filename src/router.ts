import { Hono } from 'hono';
import { RouteRegistry, REGISTRY, getRegistry } from './registry';
import { openAPIDoc } from './spec';
import type { DocOptions, Handler, HttpMethod, RouterInstance } from './types';

export function createRouter(): RouterInstance {
  const router = new Hono();
  const registry = new RouteRegistry();
  (router as any)[REGISTRY] = registry;

  function addRoute(
    method: HttpMethod,
    path: string,
    handlerOrOpts: Handler | DocOptions,
    maybeHandler?: Handler,
  ) {
    const hasOptions = typeof handlerOrOpts !== 'function';
    const options: DocOptions = hasOptions ? (handlerOrOpts as DocOptions) : {};
    const handler: Handler = hasOptions ? maybeHandler! : (handlerOrOpts as Handler);

    router[method](path, handler as any);

    registry.add({
      method,
      path,
      tags: options.tags,
      summary: options.summary,
      description: options.description,
      deprecated: options.deprecated,
      security: options.security,
      parameters: options.parameters,
      requestBody: options.requestBody,
      responses: options.responses ?? {
        200: { description: 'Successful response' },
      },
    });
  }

  const self: RouterInstance = {
    router,
    route: (path: string, subRouter: any, opts?: DocOptions) => {
      const subRegistry = getRegistry(subRouter);
      if (subRegistry) {
        registry.merge(path, subRegistry, opts);
      }
      router.route(path, subRouter);
      return self;
    },
    get: (path: string, handlerOrOpts: Handler | DocOptions, handler?: Handler) => {
      addRoute('get', path, handlerOrOpts, handler);
      return self;
    },
    post: (path: string, handlerOrOpts: Handler | DocOptions, handler?: Handler) => {
      addRoute('post', path, handlerOrOpts, handler);
      return self;
    },
    put: (path: string, handlerOrOpts: Handler | DocOptions, handler?: Handler) => {
      addRoute('put', path, handlerOrOpts, handler);
      return self;
    },
    patch: (path: string, handlerOrOpts: Handler | DocOptions, handler?: Handler) => {
      addRoute('patch', path, handlerOrOpts, handler);
      return self;
    },
    delete: (path: string, handlerOrOpts: Handler | DocOptions, handler?: Handler) => {
      addRoute('delete', path, handlerOrOpts, handler);
      return self;
    },
    doc: config => openAPIDoc(router, config),
  };

  return self;
}
