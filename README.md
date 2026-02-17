# hono-route-docs

Fluent router API with automatic OpenAPI 3.1 schema generation for [Hono](https://hono.dev). **Zero dependencies** beyond Hono itself. UI-agnostic — use [Scalar](https://scalar.com), [Swagger UI](https://swagger.io/tools/swagger-ui/), or any OpenAPI viewer.

## Features

- **Pure Hono** — No dependency on `@hono/zod-openapi` or any validation library
- **Fluent Router API** — Chainable `get`, `post`, `put`, `patch`, `delete` methods
- **Auto-generated OpenAPI 3.1 spec** — Built-in registry generates the full spec as JSON
- **UI-agnostic** — Use Scalar, Swagger UI, RapiDoc, or anything else
- **Sub-router support** — Mount sub-routers with inherited tags, security, and doc options
- **Auto path params** — `:id` is automatically added to the OpenAPI spec as `{id}`
- **Schema-agnostic** — Pass raw JSON Schema, or convert from Zod/Valibot/TypeBox/etc.

## Installation

```bash
npm install hono-route-docs
# or
bun add hono-route-docs
# or
pnpm add hono-route-docs
```

## Quick Start

```ts
import { Hono } from 'hono';
import { createRouter } from 'hono-route-docs';

const app = new Hono();
const { router, get, route, doc } = createRouter();

get('/health', { summary: 'Health Check' }, c => {
  return c.json({ status: 'ok' });
});

app.route('/api', router);

app.get(
  '/openapi.json',
  doc({
    title: 'My API',
    version: '1.0.0',
    prefix: '/api',
  }),
);

import { Scalar } from '@scalar/hono-api-reference';

app.get('/docs', Scalar({ url: '/openapi.json' }));

export default { port: 3000, fetch: app.fetch };
```

## API

### `createRouter()`

Creates a fluent router instance. Returns:

| Property   | Description                                         |
| ---------- | --------------------------------------------------- |
| `router`   | The underlying `Hono` instance                      |
| `route()`  | Mount a sub-router with optional doc options        |
| `get()`    | Register a GET route                                |
| `post()`   | Register a POST route                               |
| `put()`    | Register a PUT route                                |
| `patch()`  | Register a PATCH route                              |
| `delete()` | Register a DELETE route                             |
| `doc()`    | Returns a handler that serves the OpenAPI JSON spec |

All HTTP methods accept:

```ts
method(path, handler);
method(path, options, handler);
```

### `DocOptions`

Uses raw OpenAPI field names — no dependency on any validation library:

```ts
type DocOptions = {
  tags?: string[];
  summary?: string;
  description?: string;
  deprecated?: boolean;
  security?: Record<string, string[]>[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
};
```

### `openAPIDoc(router, config)`

Standalone function to create a handler that serves the spec:

```ts
import { openAPIDoc } from 'hono-route-docs';

app.get(
  '/openapi.json',
  openAPIDoc(router, {
    title: 'My API',
    version: '1.0.0',
    prefix: '/api',
    description: 'Optional description',
    servers: [{ url: 'https://api.example.com' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' },
      },
    },
  }),
);
```

### `generateSpec(registry, config)`

Low-level function to generate the spec object (useful for testing or custom endpoints):

```ts
import { generateSpec, getRegistry } from 'hono-route-docs';

const spec = generateSpec(getRegistry(router)!, config);
```

## Sub-Routers

```ts
import { createRouter } from 'hono-route-docs';

const { router, get, post } = createRouter();

get('/', { summary: 'List users' }, c => c.json([]));

post(
  '/',
  {
    summary: 'Create user',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
            },
            required: ['name', 'email'],
          },
        },
      },
    },
    responses: { 201: { description: 'User created' } },
  },
  c => c.json({ id: 1 }, 201),
);

get('/:id', { summary: 'Get user' }, c => c.json({ id: c.req.param('id') }));

export default router;
```

```ts
import { createRouter } from 'hono-route-docs';
import usersRouter from './users/routes';

const { router, route } = createRouter();

route('/users', usersRouter, { tags: ['Users'] });

export default router;
```

## Using with Zod / Valibot / TypeBox

The base entry point accepts raw JSON Schema. Use any converter you like:

```ts
import { z } from 'zod';

const UserSchema = z.object({ name: z.string(), email: z.string().email() });

post(
  '/users',
  {
    requestBody: {
      content: {
        'application/json': { schema: z.toJSONSchema(UserSchema) },
      },
    },
  },
  handler,
);
```

## Adapter: Zod (`/zod`)

Uses `@hono/zod-openapi` under the hood. Accepts Zod schemas directly in `request` and `responses`.

```bash
npm install @hono/zod-openapi zod
```

```ts
import { createRouter, openAPIDoc } from 'hono-route-docs/zod';
import { z } from 'zod';

const { router, get, post } = createRouter();

get(
  '/hello',
  {
    tags: ['Hello'],
    summary: 'Say hello',
    request: {
      query: z.object({
        name: z.string().optional(),
        page: z.coerce.number().default(1),
      }),
    },
    responses: {
      200: { description: 'Greeting' },
    },
  },
  c => c.json({ message: 'Hello!' }),
);
```

## Adapter: Standard Schema (`/standard`)

Uses [`hono-openapi`](https://github.com/rhinobase/hono-openapi) under the hood. Works with **any** [Standard Schema](https://standardschema.dev/)–compliant validation library: Zod, Valibot, ArkType, TypeBox, Effect, etc.

```bash
npm install hono-openapi @hono/standard-validator
```

```ts
import { createRouter, openAPIDoc, resolver } from 'hono-route-docs/standard';
import * as v from 'valibot'; // or zod, arktype, typebox, etc.

const { router, get } = createRouter();

get(
  '/hello',
  {
    tags: ['Hello'],
    summary: 'Say hello',
    request: {
      query: v.object({ name: v.optional(v.string()) }),
    },
    responses: {
      200: {
        description: 'Greeting',
        content: {
          'application/json': { schema: resolver(v.string()) },
        },
      },
    },
  },
  c => {
    const { name } = c.req.valid('query');
    return c.text(`Hello ${name ?? 'World'}!`);
  },
);

const app = new Hono();

app.route('/api', router);
app.get(
  '/openapi.json',
  openAPIDoc(router, {
    title: 'My API',
    version: '1.0.0',
    prefix: '/api',
  }),
);
```

## Entry points summary

| Entry point                | Install                                   | Schemas                                                      |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| `hono-route-docs`          | `hono`                                    | Raw JSON Schema                                              |
| `hono-route-docs/zod`      | `+ @hono/zod-openapi zod`                 | Zod schemas                                                  |
| `hono-route-docs/standard` | `+ hono-openapi @hono/standard-validator` | Any Standard Schema (Zod, Valibot, ArkType, TypeBox, Effect) |

## License

MIT
