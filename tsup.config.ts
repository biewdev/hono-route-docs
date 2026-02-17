import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/zod.ts', 'src/standard.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
  treeshake: true,
  external: ['hono', '@hono/zod-openapi', 'zod', 'hono-openapi', '@hono/standard-validator'],
});
