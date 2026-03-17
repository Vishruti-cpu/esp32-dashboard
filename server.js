const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;

// Serve HTML
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

// WebSocket
const wss = new WebSocket.Server({ server });

// Fake sine wave (for testing)
setInterval(() => {
    const value = 100 * Math.sin(Date.now()/1000);

    wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ sine: value }));
        }
    });
}, 200);

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
