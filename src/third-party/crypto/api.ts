export async function hashBuffer (content: Uint8Array): Promise<string> {
  const result: ArrayBuffer = await crypto.subtle
    .digest('SHA-1', content);
  return Array.from(new Uint8Array(result))
    .map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashString (content: string): Promise<string> {
  return await hashBuffer(new TextEncoder().encode(content));
}
