import { Scalar } from '@scalar/hono-api-reference';
import { z } from 'zod';
import { createRouter, validator } from 'hono-route-docs';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.email().optional(),
  age: z.number().int().min(0).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.email().optional(),
  age: z.number().int().min(0).optional(),
});

const queryFiltersSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

const app = createRouter();

app.get('/health', { summary: 'Health check', tags: ['system'] }, (c: any) =>
  c.json({ status: 'ok' }),
);

app.get(
  '/users',
  {
    summary: 'Lista usuários',
    tags: ['users'],
    responses: {
      200: {
        description: 'Lista de usuários',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
      },
    },
  },
  validator('query', queryFiltersSchema),
  async (c: any) => {
    const { page, limit, search } = c.req.valid('query');

    return c.json({
      page: page ?? '1',
      limit: limit ?? '10',
      search: search ?? '',
      data: [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ],
    });
  },
);

app.get('/users/:id', { summary: 'Busca um usuário por ID', tags: ['users'] }, async (c: any) => {
  const { id } = c.req.param();
  return c.json({ id, name: 'Alice', email: 'alice@example.com' });
});

app.post(
  '/users',
  {
    summary: 'Cria um usuário',
    tags: ['users'],
    responses: {
      201: { description: 'Usuário criado com sucesso' },
    },
  },
  validator('json', createUserSchema),
  async (c: any) => {
    const body = c.req.valid('json');
    return c.json({ success: true, user: { id: '3', ...body } }, 201);
  },
);

app.put(
  '/users/:id',
  {
    summary: 'Atualiza um usuário (completo)',
    tags: ['users'],
  },
  validator('json', createUserSchema),
  async (c: any) => {
    const { id } = c.req.param();
    const body = c.req.valid('json');
    return c.json({ success: true, user: { id, ...body } });
  },
);

app.patch(
  '/users/:id',
  {
    summary: 'Atualiza parcialmente um usuário',
    tags: ['users'],
  },
  validator('json', updateUserSchema),
  async (c: any) => {
    const { id } = c.req.param();
    const body = c.req.valid('json');
    return c.json({ success: true, user: { id, ...body } });
  },
);

app.delete('/users/:id', { summary: 'Remove um usuário', tags: ['users'] }, async (c: any) => {
  const { id } = c.req.param();
  return c.json({ success: true, deletedId: id });
});

const authHeaderSchema = z.object({
  authorization: z.string().min(1),
});

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(10),
  tags: z.array(z.string()).optional(),
});

app.post(
  '/posts',
  {
    summary: 'Cria um post',
    description: 'Requer autenticação via header Authorization',
    tags: ['posts'],
    responses: {
      201: { description: 'Post criado com sucesso' },
    },
  },
  validator('header', authHeaderSchema),
  validator('json', createPostSchema),
  async (c: any) => {
    const headers = c.req.valid('header');
    const body = c.req.valid('json');
    return c.json(
      { success: true, post: { id: '1', ...body, author: headers.authorization } },
      201,
    );
  },
);

app.get('/ping', (c: any) => c.text('pong'));

app.router.get(
  '/openapi.json',
  app.doc({
    title: 'Example API',
    version: '1.0.0',
    description: 'Aplicação de exemplo usando hono-route-docs com validator',
    servers: [{ url: 'http://localhost:3000', description: 'Local' }],
  }),
);

app.router.get(
  '/',
  Scalar({
    url: '/openapi.json',
    theme: 'kepler',
    layout: 'classic',
    showDeveloperTools: 'localhost',
    persistAuth: true,
    operationTitleSource: 'summary',
  }),
);

const port = 3000;

console.log(`OpenAPI spec at http://localhost:${port}/openapi.json`);

export default {
  port,
  fetch: app.router.fetch,
};
