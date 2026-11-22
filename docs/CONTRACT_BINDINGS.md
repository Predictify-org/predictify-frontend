# Contract bindings

The generated TypeScript types and invoke descriptors are checked in under
`lib/contracts/`. Treat those files as generated output; edit the contract spec
and rerun the generator instead.

## Regenerate

Build the contract WASM with the Soroban toolchain, then export its spec as JSON:

```sh
cd contracts/predictify-hybrid
cargo build --target wasm32-unknown-unknown --release
stellar contract inspect --wasm target/wasm32-unknown-unknown/release/predictify_hybrid.wasm --output json > /tmp/predictify-hybrid-inspect.json
cd ../..
# Update the normalized types/errors/functions in contracts/predictify-hybrid/spec.json
pnpm contracts:generate
```

The CLI inspection JSON is the source of truth; copy its exported types,
functions, and error codes into the normalized JSON shape committed in
`contracts/predictify-hybrid/spec.json`: `types` (structs, enums, and aliases),
`errors` (error enum variants, with ABI codes when known), and `functions`
(exported function names, inputs, and return types). Keep declaration names,
field order, and error codes aligned with the WASM contract spec; do not
overwrite the normalized snapshot with raw CLI output. The checked-in contract
sources currently do not provide a complete buildable WASM ABI, so verify the
recovery API snapshot against inspection output once that contract build is
available. The snapshot is the deterministic input to TypeScript generation;
the WASM and Rust build output must not be committed.

The generated client functions take a contract ID and named arguments, and
return an invoke descriptor containing `contractId`, the exact exported
`method` name, and typed `args`. Integer widths larger than 32 bits use
`bigint`; optional values use `T | undefined`.

## Verify drift

Run `pnpm contracts:check` to compare fresh in-memory generated output with the
checked-in files. It exits nonzero and prints the regeneration command if the
spec and bindings differ. `pnpm validate` runs this check before the normal
typecheck, lint, and test steps.

The repository maintainer should add this step to the CI workflow:

```yaml
- name: Check contract bindings
  run: pnpm contracts:check
```
