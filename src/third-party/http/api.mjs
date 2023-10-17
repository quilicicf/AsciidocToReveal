import { get } from 'https';

export async function httpGet (url) {
  return new Promise((resolve, reject) => {
    get(url, (response) => {
      const dataChunks = [];
      if (response.statusCode !== 200) {
        reject(`HTTP call failed with status ${response.statusCode}`);
      } else {
        response.on('data', (fragments) => { dataChunks.push(fragments); });
        response.on('end', () => { resolve(Buffer.concat(dataChunks).toString()); });
        response.on('error', () => { reject(); });
      }
    });
  });
}
