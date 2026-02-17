export { createRouter } from './router';
export { openAPIDoc, generateSpec } from './spec';
export { getRegistry } from './registry';

export type {
  DocOptions,
  Handler,
  HttpMethod,
  RouterInstance,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIResponse,
} from './types';
export type { SpecConfig } from './spec';
export type { RouteEntry } from './registry';
