# Atlas · Indoor Localization Showcase

A static HTML, CSS, and JavaScript frontend for exploring an indoor localization monitor. There is no backend and no location algorithm in this project. The page subscribes to an MQTT topic over WebSocket, records incoming messages in the browser session, and visualizes coordinates when a payload includes `x` and `y` in meters.

## Run locally

Open `index.html` in a browser, or serve this folder using any static file server. MQTT browser connectivity requires a broker with a WebSocket listener and appropriate browser CORS/origin access. Use `wss://` for a secure hosted page.

## Connect a broker

Choose **Connection settings** and enter the WebSocket URL, topic, and optional username/password. The URL should look like `wss://broker.example.com:8084/mqtt`. Raw MQTT TCP endpoints such as port 1883 cannot be opened directly by browser JavaScript. Broker credentials are used for the active connection and are not saved; the URL, topic, and username are saved in local storage.

## Position message shape

The visualization accepts JSON in any of these shapes:

```json
{"x": 0.6, "y": -0.4}
```

```json
{"position": {"x": 0.6, "y": -0.4}}
```

```json
{"location": {"x": 0.6, "y": -0.4}}
```

The 4 × 4 m map is centered at `(0, 0)`, so both coordinates range from `-2` to `2` meters. Positive Y points toward the top of the map. Incoming JSON is still shown in the message stream even when it does not contain coordinates. In that case, it will not move the marker.

## Logs

Incoming topic, timestamp, and payload are held in page memory. Use **Export JSON** to download them or **Clear logs** to remove them. Refreshing the page clears the message stream and trajectory.

## Dependencies

MQTT.js is loaded from the unpkg CDN. A network connection is needed for broker messaging and for the MQTT client library.
