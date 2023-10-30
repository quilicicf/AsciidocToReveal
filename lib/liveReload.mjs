const ws = new WebSocket('ws://localhost:1234/live-reload');

ws.onopen = () => {
  console.log('Registering live-reload web socket: $$HASH$$');
  ws.send(JSON.stringify({ hash: '$$HASH$$' }));
};

ws.onmessage = () => location.reload();
