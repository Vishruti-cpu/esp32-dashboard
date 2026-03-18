const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const { mqtt, iot, auth } = require('aws-iot-device-sdk-v2');

// =====================
// Environment Variables
// =====================
const {
    AWS_ENDPOINT,
    AWS_KEY,
    AWS_SECRET,
    AWS_REGION,
    PORT
} = process.env;

const SERVER_PORT = PORT || 10000;

// =====================
// Debug Logs
// =====================
console.log("AWS_ENDPOINT:", AWS_ENDPOINT);
console.log("AWS_KEY:", AWS_KEY ? "✅ Present" : "❌ Missing");
console.log("AWS_SECRET:", AWS_SECRET ? "✅ Present" : "❌ Missing");
console.log("AWS_REGION:", AWS_REGION);

// =====================
// Stop if Missing Variables
// =====================
if (!AWS_ENDPOINT || !AWS_KEY || !AWS_SECRET || !AWS_REGION) {
    console.error("❌ Missing AWS environment variables");
    process.exit(1);
}

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

// =====================
// AWS Credentials (Using Render Variables)
// =====================
const credentialsProvider = auth.AwsCredentialsProvider.newStatic(
    AWS_KEY,
    AWS_SECRET,
    null
);

// =====================
// AWS IoT MQTT Configuration
// =====================
const config = iot.AwsIotMqttConnectionConfigBuilder
    .new_with_websockets({
        region: AWS_REGION,
        credentials_provider: credentialsProvider
    })
    .with_clean_session(true)
    .with_client_id("web-client-" + Date.now())
    .with_endpoint(AWS_ENDPOINT)
    .build();

// =====================
// MQTT Client
// =====================
const client = new mqtt.MqttClient();
const connection = client.new_connection(config);

// =====================
// Connect to AWS IoT
// =====================
connection.connect()
    .then(() => {
        console.log("✅ Connected to AWS IoT");

        return connection.subscribe(
            "esp32/sine",
            mqtt.QoS.AtLeastOnce,
            (topic, payload) => {

                const raw = payload.toString();
                console.log("📥 RAW:", raw);

                const value = parseFloat(raw);

                if (isNaN(value)) {
                    console.log("⚠️ Invalid data skipped");
                    return;
                }

                const data = JSON.stringify({ sine: value });

                wss.clients.forEach(ws => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(data);
                    }
                });

                console.log("📡 Sent to clients:", data);
            }
        );
    })
    .catch(err => {
        console.error("❌ AWS Connection Error:", err);
    });

// =====================
// Start Server
// =====================
server.listen(SERVER_PORT, () => {
    console.log("🚀 Server running on port", SERVER_PORT);
});
