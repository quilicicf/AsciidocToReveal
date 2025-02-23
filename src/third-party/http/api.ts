export async function httpGet (url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw Error(`Fetching ${url} ended up in ${response.status} :\n${await response.text()}`);
  }

  return await response.text();
}
