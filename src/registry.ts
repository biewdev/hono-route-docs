import type { DocOptions, HttpMethod } from './types';

export const REGISTRY = Symbol.for('hono-openapi-registry');

export interface RouteEntry {
  method: HttpMethod;
  path: string;
  tags?: string[];
  summary?: string;
  description?: string;
  deprecated?: boolean;
  security?: Record<string, string[]>[];
  parameters?: any[];
  requestBody?: any;
  responses?: Record<string, any>;
}

export class RouteRegistry {
  readonly entries: RouteEntry[] = [];

  add(entry: RouteEntry): void {
    this.entries.push(entry);
  }

  merge(prefix: string, other: RouteRegistry, opts?: DocOptions): void {
    for (const entry of other.entries) {
      const merged: RouteEntry = {
        ...entry,
        path: prefix + (entry.path === '/' ? '' : entry.path),
      };

      if (opts) {
        const hasOwnTags = entry.tags && entry.tags.length > 0;

        if (opts.tags && !hasOwnTags) merged.tags = opts.tags;
        if (opts.summary && !entry.summary) merged.summary = opts.summary;
        if (opts.description && !entry.description) merged.description = opts.description;
        if (opts.security && !entry.security) merged.security = opts.security;
        if (opts.deprecated !== undefined && entry.deprecated === undefined)
          merged.deprecated = opts.deprecated;
      }

      this.entries.push(merged);
    }
  }
}

export function getRegistry(router: any): RouteRegistry | undefined {
  return router?.[REGISTRY];
}
