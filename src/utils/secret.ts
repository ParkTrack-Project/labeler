export function maskTokenLast4(token?: string) {
  if (!token) return '';
  const t = token.trim();
  if (t.length <= 4) return '•'.repeat(t.length);
  return '•'.repeat(Math.max(0, t.length - 4)) + t.slice(-4);
}
export function maskBearerHeader(header?: string) {
  if (!header) return '';
  const m = header.replace(/^Bearer\s+/i, '').trim();
  return 'Bearer ' + maskTokenLast4(m);
}
