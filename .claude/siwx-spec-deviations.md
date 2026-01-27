# SIWX Implementation: Spec Deviations & Liberties

This document tracks liberties taken in the Sign-In-With-X implementation that deviate from CAIP-122, CHANGELOG-v2.md, or related specifications.

**Last updated**: After CAIP-122 compliance fixes

## CAIP-122 Compliance (Fixed)

### 1. `type` Field - FIXED
- Now includes `type` field (`"eip191"` for EVM, `"ed25519"` for Solana)
- Auto-derived from `chainId` prefix in `declareSIWxExtension()`

### 2. Clock Skew Tolerance - FIXED
- Future `issuedAt` timestamps are now strictly rejected (no grace period)

### 3. Explicit Domain Parameter - FIXED
- `domain` is now a required parameter in `DeclareSIWxOptions`
- No longer auto-extracted from `resourceUri`

### 4. Solana Chain ID in Message - FIXED
- Now uses raw chain reference (genesis hash) like EVM uses numeric chain ID
- Example: `Chain ID: 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` instead of `Chain ID: mainnet`

### 5. signatureScheme Echo - FIXED
- `createSIWxPayload()` now copies `serverExtension.signatureScheme` to the payload

### 6. Removed sep10 - FIXED
- Removed `sep10` from `SignatureScheme` type (not implemented)

## Intentional Conveniences (Retained)

### 7. Auto-generation of Server Fields
- **Location**: `declare.ts`
- **Behavior**: `declareSIWxExtension()` auto-generates nonce, issuedAt, expirationTime, resources
- **Rationale**: Developer convenience

### 8. URI Validation Leniency
- **Location**: `validate.ts`
- **Behavior**: Validates `message.uri.startsWith(expectedUrl.origin)`
- **Rationale**: Allows flexibility for sub-path URIs

## Remaining Deviations (Intentional)

### 9. Field Name: `address` vs `account_address`
- **Behavior**: Uses `address` field name
- **CAIP-122 says**: Uses `account_address`
- **Decision**: Kept as-is - SIWE ecosystem compatibility more important

### 10. signatureScheme is Informational Only
- **Behavior**: Verification routes by `chainId` prefix, not `signatureScheme`
- **Impact**: `signatureScheme` is a UX hint only

### 11. EIP-712 Not Supported
- **Behavior**: Only EIP-191 (`personal_sign`) verification is implemented
- **Impact**: Setting `signatureScheme: "eip1271"/"eip6492"` works (viem handles it), but `eip712` would fail
