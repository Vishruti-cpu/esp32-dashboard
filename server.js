const http = require('http');
const WebSocket = require('ws');
const mqtt = require('mqtt');

// 🌐 Create HTTP server (required for Render)
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Server is running");
});

// ✅ Use dynamic port (VERY IMPORTANT)
const PORT = process.env.PORT || 10000;

// 🔌 WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ server });

// 🌍 AWS IoT MQTT connection
const client = mqtt.connect('mqtts://YOUR-ENDPOINT.amazonaws.com:8883', {
    key: require('fs').readFileSync('private.key'),
    cert: require('fs').readFileSync('certificate.crt'),
    ca: require('fs').readFileSync('AmazonRootCA1.pem'),
    clientId: 'web-dashboard-' + Math.random().toString(16).substr(2, 8)
});

// When connected to AWS IoT
client.on('connect', () => {
    console.log("✅ Connected to AWS IoT");

    // subscribe to topic
    client.subscribe('esp32/sine');
});

// When message comes from ESP32 via AWS
client.on('message', (topic, message) => {
    let data = message.toString();

    // send to all WebSocket clients
    wss.clients.forEach(clientWS => {
        if (clientWS.readyState === WebSocket.OPEN) {
            clientWS.send(data);
        }
    });
});

// WebSocket connection
wss.on('connection', (ws) => {
    console.log("🌐 Browser connected");
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
