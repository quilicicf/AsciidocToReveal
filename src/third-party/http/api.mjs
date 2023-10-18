export async function httpGet (url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw Error(`HTTP call failed with status ${response.status}`);
  }
  return response.text();
}
