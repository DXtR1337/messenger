/**
 * Ed25519 signature verification for Discord Interactions.
 * Uses Node.js built-in crypto — no external dependencies.
 */

import { subtle } from 'crypto';

const PUBLIC_KEY_HEX = process.env.DISCORD_PUBLIC_KEY ?? '';

let cachedKey: CryptoKey | null = null;

async function getPublicKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  if (!PUBLIC_KEY_HEX) throw new Error('DISCORD_PUBLIC_KEY not set');

  const keyBytes = Buffer.from(PUBLIC_KEY_HEX, 'hex');
  cachedKey = await subtle.importKey(
    'raw',
    keyBytes,
    { name: 'Ed25519', namedCurve: 'Ed25519' },
    false,
    ['verify'],
  );
  return cachedKey;
}

/**
 * Verify Discord interaction request signature.
 * Returns true if the signature is valid.
 */
export async function verifyDiscordSignature(
  signature: string,
  timestamp: string,
  body: string,
): Promise<boolean> {
  try {
    const key = await getPublicKey();
    const signatureBytes = Buffer.from(signature, 'hex');
    const messageBytes = Buffer.from(timestamp + body);

    return await subtle.verify(
      'Ed25519',
      key,
      signatureBytes,
      messageBytes,
    );
  } catch {
    return false;
  }
}
