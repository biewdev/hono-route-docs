import { validator as honoValidator } from 'hono/validator';

export const VALIDATOR_META = Symbol.for('hono-route-docs-validator');

const schemaCache = new WeakMap<object, Record<string, any> | undefined>();

export type ValidatorTarget = 'json' | 'form' | 'query' | 'param' | 'header' | 'cookie';

export interface ValidatorMeta {
  target: ValidatorTarget;
  schema: any;
  jsonSchema?: Record<string, any>;
}

export interface ValidatorOptions {
  hook?: (result: { success: boolean; data?: any; error?: any }, c: any) => any;
}

export function validator<T extends ValidatorTarget>(
  target: T,
  schemaOrFn: any,
  options?: ValidatorOptions,
) {
  let middleware: any;
  let jsonSchema: Record<string, any> | undefined;

  if (typeof schemaOrFn === 'function') {
    middleware = honoValidator(target, schemaOrFn);
  } else {
    middleware = honoValidator(target, async (value: any, c: any) => {
      if (
        typeof schemaOrFn.safeParse === 'function' ||
        typeof schemaOrFn.safeParseAsync === 'function'
      ) {
        const result =
          typeof schemaOrFn.safeParseAsync === 'function'
            ? await schemaOrFn.safeParseAsync(value)
            : schemaOrFn.safeParse(value);

        if (options?.hook) {
          const hookResult = options.hook(result, c);
          if (hookResult instanceof Response) return hookResult;
        }

        if (!result.success) {
          return c.json({ success: false, errors: result.error?.issues ?? result.error }, 400);
        }
        return result.data;
      }

      if (typeof schemaOrFn.parse === 'function') {
        try {
          const data = schemaOrFn.parse(value);
          if (options?.hook) {
            const hookResult = options.hook({ success: true, data }, c);
            if (hookResult instanceof Response) return hookResult;
          }
          return data;
        } catch (error: any) {
          if (options?.hook) {
            const hookResult = options.hook({ success: false, error }, c);
            if (hookResult instanceof Response) return hookResult;
          }
          return c.json({ success: false, errors: error.issues ?? error.message }, 400);
        }
      }

      return value;
    });

    jsonSchema = schemaToJsonSchema(schemaOrFn);
  }

  (middleware as any)[VALIDATOR_META] = {
    target,
    schema: schemaOrFn,
    jsonSchema,
  } satisfies ValidatorMeta;

  return middleware;
}

export function getValidatorMeta(fn: any): ValidatorMeta | undefined {
  return fn?.[VALIDATOR_META];
}

export function schemaToJsonSchema(schema: any): Record<string, any> | undefined {
  if (!schema || typeof schema !== 'object') return undefined;

  if (schemaCache.has(schema)) return schemaCache.get(schema);

  let result: Record<string, any> | undefined;

  if (schema.type && typeof schema.type === 'string' && !schema._def && !schema._zod) {
    result = schema;
  } else {
    try {
      if (schema._zod?.def?.type) result = convertZod4(schema);
      else if (schema._def?.typeName) result = convertZod3(schema);
    } catch {}
  }

  schemaCache.set(schema, result);
  return result;
}

function applyStringChecks(r: any, checks: any[]): any {
  for (const ch of checks) {
    switch (ch.kind) {
      case 'min':
        r.minLength = ch.value;
        break;
      case 'max':
        r.maxLength = ch.value;
        break;
      case 'length':
        r.minLength = r.maxLength = ch.value;
        break;
      case 'email':
        r.format = 'email';
        break;
      case 'url':
        r.format = 'uri';
        break;
      case 'uuid':
        r.format = 'uuid';
        break;
      case 'cuid':
        r.format = 'cuid';
        break;
      case 'regex':
        r.pattern = ch.regex?.source ?? ch.value?.source ?? String(ch.value);
        break;
    }
  }
  return r;
}

function applyNumberChecks(r: any, checks: any[], exclusive = false): any {
  for (const ch of checks) {
    switch (ch.kind) {
      case 'min':
        r.minimum = ch.value;
        if (exclusive && ch.inclusive === false) r.exclusiveMinimum = true;
        break;
      case 'max':
        r.maximum = ch.value;
        if (exclusive && ch.inclusive === false) r.exclusiveMaximum = true;
        break;
      case 'int':
        r.type = 'integer';
        break;
      case 'multipleOf':
        r.multipleOf = ch.value;
        break;
    }
  }
  return r;
}

