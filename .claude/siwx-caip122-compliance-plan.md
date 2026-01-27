# Plan: SIWX CAIP-122 Compliance Fixes

## Overview

Bring the SIWX implementation into stricter compliance with CAIP-122 by fixing field naming, adding the `type` field, and removing implementation-specific conveniences that deviate from the spec.

---

## Fixes To Implement

### 1. Add `type` Field (CAIP-122 Compliance)

**What**: Add required `type` field that designates the signature algorithm.

**Changes**:
- `types.ts`: Add `type` to `SIWxExtensionInfo`, `SIWxPayload`, and schemas
- `declare.ts`: Auto-populate `type` based on `chainId` prefix:
  - `eip155:*` → `type: "eip191"` (since we use personal_sign)
  - `solana:*` → `type: "ed25519"`
- `client.ts`: Echo `type` from server extension to payload
- `schema.ts`: Add `type` to JSON schema with required status

**CAIP-122 reference**: "Namespace specifications must define... a `type` string designating each algorithm"

---

### 2. Remove Clock Skew Tolerance

**What**: Remove the 1-minute clock skew tolerance for `issuedAt` timestamps.

**Changes**:
- `validate.ts`: Remove `CLOCK_SKEW_MS` constant and the `age < -CLOCK_SKEW_MS` check (lines 14, 88-93)
- Change validation to reject any `issuedAt` in the future (no tolerance)

**Rationale**: Spec says "MUST be recent" - doesn't mention allowing future timestamps. Servers/clients should have reasonably synced clocks.

---

### 3. Remove Auto Domain Extraction

**What**: Require `domain` to be explicitly provided instead of extracting from `resourceUri`.

**Changes**:
- `types.ts`: Add `domain` as required field in `DeclareSIWxOptions`
- `declare.ts`: Use `options.domain` directly instead of `url.host`
- Update JSDoc examples to show explicit domain

**Rationale**: CAIP-122 says domain "MUST originate from a trusted source". Auto-extraction is convenient but could mask configuration errors.

**Alternative considered**: Keep auto-extraction but add optional `domain` override. Rejected for simplicity.

---

### 4. Echo signatureScheme in Payload

**What**: Copy `signatureScheme` from server extension to client payload.

**Changes**:
- `client.ts`: Add `signatureScheme: serverExtension.signatureScheme` to returned payload

**Rationale**: Schema already supports it; should be echoed for completeness.

---

### 5. Fix Solana Chain ID in Message

**What**: Use the CAIP-2 reference (genesis hash) in the signed message instead of human-readable names.

**Current behavior** (`solana.ts:90`):
```
Chain ID: mainnet   // Converts genesis hash to human name
```

**Correct behavior** (matching EVM pattern):
```
Chain ID: 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp   // Use reference directly
```

**Changes**:
- `solana.ts`: Rename `extractSolanaNetwork()` to `extractSolanaChainReference()`
- `solana.ts`: Remove `SOLANA_NETWORKS` mapping dictionary
- `solana.ts`: Simply extract the part after `solana:` and return it directly
- Update `formatSIWSMessage()` to use the raw reference

**Rationale**:
- Consistent with EVM which uses `8453` not `eip155:8453` or `"Base"`
- CAIP-122 uses chain reference, not human-readable names
- Removes arbitrary mapping that could differ between implementations

---

## What We're Skipping (And Why)

### Skip: Rename `address` to `account_address`

**Why skipping**:
- EIP-4361 (SIWE) uses `address`, which is the de facto standard
- The `siwe` library we use for EVM expects `address`
- Breaking change for any existing integrations
- CAIP-122 is a generalization; namespaces can use their conventions

**Risk**: Low - SIWE/SIWS ecosystem uses `address`

---

### Skip: EIP-712 Typed Data Support

**Why skipping**:
- Requires completely different message format and verification path
- EIP-712 for auth is less common than personal_sign
- Would need to define a typed data schema for SIWX
- Significant implementation effort for edge case

**Mitigation**: Document that `signatureScheme: "eip712"` is not supported; remove from enum or mark deprecated.

---

### Skip: SEP-10 (Stellar) Support

**Why skipping**:
- No immediate use case
- Would require Stellar SDK dependency
- Out of scope for current EVM + Solana focus

**Mitigation**: Remove `sep10` from `SignatureScheme` type to avoid false advertising.

---

### Skip: URI Validation Strictness

**Why skipping**:
- Current `startsWith(origin)` validation is reasonable
- Stricter "exact base URL" matching could break legitimate use cases
- Spec language ("refer to base url") is somewhat ambiguous

---

## Implementation Order

1. Add `type` field (most important for CAIP-122)
2. Fix Solana Chain ID to use reference instead of human-readable name
3. Echo `signatureScheme` in payload
4. Remove clock skew tolerance
5. Require explicit `domain` parameter
6. Remove `sep10` from SignatureScheme enum (not implemented)

---

## Files To Modify

| File | Changes |
|------|---------|
| `types.ts` | Add `type` to interfaces, add `domain` to DeclareSIWxOptions, remove `sep10` from enum |
| `declare.ts` | Set `type` based on chainId, require explicit `domain` |
| `client.ts` | Echo `signatureScheme`, include `type` in payload |
| `validate.ts` | Remove clock skew tolerance |
| `schema.ts` | Add `type` to JSON schema |
| `solana.ts` | Remove `SOLANA_NETWORKS` mapping, use raw chain reference in message |

---

## Testing Considerations

- Update existing tests to include `type` field
- Update tests to provide explicit `domain`
- Add test case verifying future `issuedAt` is rejected (no clock skew)
- Verify signature round-trip still works with new fields
- Update Solana tests to expect chain reference (genesis hash) in messages, not "mainnet"/"devnet"
