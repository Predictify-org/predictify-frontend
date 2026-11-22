const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function splitGenericArguments(value) {
  const result = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '<') depth += 1;
    if (value[index] === '>') depth -= 1;
    if (value[index] === ',' && depth === 0) {
      result.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  result.push(value.slice(start).trim());
  return result;
}

function mapType(type) {
  if (typeof type !== 'string' || type.trim() === '') {
    throw new Error(`Invalid contract type: ${JSON.stringify(type)}`);
  }
  const value = type.trim();
  const genericStart = value.indexOf('<');
  if (genericStart !== -1 && value.endsWith('>')) {
    const name = value.slice(0, genericStart).trim();
    const args = splitGenericArguments(value.slice(genericStart + 1, -1));
    if (name === 'BytesN' && args.length === 1 && /^\d+$/.test(args[0])) return 'Uint8Array';
    if (name === 'Vec' && args.length === 1) return `Array<${mapType(args[0])}>`;
    if (name === 'Option' && args.length === 1) return `${mapType(args[0])} | undefined`;
    if (name === 'Map' && args.length === 2) {
      return `Map<${mapType(args[0])}, ${mapType(args[1])}>`;
    }
    if (name === 'Tuple' && args.length > 0) return `[${args.map(mapType).join(', ')}]`;
    throw new Error(`Unsupported contract type: ${value}`);
  }

  const primitiveTypes = {
    Address: 'string',
    Bool: 'boolean',
    Bytes: 'Uint8Array',
    BytesN: 'Uint8Array',
    Duration: 'bigint',
  };
  const normalized = value;
  if (/^u(32)$/.test(normalized)) return 'number';
  if (/^u(64|128|256)$/.test(normalized)) return 'bigint';
  if (/^i(32)$/.test(normalized)) return 'number';
  if (/^i(64|128|256)$/.test(normalized)) return 'bigint';
  if (normalized === 'Symbol' || normalized === 'String') return 'string';
  if (normalized === 'Void' || normalized === '()') return 'void';
  if (Object.prototype.hasOwnProperty.call(primitiveTypes, normalized)) {
    return primitiveTypes[normalized];
  }
  if (!IDENTIFIER.test(normalized)) throw new Error(`Unsupported contract type: ${value}`);
  return normalized;
}

function assertIdentifier(name, context) {
  if (typeof name !== 'string' || !IDENTIFIER.test(name)) {
    throw new Error(`Invalid ${context} name: ${JSON.stringify(name)}`);
  }
}

function renderFieldList(fields, owner) {
  if (!Array.isArray(fields)) throw new Error(`${owner} fields must be an array`);
  const named = fields.every((field) => field && typeof field.name === 'string');
  if (!named) {
    if (fields.some((field) => field && typeof field.name === 'string')) {
      throw new Error(`${owner} cannot mix named and unnamed fields`);
    }
    return `[${fields.map((field) => mapType(typeof field === 'string' ? field : field.type)).join(', ')}]`;
  }
  return `{\n${fields
    .map((field) => {
      assertIdentifier(field.name, `${owner} field`);
      return `  ${field.name}: ${mapType(field.type)};`;
    })
    .join('\n')}\n}`;
}

function renderEnum(name, variants, context) {
  assertIdentifier(name, context);
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error(`${name} variants must be a non-empty array`);
  }
  const members = variants.map((variant) => {
    assertIdentifier(variant.name, `${name} variant`);
    const fields = variant.fields || [];
    if (fields.length === 0) return `{ tag: '${variant.name}' }`;
    const named = fields.every((field) => field && typeof field.name === 'string');
    if (!named) {
      if (fields.some((field) => field && typeof field.name === 'string')) {
        throw new Error(`${name}.${variant.name} cannot mix named and unnamed fields`);
      }
      const tuple = `[${fields.map((field) => mapType(typeof field === 'string' ? field : field.type)).join(', ')}]`;
      return `{ tag: '${variant.name}'; value: ${tuple} }`;
    }
    const properties = fields.map((field) => {
      assertIdentifier(field.name, `${name}.${variant.name} field`);
      return `${field.name}: ${mapType(field.type)};`;
    });
    return `{ tag: '${variant.name}'; ${properties.join(' ')} }`;
  });
  return `export type ${name} =\n${members.map((member) => `  | ${member}`).join('\n')};`;
}

function renderType(definition) {
  assertIdentifier(definition.name, 'type');
  if (definition.kind === 'struct') {
    const fields = definition.fields || [];
    const rendered = renderFieldList(fields, definition.name);
    if (rendered.startsWith('[')) return `export type ${definition.name} = ${rendered};`;
    return `export interface ${definition.name} ${rendered}`;
  }
  if (definition.kind === 'enum') return renderEnum(definition.name, definition.variants, 'enum');
  if (definition.kind === 'alias') return `export type ${definition.name} = ${mapType(definition.type)};`;
  throw new Error(`Unsupported type definition kind for ${definition.name}: ${definition.kind}`);
}

