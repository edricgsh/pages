/* Shared crypto helpers for the encrypted-artifact pipeline.
 *
 * Envelope format (produced by build.py):
 *   base64( salt[16] || iv[12] || AES-256-GCM ciphertext )
 * Key derivation: PBKDF2-SHA256, 600_000 iterations, over the UTF-8 password.
 *
 * Exposed as window.PagesCrypto so both unlock.js and menu.js can use it.
 */
(function () {
  'use strict';

  const PBKDF2_ITERATIONS = 600000;
  const SALT_BYTES = 16;
  const IV_BYTES = 12;

  // Where the plaintext password lives once the visitor has unlocked once.
  // It has to be the password itself, not a hash: re-decrypting on the next
  // page load needs the real key material. (The previous encryption attempt
  // stored only the hash, which is why auto-unlock threw ReferenceError.)
  const STORAGE_KEY = 'pages_pw';

  async function sha256Hex(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  }

  function b64ToBytes(b64) {
    const bin = atob(b64.replace(/\s+/g, ''));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* Returns the decrypted UTF-8 string, or null if the password is wrong
   * (GCM auth tag mismatch) or the payload is malformed. */
  async function decrypt(payloadB64, password) {
    try {
      const raw = b64ToBytes(payloadB64);
      if (raw.length <= SALT_BYTES + IV_BYTES) return null;
      const salt = raw.slice(0, SALT_BYTES);
      const iv = raw.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
      const ciphertext = raw.slice(SALT_BYTES + IV_BYTES);
      const key = await deriveKey(password, salt);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
      return new TextDecoder().decode(plain);
    } catch (e) {
      return null;
    }
  }

  function getStoredPassword() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null; // private mode / storage disabled
    }
  }

  function storePassword(pw) {
    try {
      localStorage.setItem(STORAGE_KEY, pw);
    } catch (e) {
      /* non-fatal: the visitor just re-types on the next page */
    }
  }

  function clearStoredPassword() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  window.PagesCrypto = {
    sha256Hex: sha256Hex,
    decrypt: decrypt,
    getStoredPassword: getStoredPassword,
    storePassword: storePassword,
    clearStoredPassword: clearStoredPassword,
    STORAGE_KEY: STORAGE_KEY
  };
})();
