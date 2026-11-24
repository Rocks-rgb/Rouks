// تشفير الـ PIN باستخدام Web Crypto API
export async function hashPin(pin) {
  const msgBuffer = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// التحقق من الـ PIN
export async function verifyPin(pin, storedHash) {
  const newHash = await hashPin(pin);
  return newHash === storedHash;
    }