function renderErrors(errors = []) {
  if (!Array.isArray(errors)) throw new Error('spec.errors must be an array');
  return errors.map((error) => {
    assertIdentifier(error.name, 'error');
    const variants = error.variants || [];
    if (!Array.isArray(variants) || variants.length === 0) {
      throw new Error(`${error.name} variants must be a non-empty array`);
    }
    const names = new Set();
    const members = variants.map((variant) => {
      assertIdentifier(variant.name, `${error.name} variant`);
      if (names.has(variant.name)) throw new Error(`Duplicate error variant: ${variant.name}`);
      names.add(variant.name);
      if (variant.code === undefined) return `{ name: '${variant.name}' }`;
      if (!Number.isInteger(variant.code)) throw new Error(`${error.name}.${variant.name} code must be an integer`);
      return `{ name: '${variant.name}'; code: ${variant.code} }`;
    });
    const rendered = `export type ${error.name} =\n${members.map((member) => `  | ${member}`).join('\n')};`;
    const codes = variants.filter((variant) => variant.code !== undefined).map((variant) => variant.code);
    const codeType = codes.length
      ? `export type ${error.name}Code = ${[...new Set(codes)].sort((a, b) => a - b).join(' | ')};`
      : `export type ${error.name}Code = never;`;
    return `${rendered}\n${codeType}`;
  });
}

function renderTypes(spec) {
  if (!Array.isArray(spec.types)) throw new Error('spec.types must be an array');
  const definitions = spec.types.slice().sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
  const names = new Set();
  for (const definition of definitions) {
    if (names.has(definition.name)) throw new Error(`Duplicate type definition: ${definition.name}`);
    names.add(definition.name);
  }
  const sections = [
    `// AUTO-GENERATED - do not edit\n\n`,
    `export type ContractAddress = string;\n`,
    ...definitions.map((definition) => `\n${renderType(definition)}\n`),
    ...renderErrors(spec.errors).map((definition) => `\n${definition}\n`),
  ];
  return sections.join('');
}

function renderClient(spec) {
  if (!Array.isArray(spec.functions)) throw new Error('spec.functions must be an array');
  const functions = spec.functions.slice().sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
  const seen = new Set();
  const imports = new Set();
  const typeNames = new Set((spec.types || []).map((definition) => definition.name));
  const rendered = functions.map((fn) => {
    assertIdentifier(fn.name, 'function');
    if (seen.has(fn.name)) throw new Error(`Duplicate exported function: ${fn.name}`);
    seen.add(fn.name);
    const inputs = fn.inputs || fn.params || [];
    if (!Array.isArray(inputs)) throw new Error(`${fn.name} inputs must be an array`);
    const inputNames = new Set();
    const args = inputs.map((input) => {
      assertIdentifier(input.name, `${fn.name} input`);
      if (inputNames.has(input.name)) throw new Error(`Duplicate input ${input.name} in ${fn.name}`);
      inputNames.add(input.name);
      const tsType = mapType(input.type);
      for (const candidate of String(input.type).match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || []) {
        if (typeNames.has(candidate)) imports.add(candidate);
      }
      return `    ${input.name}: ${tsType};`;
    });
    const argsType = `{\n${args.join('\n')}\n  }`;
    return `export function ${toCamelCase(fn.name)}(\n  contractId: ContractAddress,\n  args: ${argsType},\n): InvokeDescriptor<'${fn.name}', ${argsType}> {\n  return { contractId, method: '${fn.name}', args };\n}`;
  });
  const usedTypes = ['ContractAddress', ...[...imports].filter((name) => typeNames.has(name)).sort()];
  const typeImport = usedTypes.length
    ? `import type { ${usedTypes.join(', ')} } from './predictify-hybrid.types';\n\n`
    : '';
  return `// AUTO-GENERATED - do not edit\n${typeImport}export interface InvokeDescriptor<TMethod extends string = string, TArgs extends Record<string, unknown> = Record<string, unknown>> {\n  contractId: ContractAddress;\n  method: TMethod;\n  args: TArgs;\n}\n\n${rendered.join('\n\n')}\n`;
}

function toCamelCase(value) {
  return value.replace(/_([a-z0-9])/g, (_, character) => character.toUpperCase());
}

function generateBindings(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    throw new Error('Contract spec must be a JSON object');
  }
  return {
    'predictify-hybrid.types.ts': renderTypes(spec),
    'predictify-hybrid.client.ts': renderClient(spec),
  };
}

module.exports = {
  generateBindings,
  mapType,
  renderClient,
  renderTypes,
};
