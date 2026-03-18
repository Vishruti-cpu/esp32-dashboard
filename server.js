const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// ✅ NEW SDK (replace old one)
const { mqtt, iot, auth } = require('aws-iot-device-sdk-v2');

// 🌐 Port
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

// ✅ AWS IoT WebSocket config (FIXED)
const config = iot.AwsIotMqttConnectionConfigBuilder
    .new_with_websockets({
        region: "us-east-1",
        credentials_provider: auth.AwsCredentialsProvider.newStatic(
            process.env.AWS_KEY,
            process.env.AWS_SECRET,
            ""
        )
    })
    .with_clean_session(true)
    .with_client_id("web-client-" + Date.now())
    .with_endpoint(process.env.AWS_ENDPOINT)
    .build();

// MQTT client
const client = new mqtt.MqttClient();
const connection = client.new_connection(config);

// ✅ Connect to AWS
connection.connect()
    .then(() => {
        console.log("✅ Connected to AWS IoT");

        return connection.subscribe(
            "esp32/sine",
            mqtt.QoS.AtLeastOnce,
            (topic, payload) => {
               let data = payload.toString();
	console.log("DATA FROM AWS:", data);

                // send to browser
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

// 🚀 Start server
server.listen(PORT, () => {
    console.log("🚀 Server running on port " + PORT);
});
