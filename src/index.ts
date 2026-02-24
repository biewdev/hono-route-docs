export { createRouter } from './router';
export { openAPIDoc, generateSpec } from './spec';
export { getRegistry } from './registry';
export { validator, getValidatorMeta, schemaToJsonSchema } from './validator';

export type {
  DocOptions,
  Handler,
  HttpMethod,
  MiddlewareHandler,
  RouterInstance,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIResponse,
} from './types';
export type { SpecConfig } from './spec';
export type { RouteEntry } from './registry';
export type { ValidatorTarget, ValidatorMeta, ValidatorOptions } from './validator';
