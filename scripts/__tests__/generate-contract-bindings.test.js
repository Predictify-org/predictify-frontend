const fs = require('node:fs');
const path = require('node:path');
const { generateBindings, mapType } = require('../contract-bindings-core.cjs');

describe('contract binding generator', () => {
  test.each([
    ['Address', 'string'],
    ['i128', 'bigint'],
    ['u64', 'bigint'],
    ['Symbol', 'string'],
    ['Vec<u64>', 'Array<bigint>'],
    ['Option<Address>', 'string | undefined'],
    ['Map<Address, Vec<Option<i128>>>', 'Map<string, Array<bigint | undefined>>'],
  ])('maps %s to %s', (input, expected) => {
    expect(mapType(input)).toBe(expected);
  });

  test('generates data enums, tuple structs, error codes, and void methods', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'contract-bindings-spec.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const generated = generateBindings(fixture);

    expect(generated['predictify-hybrid.types.ts']).toContain(
      'export type TupleValue = [string, bigint];',
    );
    expect(generated['predictify-hybrid.types.ts']).toContain(
      "{ tag: 'Value'; amount: bigint; }",
    );
    expect(generated['predictify-hybrid.types.ts']).toContain(
      'export type FixtureErrorCode = 1 | 4;',
    );
    expect(generated['predictify-hybrid.client.ts']).toContain(
      "return { contractId, method: 'ping', args };",
    );
    expect(generated['predictify-hybrid.client.ts']).toContain(
      "InvokeDescriptor<'ping', {",
    );
    expect(generated['predictify-hybrid.client.ts']).toContain(
      "import type { ContractAddress, ComplexValue }",
    );
    expect(generated['predictify-hybrid.client.ts']).toContain(
      'values: Array<ComplexValue | undefined>;',
    );
  });

  test('keeps output deterministic regardless of declaration order', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'contract-bindings-spec.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const reversed = {
      ...fixture,
      types: fixture.types.slice().reverse(),
      functions: fixture.functions.slice().reverse(),
    };

    expect(generateBindings(reversed)).toEqual(generateBindings(fixture));
  });
});
