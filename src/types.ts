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
  route: (path: string, subRouter: any, opts?: DocOptions) => RouterInstance;
  get: (path: string, ...args: any[]) => RouterInstance;
  post: (path: string, ...args: any[]) => RouterInstance;
  put: (path: string, ...args: any[]) => RouterInstance;
  patch: (path: string, ...args: any[]) => RouterInstance;
  delete: (path: string, ...args: any[]) => RouterInstance;
  doc: (config: import('./spec').SpecConfig) => (c: any) => Response;
}
