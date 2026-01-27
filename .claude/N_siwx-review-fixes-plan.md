# Plan: Address SIWX Extension Review Comments

## Context

PR #921 (`sragss/x402` → `coinbase/x402`) implements CAIP-122 compliant Sign-In-With-X (SIWX) extension for x402. The Coinbase reviewer (phdargen) has identified several critical issues that need to be addressed to make this production-ready and maintain the high code quality standards expected in this public repo.

## Workflow

This work will be implemented as a **separate PR into `sragss/x402:siwx-extension`** (not directly into PR #921). Once reviewed and merged into your fork, the changes will be available in the main PR to coinbase/x402.

**Branch Strategy:**
1. Create new branch from `siwx-extension`: `siwx-review-fixes`
2. Implement all fixes in this new branch
3. Create PR: `sragss/x402:siwx-review-fixes` → `sragss/x402:siwx-extension`
4. After merge, the main PR #921 will automatically include these fixes

## Critical Issues Identified

### 1. **Time-Based Fields Generated Once at Startup (CRITICAL BUG)**
- **Problem**: `declareSIWxExtension()` generates `nonce`, `issuedAt`, and `expirationTime` once when the server starts (in route config)
- **Impact**: After 5 minutes (default expiration), all SIWX auth attempts will fail validation
- **Root Cause**: Static declaration in `examples/typescript/servers/sign-in-with-x/index.ts:54`
- **Solution**: Implement `ResourceServerExtension` with `enrichDeclaration` hook to refresh fields per request

### 2. **No Replay Attack Prevention (SECURITY ISSUE)**
- **Problem**: Nonces are generated but never validated for uniqueness
- **Impact**: Attacker can replay a valid SIWX signature multiple times
- **Current State**: `createSIWxRequestHook` has optional `checkNonce` callback but no storage backing
- **Solution**: Extend `SIWxStorage` interface to track used nonces with TTL-based cleanup

### 3. **Single-Chain Limitation (ARCHITECTURAL CONSTRAINT)**
- **Problem**: Server can only advertise one `chainId`/`type`/`signatureScheme` per 402 response
- **Impact**: Cannot support both EVM and Solana clients simultaneously
- **Spec Constraint**: Current `SIWxExtensionInfo` has flat structure with single chain fields
- **Solution**: Redesign extension info to support multiple authentication methods

### 4. **Example Quality Issues**
- Client example doesn't check for `PAYMENT-RESPONSE` header
- Assumptions about payment flow (first request always pays) don't hold on second run
- Missing explicit logging of auth vs payment paths

### 5. **Failing Unit Tests**
- PR CI shows test failures in Node 20 and 22
- Need to identify root cause and fix

---

## Detailed Implementation Plan

See full implementation details for each phase in sections below.

### Phase 1: Fix Time-Based Fields (CRITICAL)
- Create `server.ts` with `ResourceServerExtension`
- Implement `enrichDeclaration` hook to refresh nonce/issuedAt/expirationTime per request
- Refactor `declareSIWxExtension()` to use `expirationSeconds` instead of `expirationTime`
- Update server example to register extension

### Phase 2: Add Nonce Validation (SECURITY)
- Extend `SIWxStorage` interface with `hasUsedNonce?` / `recordNonce?`
- Update `InMemorySIWxStorage` with TTL-based nonce tracking
- Update `createSIWxRequestHook` to validate and record nonces

### Phase 3: Multi-Chain Support (FEATURE)
- Update spec to document multi-chain pattern
- Add `declareSIWxExtensionMultiChain()` helper
- Update `createSIWxClientHook` to match by chainId

### Phase 4: Improve Examples (QUALITY)
- Add explicit PAYMENT-RESPONSE header checking
- Add flow documentation
- Handle first-run and subsequent-run scenarios

### Phase 5: Fix Failing Tests (BLOCKER)
- Identify test failures from CI logs
- Fix import/export issues
- Add tests for new functionality

### Phase 6: Add Redis Storage (PRODUCTION - IMPLEMENT LAST)
- Create minimal `RedisSIWxStorage` class
- Add storage documentation
- Update package.json with optional peer dependency

---

## Implementation Order

### Critical Fixes (Implement First):
1. **Phase 1**: Fix time-based fields with `enrichDeclaration` hook (CRITICAL BUG)
2. **Phase 2**: Add nonce validation for replay prevention (SECURITY)
3. **Phase 3**: Implement multi-chain support (FEATURE COMPLETENESS)
4. **Phase 4**: Update examples with explicit header checking (QUALITY)
5. **Phase 5**: Fix failing unit tests (BLOCKER)

### Production Enhancement (Implement Last):
6. **Phase 6**: Add Redis storage implementation (PRODUCTION READINESS)

---

## Critical Files

### Core SIWX Package:
- `typescript/packages/extensions/src/sign-in-with-x/declare.ts` - Extension declaration
- `typescript/packages/extensions/src/sign-in-with-x/server.ts` - NEW: ResourceServerExtension
- `typescript/packages/extensions/src/sign-in-with-x/storage.ts` - Storage interface
- `typescript/packages/extensions/src/sign-in-with-x/hooks.ts` - Lifecycle hooks
- `typescript/packages/extensions/src/sign-in-with-x/types.ts` - Type definitions
- `typescript/packages/extensions/src/sign-in-with-x/index.ts` - Public exports

### Examples:
- `examples/typescript/servers/sign-in-with-x/index.ts`
- `examples/typescript/clients/sign-in-with-x/index.ts`

### Spec:
- `specs/extensions/sign-in-with-x.md`

---

## User Decisions (Confirmed)

1. **Multi-chain support:** ✅ Implement now - Full production-ready solution
2. **Breaking change:** ✅ Clean break - `expirationTime` → `expirationSeconds` (extension not yet released)
3. **Storage backend:** ✅ Add Redis example - Demonstrates production multi-instance pattern

---

*For full implementation details, see the complete plan file at .claude/plans/cuddly-percolating-rabbit.md*
