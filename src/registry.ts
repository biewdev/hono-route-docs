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
      const path = prefix + (entry.path === '/' ? '' : entry.path);

      if (!opts) {
        this.entries.push({ ...entry, path });
        continue;
      }

      const hasOwnTags = entry.tags && entry.tags.length > 0;
      this.entries.push({
        ...entry,
        path,
        tags: opts.tags && !hasOwnTags ? opts.tags : entry.tags,
        summary: opts.summary && !entry.summary ? opts.summary : entry.summary,
        description: opts.description && !entry.description ? opts.description : entry.description,
        security: opts.security && !entry.security ? opts.security : entry.security,
        deprecated:
          opts.deprecated !== undefined && entry.deprecated === undefined
            ? opts.deprecated
            : entry.deprecated,
      });
    }
  }
}

export function getRegistry(router: any): RouteRegistry | undefined {
  return router?.[REGISTRY];
}
