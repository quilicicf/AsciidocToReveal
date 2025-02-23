import { stoyle } from 'npm:stoyle';
import { WebSocketServer } from 'npm:ws';

import { logInfo, theme } from '../src/third-party/logger/log.ts';
import { uuid } from '../src/third-party/uuid/api.ts';

interface ReloadServer {
  reload: (hash: string) => void;
}

interface State {
  hash: string;
  clients: Record<string, WebSocket>;
}

export default function startLiveReloadServer (initialHash: string): ReloadServer {
  const wss = new WebSocketServer({ port: 1234 });
  const state: State = {
    hash: initialHash,
    clients: {},
  };
  wss.on('connection', (ws: WebSocket) => {
    const key = uuid();
    logInfo(stoyle`Registering client ${key}`({ nodes: [ theme.strong ] }));
    state.clients[ key ] = ws;
  });

  wss.on('message', (messageAsString: string) => {
    const message = JSON.parse(messageAsString);
    if (message.hash !== state.hash) {
      sendReloadMessages(); // NOTE: optionally find a way to only reload the outdated pages (not MVP tho)
    }
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
