const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const awsIot = require('aws-iot-device-sdk');

// 🌐 Port (Render uses dynamic port)
const PORT = process.env.PORT || 10000;

// 🌐 Serve HTML
const server = http.createServer((req, res) => {
    if (req.url === "/") {
        const filePath = path.join(__dirname, "dashboard.html");

        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end("Error loading file");
            } else {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(content);
            }
        });
    } else {
        res.writeHead(404);
        res.end("Not Found");
    }
});

// 🔌 WebSocket server
const wss = new WebSocket.Server({ server });

// ☁️ AWS IoT connection (NO certificates)
const device = awsIot.device({
    protocol: 'wss',
    host: process.env.AWS_ENDPOINT,   // e.g. xxxxx-ats.iot.ap-south-1.amazonaws.com
    region: 'us-east-1',
    accessKeyId: process.env.AWS_KEY,
    secretKey: process.env.AWS_SECRET
});

// ✅ Connected to AWS
device.on('connect', () => {
    console.log("✅ Connected to AWS IoT");
    device.subscribe('esp32/sine');
});

// 📡 When data comes from ESP32 via AWS
device.on('message', (topic, payload) => {
    let data = payload.toString();

    // send to browser
    wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });
});

// 🚀 Start server
server.listen(PORT, () => {
    console.log("🚀 Server running on port " + PORT);
});
