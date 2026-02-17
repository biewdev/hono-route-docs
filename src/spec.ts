import { RouteRegistry, getRegistry } from './registry';

export interface SpecConfig {
  title: string;
  version: string;
  description?: string;
  prefix?: string;
  servers?: { url: string; description?: string }[];
  components?: Record<string, any>;
  security?: Record<string, string[]>[];
}

function honoPathToOpenAPI(path: string): string {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
}

function extractPathParams(path: string): any[] {
  const params: any[] = [];
  const regex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(path)) !== null) {
    params.push({
      name: match[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
  }
  return params;
}

export function generateSpec(registry: RouteRegistry, config: SpecConfig): Record<string, any> {
  const paths: Record<string, any> = {};
  const prefix = config.prefix ?? '';

  for (const entry of registry.entries) {
    const rawPath = prefix + entry.path;
    const fullPath = honoPathToOpenAPI(rawPath);

    if (!paths[fullPath]) paths[fullPath] = {};

    const operation: Record<string, any> = {};

    if (entry.tags && entry.tags.length > 0) operation.tags = entry.tags;
    if (entry.summary) operation.summary = entry.summary;
    if (entry.description) operation.description = entry.description;
    if (entry.deprecated) operation.deprecated = entry.deprecated;
    if (entry.security) operation.security = entry.security;
    if (entry.requestBody) operation.requestBody = entry.requestBody;

    const autoParams = extractPathParams(rawPath);
    const userParams = entry.parameters ?? [];
    const autoParamNames = new Set(userParams.map((p: any) => p.name));
    const mergedParams = [...userParams, ...autoParams.filter(p => !autoParamNames.has(p.name))];
    if (mergedParams.length > 0) operation.parameters = mergedParams;

    operation.responses = entry.responses;

    paths[fullPath][entry.method] = operation;
  }

  const spec: Record<string, any> = {
    openapi: '3.1.0',
    info: {
      title: config.title,
      version: config.version,
    },
    paths,
  };

  if (config.description) spec.info.description = config.description;
  if (config.servers) spec.servers = config.servers;
  if (config.components) spec.components = config.components;
  if (config.security) spec.security = config.security;

  return spec;
}

export function openAPIDoc(router: any, config: SpecConfig) {
  const registry = getRegistry(router);
  return (c: any) => {
    if (!registry) {
      return c.json({
        openapi: '3.1.0',
        info: { title: config.title, version: config.version },
        paths: {},
      });
    }
    return c.json(generateSpec(registry, config));
  };
}
