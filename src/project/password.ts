const ITERATIONS = 100_000;
const KEY_BITS = 256;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function derive(password: string, salt: BufferSource): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    key,
    KEY_BITS,
  );
}

export async function hashEditPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return { salt: toBase64(salt.buffer), hash: toBase64(hash) };
}

export async function verifyEditPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const bits = await derive(password, fromBase64(salt));
  const expected = new Uint8Array(fromBase64(hash));
  const actual = new Uint8Array(bits);
  if (expected.length !== actual.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected[i] ^ actual[i];
  }
  return diff === 0;
}
