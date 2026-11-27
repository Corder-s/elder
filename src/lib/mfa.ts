/**
 * ElderCare OS — Platform Owner TOTP MFA & Recovery Code Engine
 * Implements RFC 6238 TOTP (HMAC-SHA1, 6 digits, 30s period),
 * AES-256-GCM secret encryption at rest, QR code generation, and single-use recovery codes.
 */

import crypto from 'crypto';
import QRCode from 'qrcode';
import { hashToken } from './security';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function getEncryptionKey(): Buffer {
  const rawKey = process.env.MFA_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!rawKey || rawKey.length < 32) {
    throw new Error('MFA_ENCRYPTION_KEY or JWT_SECRET (min 32 chars) must be configured for MFA encryption.');
  }
  return crypto.createHash('sha256').update(rawKey).digest();
}

export function generateTotpSecret(byteLength = 20): string {
  const bytes = crypto.randomBytes(byteLength);
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function decodeBase32(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error('Invalid base32 character in TOTP secret');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function generateTotpCode(base32Secret: string, timestampMs = Date.now(), periodSeconds = 30): string {
  const key = decodeBase32(base32Secret);
  const counter = Math.floor(timestampMs / 1000 / periodSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binary % 1000000).toString().padStart(6, '0');
}

export function verifyTotpCode(base32Secret: string, code: string, windowSteps = 1): boolean {
  const cleanCode = (code || '').trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    return false;
  }

  const now = Date.now();
  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const expected = generateTotpCode(base32Secret, now + offset * 30 * 1000);
    if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

export function encryptTotpSecret(plainSecret: string): {
  secretEncrypted: string;
  iv: string;
  authTag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    secretEncrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptTotpSecret(secretEncrypted: string, ivB64: string, authTagB64: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(secretEncrypted, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export async function generateMfaQrDataUrl(email: string, base32Secret: string): Promise<{
  otpauthUrl: string;
  qrDataUrl: string;
}> {
  const issuer = encodeURIComponent('ElderCare OS Platform');
  const account = encodeURIComponent(email);
  const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${base32Secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 240,
    margin: 2,
    color: {
      dark: '#17133A',
      light: '#FFFFFF',
    },
  });
  return { otpauthUrl, qrDataUrl };
}

export function generateRecoveryCodes(count = 8): Array<{ plaintext: string; hash: string }> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codes: Array<{ plaintext: string; hash: string }> = [];

  for (let i = 0; i < count; i++) {
    let part1 = '';
    let part2 = '';
    for (let j = 0; j < 4; j++) {
      part1 += chars[crypto.randomInt(0, chars.length)];
      part2 += chars[crypto.randomInt(0, chars.length)];
    }
    const plaintext = `${part1}-${part2}`;
    codes.push({
      plaintext,
      hash: hashToken(plaintext.toUpperCase()),
    });
  }

  return codes;
}
