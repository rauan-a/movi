import { timingSafeEqual } from 'crypto';

const norm = (s) => String(s || '').trim().toLowerCase();

// Проверка секретного кода из заголовка x-access-code
export async function checkCode(req) {
  let given = '';
  try {
    given = decodeURIComponent(req.headers.get('x-access-code') || '');
  } catch {
    given = '';
  }
  const secret = norm(process.env.SECRET_CODE);
  const a = Buffer.from(norm(given));
  const b = Buffer.from(secret);
  const ok = secret.length > 0 && a.length === b.length && timingSafeEqual(a, b);
  if (!ok) await new Promise((r) => setTimeout(r, 700)); // замедляем подбор
  return ok;
}
