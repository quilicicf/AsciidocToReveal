export async function hashString (content: string): Promise<string> {
  const result: ArrayBuffer = await crypto.subtle
    .digest('SHA-1', new TextEncoder().encode(content));
  return Array.from(new Uint8Array(result))
    .map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
