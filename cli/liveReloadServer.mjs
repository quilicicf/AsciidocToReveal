import { stoyle } from 'stoyle';
import { WebSocketServer } from 'ws';

import { logInfo, theme } from '../src/log.mjs';
import { uuid } from '../src/third-party/uuid/api.mjs';

export default function startLiveReloadServer (initialHash) {
  const wss = new WebSocketServer({ port: 1234 });
  const state = {
    hash: initialHash,
    clients: {},
  };
  wss.on('connection', (ws) => {
    const key = uuid();
    logInfo(stoyle`Registering client ${key}`({ nodes: [ theme.strong ] }));
    state.clients[ key ] = ws;
  });

  wss.on('message', (messageAsString) => {
    const message = JSON.parse(messageAsString);
    if (message.hash !== state.hash) {
      sendReloadMessages(); // NOTE: optionally find a way to only reload the outdated pages (not MVP tho)
    }
  });

  function sendReloadMessage (key) {
    const ws = state.clients[ key ];
    ws.send(JSON.stringify({ reload: true }));
    delete state.clients[ key ];
  }

  function sendReloadMessages () {
    Object.keys(state.clients)
      .forEach((key) => sendReloadMessage(key));
  }

  return {
    reload (hash) {
      if (state.hash === hash) { return; }

      const clientsNumber = Object.keys(state.clients).length;
      logInfo(stoyle`Reloading ${clientsNumber} clients for new content ${hash}`({ nodes: [ theme.strong, theme.strong ] }));
      state.hash = hash;
      sendReloadMessages();
    },
  };
}
