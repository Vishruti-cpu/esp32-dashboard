const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;

// =====================
// HTTP Server
// =====================
const server = http.createServer((req, res) => {
    if (req.url === "/") {
        const filePath = path.join(__dirname, "dashboard.html");

        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end("Error loading dashboard.html");
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

// =====================
// WebSocket Server
// =====================
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("✅ Client connected");
});

// =====================
// Receive Data from ESP32
// =====================
// ESP32 will send data to this server
wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        console.log("📥 Received:", message.toString());

        // Broadcast to all clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });
});

// =====================
// Start Server
// =====================
server.listen(PORT, () => {
    console.log("🚀 Server running on port", PORT);
});
