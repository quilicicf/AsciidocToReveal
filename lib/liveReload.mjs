const exampleSocket = new WebSocket('ws://localhost:1234/live-reload');

exampleSocket.onopen = () => {
  console.log('Registering live-reload web socket');
  exampleSocket.send(JSON.stringify({ hash: '$$HASH$$' }));
};

exampleSocket.onmessage = (event) => location.reload();
