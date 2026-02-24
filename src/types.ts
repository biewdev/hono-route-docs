export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: any;
  [key: string]: any;
}

export interface OpenAPIRequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, { schema: any; [key: string]: any }>;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<string, { schema: any; [key: string]: any }>;
  headers?: Record<string, any>;
  [key: string]: any;
}

export type DocOptions = {
  tags?: string[];
  summary?: string;
  description?: string;
  deprecated?: boolean;
  security?: Record<string, string[]>[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
};

export type Handler = (c: any) => Response | Promise<Response>;
export type MiddlewareHandler = (c: any, next: () => Promise<void>) => any;

export interface RouterInstance {
  router: any;
  route(path: string, subRouter: any, opts?: DocOptions): RouterInstance;

  get(path: string, handler: Handler): RouterInstance;
  get(path: string, options: DocOptions, handler: Handler): RouterInstance;
  get(path: string, options: DocOptions, m1: MiddlewareHandler, handler: Handler): RouterInstance;
  get(
    path: string,
    options: DocOptions,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  get(
    path: string,
    options: DocOptions,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    m3: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  get(path: string, m1: MiddlewareHandler, handler: Handler): RouterInstance;
  get(path: string, m1: MiddlewareHandler, m2: MiddlewareHandler, handler: Handler): RouterInstance;
  get(
    path: string,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    m3: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  get(path: string, ...args: (DocOptions | MiddlewareHandler | Handler)[]): RouterInstance;

  post(path: string, handler: Handler): RouterInstance;
  post(path: string, options: DocOptions, handler: Handler): RouterInstance;
  post(path: string, options: DocOptions, m1: MiddlewareHandler, handler: Handler): RouterInstance;
  post(
    path: string,
    options: DocOptions,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  post(
    path: string,
    options: DocOptions,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    m3: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  post(path: string, m1: MiddlewareHandler, handler: Handler): RouterInstance;
  post(
    path: string,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  post(
    path: string,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    m3: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  post(path: string, ...args: (DocOptions | MiddlewareHandler | Handler)[]): RouterInstance;

  put(path: string, handler: Handler): RouterInstance;
  put(path: string, options: DocOptions, handler: Handler): RouterInstance;
  put(path: string, options: DocOptions, m1: MiddlewareHandler, handler: Handler): RouterInstance;
  put(
    path: string,
    options: DocOptions,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  put(
    path: string,
    options: DocOptions,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    m3: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  put(path: string, m1: MiddlewareHandler, handler: Handler): RouterInstance;
  put(path: string, m1: MiddlewareHandler, m2: MiddlewareHandler, handler: Handler): RouterInstance;
  put(
    path: string,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    m3: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  put(path: string, ...args: (DocOptions | MiddlewareHandler | Handler)[]): RouterInstance;

  patch(path: string, handler: Handler): RouterInstance;
  patch(path: string, options: DocOptions, handler: Handler): RouterInstance;
  patch(path: string, options: DocOptions, m1: MiddlewareHandler, handler: Handler): RouterInstance;
  patch(
    path: string,
    options: DocOptions,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  patch(
    path: string,
    options: DocOptions,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    m3: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  patch(path: string, m1: MiddlewareHandler, handler: Handler): RouterInstance;
  patch(
    path: string,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  patch(
    path: string,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    m3: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  patch(path: string, ...args: (DocOptions | MiddlewareHandler | Handler)[]): RouterInstance;

  delete(path: string, handler: Handler): RouterInstance;
  delete(path: string, options: DocOptions, handler: Handler): RouterInstance;
  delete(
    path: string,
    options: DocOptions,
    m1: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  delete(
    path: string,
    options: DocOptions,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  delete(
    path: string,
    options: DocOptions,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    m3: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  delete(path: string, m1: MiddlewareHandler, handler: Handler): RouterInstance;
  delete(
    path: string,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  delete(
    path: string,
    m1: MiddlewareHandler,
    m2: MiddlewareHandler,
    m3: MiddlewareHandler,
    handler: Handler,
  ): RouterInstance;
  delete(path: string, ...args: (DocOptions | MiddlewareHandler | Handler)[]): RouterInstance;

  doc(config: import('./spec').SpecConfig): (c: any) => Response;
}
