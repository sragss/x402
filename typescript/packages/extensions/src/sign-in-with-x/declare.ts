/**
 * Server-side declaration helper for SIWX extension
 *
 * Helps servers declare SIWX authentication requirements in PaymentRequired responses.
 */

import { randomBytes } from "crypto";
import type { SIWxExtension, SIWxExtensionInfo, DeclareSIWxOptions, SignatureType } from "./types";
import { SIGN_IN_WITH_X } from "./types";
import { buildSIWxSchema } from "./schema";

/**
 * Derive signature type from network.
 *
 * @param network - CAIP-2 network identifier
 * @returns Signature algorithm type
 */
function getSignatureType(network: string): SignatureType {
  return network.startsWith("solana:") ? "ed25519" : "eip191";
}

/**
 * Create a SIWX extension declaration for PaymentRequired.extensions
 *
 * Time-based fields (nonce, issuedAt, expirationTime) are generated per-request
 * by the enrichDeclaration hook when siwxResourceServerExtension is registered.
 *
 * @param options - Configuration options
 * @returns Extension object ready for PaymentRequired.extensions
 *
 * @example
 * ```typescript
 * import {
 *   declareSIWxExtension,
 *   siwxResourceServerExtension
 * } from "@x402/extensions/sign-in-with-x";
 *
 * // Register extension for time-based field refresh
 * const resourceServer = new x402ResourceServer(facilitator)
 *   .registerExtension(siwxResourceServerExtension);
 *
 * const extensions = declareSIWxExtension({
 *   domain: 'api.example.com',
 *   resourceUri: 'https://api.example.com/data',
 *   network: 'eip155:8453',
 *   statement: 'Sign in to access your purchased content',
 *   expirationSeconds: 300, // Optional: 5 minutes (default)
 * });
 * ```
 */
export function declareSIWxExtension(options: DeclareSIWxOptions): Record<string, SIWxExtension> {
  // Generate time-based fields for standalone usage (tests, etc.)
  // enrichDeclaration hook will override these per-request when extension is registered
  const expirationSeconds = options.expirationSeconds ?? 300;
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date().toISOString();
  const expirationTime = new Date(Date.now() + expirationSeconds * 1000).toISOString();

  const info: SIWxExtensionInfo = {
    domain: options.domain,
    uri: options.resourceUri,
    version: options.version ?? "1",
    chainId: options.network,
    type: getSignatureType(options.network),
    nonce,
    issuedAt,
    expirationTime,
    resources: [options.resourceUri],
  };

  // Add optional fields if provided
  if (options.statement) {
    info.statement = options.statement;
  }
  if (options.signatureScheme) {
    info.signatureScheme = options.signatureScheme;
  }

  return {
    [SIGN_IN_WITH_X]: {
      info,
      schema: buildSIWxSchema(),
      // Store metadata for enrichDeclaration hook
      _metadata: {
        expirationSeconds: options.expirationSeconds ?? 300,
      },
    } as SIWxExtension & { _metadata?: { expirationSeconds?: number } },
  };
}

/**
 * Create multiple SIWX extension declarations for multi-chain support.
 *
 * Servers supporting multiple chains can use this helper to declare authentication
 * requirements for each supported network. Each chain gets a namespaced extension key.
 *
 * @param baseOptions - Common options (domain, resourceUri, statement, etc.)
 * @param networks - Array of CAIP-2 network identifiers
 * @returns Extensions map with namespaced keys for each chain
 *
 * @example
 * ```typescript
 * const extensions = declareSIWxExtensionMultiChain(
 *   {
 *     domain: 'api.example.com',
 *     resourceUri: 'https://api.example.com/data',
 *     statement: 'Sign in to access your purchased content',
 *     expirationSeconds: 300,
 *   },
 *   ['eip155:8453', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp']
 * );
 * // Returns:
 * // {
 * //   'sign-in-with-x:eip155:8453': { info: {...}, schema: {...} },
 * //   'sign-in-with-x:solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': { info: {...}, schema: {...} }
 * // }
 * ```
 */
export function declareSIWxExtensionMultiChain(
  baseOptions: Omit<DeclareSIWxOptions, "network">,
  networks: string[],
): Record<string, SIWxExtension> {
  const extensions: Record<string, SIWxExtension> = {};

  for (const network of networks) {
    const ext = declareSIWxExtension({ ...baseOptions, network });
    // Use namespaced key: "sign-in-with-x:eip155:8453"
    const namespacedKey = `${SIGN_IN_WITH_X}:${network}`;
    extensions[namespacedKey] = ext[SIGN_IN_WITH_X];
  }

  return extensions;
}