function buildObjectSchema(
  shape: Record<string, any> | undefined,
  convert: (s: any) => Record<string, any>,
  isOptional: (field: any) => boolean,
): Record<string, any> {
  if (!shape) return { type: 'object' };

  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries<any>(shape)) {
    properties[key] = convert(field);
    if (!isOptional(field)) required.push(key);
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function wrapNullable(def: any, convert: (s: any) => Record<string, any>): Record<string, any> {
  const inner = def.innerType ? convert(def.innerType) : {};
  return { ...inner, nullable: true };
}

function convertZod4(schema: any): Record<string, any> {
  const def = schema._zod?.def;
  if (!def) return { type: 'object' };

  switch (def.type) {
    case 'string':
      return applyStringChecks({ type: 'string' }, def.checks ?? []);

    case 'number':
      return applyNumberChecks({ type: 'number' }, def.checks ?? []);

    case 'boolean':
      return { type: 'boolean' };
    case 'bigint':
      return { type: 'integer', format: 'int64' };
    case 'date':
      return { type: 'string', format: 'date-time' };

    case 'object':
      return buildObjectSchema(def.shape ?? schema.shape, convertZod4, f => {
        const t = f._zod?.def?.type;
        return t === 'optional' || t === 'default';
      });

    case 'array': {
      const r: any = { type: 'array', items: def.element ? convertZod4(def.element) : {} };
      if (def.minLength != null) r.minItems = def.minLength;
      if (def.maxLength != null) r.maxItems = def.maxLength;
      return r;
    }

    case 'optional':
    case 'default':
      return def.innerType ? convertZod4(def.innerType) : {};

    case 'nullable':
      return wrapNullable(def, convertZod4);

    case 'enum':
      return { type: 'string', enum: def.entries ?? def.values ?? [] };

    case 'literal': {
      const vals = def.values ? [...def.values] : [def.value];
      return { type: typeof vals[0], enum: vals };
    }

    case 'union':
      return { oneOf: (def.options ?? []).map((o: any) => convertZod4(o)) };

    case 'intersection':
      return { allOf: [convertZod4(def.left), convertZod4(def.right)] };

    case 'record':
      return {
        type: 'object',
        additionalProperties: def.valueType ? convertZod4(def.valueType) : {},
      };

    case 'tuple': {
      const items = (def.items ?? []).map((i: any) => convertZod4(i));
      return { type: 'array', items, minItems: items.length, maxItems: items.length };
    }

    default:
      return { type: 'object' };
  }
}

function convertZod3(schema: any): Record<string, any> {
  const def = schema._def;
  if (!def) return { type: 'object' };

  switch (def.typeName) {
    case 'ZodString':
      return applyStringChecks({ type: 'string' }, def.checks ?? []);

    case 'ZodNumber':
      return applyNumberChecks({ type: 'number' }, def.checks ?? [], true);

    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodBigInt':
      return { type: 'integer', format: 'int64' };
    case 'ZodDate':
      return { type: 'string', format: 'date-time' };

    case 'ZodObject':
      return buildObjectSchema(
        typeof def.shape === 'function' ? def.shape() : def.shape,
        convertZod3,
        f => {
          const t = f._def?.typeName;
          return t === 'ZodOptional' || t === 'ZodDefault';
        },
      );

    case 'ZodArray': {
      const r: any = { type: 'array', items: def.type ? convertZod3(def.type) : {} };
      if (def.minLength != null) r.minItems = def.minLength.value;
      if (def.maxLength != null) r.maxItems = def.maxLength.value;
      return r;
    }

    case 'ZodOptional':
    case 'ZodDefault':
      return def.innerType ? convertZod3(def.innerType) : {};

    case 'ZodNullable':
      return wrapNullable(def, convertZod3);

    case 'ZodEnum':
      return { type: 'string', enum: def.values };

    case 'ZodNativeEnum':
      return { type: 'string', enum: Object.values(def.values) };

    case 'ZodLiteral':
      return { type: typeof def.value, enum: [def.value] };

    case 'ZodUnion':
      return { oneOf: (def.options ?? []).map((o: any) => convertZod3(o)) };

    case 'ZodDiscriminatedUnion': {
      const opts = [...(def.options?.values?.() ?? def.options ?? [])];
      return {
        discriminator: { propertyName: def.discriminator },
        oneOf: opts.map((o: any) => convertZod3(o)),
      };
    }

    case 'ZodIntersection':
      return { allOf: [convertZod3(def.left), convertZod3(def.right)] };

    case 'ZodRecord':
      return {
        type: 'object',
        additionalProperties: def.valueType ? convertZod3(def.valueType) : {},
      };

    case 'ZodTuple': {
      const items = (def.items ?? []).map((i: any) => convertZod3(i));
      return { type: 'array', items, minItems: items.length, maxItems: items.length };
    }

    case 'ZodEffects':
      return def.schema ? convertZod3(def.schema) : { type: 'object' };

    case 'ZodLazy':
      return typeof def.getter === 'function' ? convertZod3(def.getter()) : { type: 'object' };

    case 'ZodPipeline':
      return def.in ? convertZod3(def.in) : { type: 'object' };

    case 'ZodAny':
    case 'ZodUnknown':
    case 'ZodVoid':
      return {};

    default:
      return { type: 'object' };
  }
}
