const WebSocket = require('ws');

const ws = new WebSocket('ws://10.76.74.85:3030');

ws.on('open', function open() {
  console.log('Connected to WS server successfully!');
  ws.close();
});

ws.on('error', function error(err) {
  console.error('WS Connection error:', err.message);
});
