import { Hono } from 'hono';
import { RouteRegistry, REGISTRY, getRegistry } from './registry';
import { openAPIDoc } from './spec';
import { getValidatorMeta, type ValidatorMeta } from './validator';
import type { DocOptions, Handler, HttpMethod, RouterInstance } from './types';

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

const PARAM_TARGETS: Readonly<Record<string, 'query' | 'path' | 'header' | 'cookie' | undefined>> =
  {
    query: 'query',
    param: 'path',
    header: 'header',
    cookie: 'cookie',
  };

const VALIDATION_ERROR_RESPONSE: Readonly<Record<string, any>> = {
  description: 'Validation error',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [false] },
          errors: {},
        },
      },
    },
  },
};

function parseRouteArgs(args: any[]): {
  options: DocOptions;
  middlewares: any[];
  handler: Handler;
} {
  const hasOpts = args.length > 0 && typeof args[0] !== 'function';
  return {
    options: hasOpts ? args[0] : {},
    middlewares: args.slice(hasOpts ? 1 : 0, -1),
    handler: args[args.length - 1],
  };
}

function hasRequiredFields(schema: Record<string, any>): boolean {
  return Array.isArray(schema.required) && schema.required.length > 0;
}

function buildRequestBody(metas: ValidatorMeta[]): DocOptions['requestBody'] | undefined {
  const jsonMeta = metas.find(m => m.target === 'json');
  if (jsonMeta?.jsonSchema) {
    return {
      required: hasRequiredFields(jsonMeta.jsonSchema),
      content: { 'application/json': { schema: jsonMeta.jsonSchema } },
    };
  }

  const formMeta = metas.find(m => m.target === 'form');
  if (formMeta?.jsonSchema) {
    return {
      required: hasRequiredFields(formMeta.jsonSchema),
      content: {
        'application/x-www-form-urlencoded': { schema: formMeta.jsonSchema },
      },
    };
  }

  return undefined;
}

function buildParameters(metas: ValidatorMeta[]): DocOptions['parameters'] | undefined {
  const params: NonNullable<DocOptions['parameters']> = [];

  for (const meta of metas) {
    const inValue = PARAM_TARGETS[meta.target];
    if (!inValue) continue;

    const js = meta.jsonSchema;
    if (!js?.properties) continue;

    const req = new Set<string>(js.required ?? []);
    for (const [name, propSchema] of Object.entries<any>(js.properties)) {
      params.push({
        name,
        in: inValue,
        required: inValue === 'path' || req.has(name),
        schema: propSchema,
      });
    }
  }

  return params.length > 0 ? params : undefined;
}

export function createRouter(): RouterInstance {
  const router = new Hono();
  const registry = new RouteRegistry();
  (router as any)[REGISTRY] = registry;

  function addRoute(method: HttpMethod, path: string, ...args: any[]) {
    const { options, middlewares, handler } = parseRouteArgs(args);

    const validatorMetas = middlewares
      .map(m => getValidatorMeta(m))
      .filter((m): m is ValidatorMeta => m != null);

    if (validatorMetas.length > 0) {
      if (!options.requestBody) {
        const autoBody = buildRequestBody(validatorMetas);
        if (autoBody) options.requestBody = autoBody;
      }
      if (!options.parameters) {
        const autoParams = buildParameters(validatorMetas);
        if (autoParams) options.parameters = autoParams;
      }
    }

    const responses: Record<string, any> = options.responses ?? {
      200: { description: 'Successful response' },
    };

    if (validatorMetas.length > 0 && !responses['400']) {
      responses['400'] = VALIDATION_ERROR_RESPONSE;
    }

    (router as any)[method](path, ...middlewares, handler);

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
      responses,
    });
  }

  const self = {
    router,
    route(path: string, subRouter: any, opts?: DocOptions) {
      const subRegistry = getRegistry(subRouter);
      if (subRegistry) registry.merge(path, subRegistry, opts);
      router.route(path, subRouter);
      return self;
    },
    doc: (config: any) => openAPIDoc(router, config),
  } as RouterInstance;

  for (const method of HTTP_METHODS) {
    (self as any)[method] = (path: string, ...args: any[]) => {
      addRoute(method, path, ...args);
      return self;
    };
  }

  return self;
}
