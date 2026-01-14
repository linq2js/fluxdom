export const generateSalt = () => {
  return window.crypto.getRandomValues(new Uint8Array(16));
};

export const generateIV = () => {
  return window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
};

export const deriveKeyFromPasscode = async (
  passcode: string,
  salt: Uint8Array
): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passcode),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
};

export const generateMasterKey = async (): Promise<CryptoKey> => {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
};

export const wrapMasterKey = async (
  masterKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ wrappedKey: ArrayBuffer; iv: Uint8Array }> => {
  const iv = generateIV();
  const wrappedKey = await window.crypto.subtle.wrapKey(
    "raw",
    masterKey,
    wrappingKey,
    {
      name: "AES-GCM",
      iv: iv as any,
    }
  );
  return { wrappedKey, iv };
};

export const unwrapMasterKey = async (
  wrappedKey: ArrayBuffer,
  unwrappingKey: CryptoKey,
  iv: Uint8Array
): Promise<CryptoKey> => {
  return window.crypto.subtle.unwrapKey(
    "raw",
    wrappedKey,
    unwrappingKey,
    {
      name: "AES-GCM",
      iv: iv as any,
    },
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

export const encryptData = async (
  data: ArrayBuffer | string,
  key: CryptoKey
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> => {
  const iv = generateIV();
  const encodedData =
    typeof data === "string" ? new TextEncoder().encode(data) : data;

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
    },
    key,
    encodedData
  );

  return { encrypted, iv };
};

export const decryptData = async (
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> => {
  return window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
    },
    key,
    encryptedData
  );
};

// Utilities for ArrayBuffer <-> Base64 (for storage)
export const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return window.btoa(binary);
};

export const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};
