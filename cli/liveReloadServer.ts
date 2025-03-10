import { stoyle } from 'stoyle';

import { logInfo, theme } from '../src/third-party/logger/log.ts';
import { uuid } from '../src/third-party/crypto/api.ts';

interface ReloadServer {
  reload: (hash: string) => void;
}

interface State {
  hash: string;
  clients: Record<string, WebSocket>;
}

export default function startLiveReloadServer (initialHash: string): ReloadServer {
  const state: State = {
    hash: initialHash,
    clients: {},
  };

  Deno.serve({ port: 1234, onListen: () => {} }, (request) => {
    if (request.headers.get('upgrade') != 'websocket') {
      return new Response(null, { status: 501 });
    }

    const { socket, response } = Deno.upgradeWebSocket(request);

    socket.addEventListener('open', () => {
      const key = uuid();
      logInfo(stoyle`Registering client ${key}`({ nodes: [ theme.strong ] }));
      state.clients[ key ] = socket;
    });
    socket.addEventListener('message', (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.hash !== state.hash) {
        sendReloadMessages(); // NOTE: optionally find a way to only reload the outdated pages (not MVP tho)
      }
    });

    return response;
  });

  function sendReloadMessage (key: string) {
    const ws = state.clients[ key ];
    ws.send(JSON.stringify({ reload: true }));
    delete state.clients[ key ];
  }

  function sendReloadMessages () {
    Object.keys(state.clients)
      .forEach((key) => sendReloadMessage(key));
  }

  return {
    reload (hash: string): void {
      if (state.hash === hash) { return; }

      const clientsNumber = Object.keys(state.clients).length;
      logInfo(stoyle`Reloading ${clientsNumber} clients for new content ${hash}`({ nodes: [ theme.strong, theme.strong ] }));
      state.hash = hash;
      sendReloadMessages();
    },
  };
}
