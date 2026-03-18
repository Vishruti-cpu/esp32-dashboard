const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// AWS SDK v2
const { mqtt, iot, auth } = require('aws-iot-device-sdk-v2');

// Port
const PORT = process.env.PORT || 10000;

// 🔍 Debug ENV
console.log("AWS_ENDPOINT:", process.env.AWS_ENDPOINT);
console.log("AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? "✅ Present" : "❌ Missing");
console.log("AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY ? "✅ Present" : "❌ Missing");

// ❌ Stop if missing
if (!process.env.AWS_ENDPOINT || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error("❌ Missing AWS environment variables");
    process.exit(1);
}

// HTTP Server
const server = http.createServer((req, res) => {
    if (req.url === "/") {
        const filePath = path.join(__dirname, "dashboard.html");

        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end("Error loading HTML");
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

// WebSocket Server
const wss = new WebSocket.Server({ server });

// ✅ Use DEFAULT credentials provider (NO CRASH)
const credentialsProvider = auth.AwsCredentialsProvider.newDefault();

// AWS IoT Config
const config = iot.AwsIotMqttConnectionConfigBuilder
    .new_with_websockets({
        region: "us-east-1",
        credentials_provider: credentialsProvider
    })
    .with_clean_session(true)
    .with_client_id("web-client-" + Date.now())
    .with_endpoint(process.env.AWS_ENDPOINT)
    .build();

// MQTT Client
const client = new mqtt.MqttClient();
const connection = client.new_connection(config);

// Connect & Subscribe
connection.connect()
    .then(() => {
        console.log("✅ Connected to AWS IoT");

        return connection.subscribe(
            "esp32/sine",
            mqtt.QoS.AtLeastOnce,
            (topic, payload) => {

                let raw = payload.toString();
                console.log("📥 RAW:", raw);

                let value = parseFloat(raw);

                if (isNaN(value)) {
                    console.log("⚠️ Invalid data skipped");
                    return;
                }

                let data = JSON.stringify({ sine: value });

                console.log("📡 Sending:", data);

                wss.clients.forEach(ws => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(data);
                    }
                });
            }
        );
    })
    .catch(err => {
        console.log("❌ AWS Error:", err);
    });

// Start server
server.listen(PORT, () => {
    console.log("🚀 Server running on port " + PORT);
});
