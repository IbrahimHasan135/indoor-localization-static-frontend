# Atlas · Indoor Localization Showcase

A static HTML, CSS, and JavaScript dashboard for raw MQTT telemetry and cloud-computed indoor positioning. Devices publish lightweight measurements; a separate cloud service performs localization. This repository contains no backend or localization algorithm.

## Architecture

Dependencies are composed in `app.js`:

- **Controller** (`src/controllers/AppController.js`) coordinates UI actions and services.
- **Services** (`src/services/`) manage connections, raw message history, and validated cloud-result trajectory state.
- **Drivers** (`src/drivers/`) adapt MQTT.js, browser storage, and dashboard DOM operations.

Data flows are separate:

```text
Device measurements → MQTT broker → raw telemetry logs
                             └→ cloud localization → result adapter → position map
```

The cloud service and result adapter are **not implemented**. All messages from the configured MQTT subscription go to logs only, even if they contain `x`, `y`, `position`, or `location` fields. Connecting the telemetry broker does not activate the map.

## Run locally

Run `python3 -m http.server 8000` from this directory and open `http://localhost:8000`. ES modules require HTTP instead of `file://`. There is no build or package installation step.

## Connect a telemetry broker

Open **Connection settings** and click **Save & connect**. First use defaults to [HiveMQ's public test broker](https://www.mqtt-dashboard.com/):

- Browser WebSocket URL: `wss://broker.hivemq.com:8884/mqtt` (the `/mqtt` path is required).
- Device host: `broker.hivemq.com`; MQTT TCP port `1883`, or TLS port `8883`.
- Telemetry topic: `atlas/indoor-lab/ibrohim-7c91e2/telemetry/node-01`.
- Username and password: **leave both empty**; public access is anonymous.

Publish device measurements to exactly the same topic. For another node, use a distinct final segment such as `node-02`, and change the dashboard subscription to match (or use `atlas/indoor-lab/ibrohim-7c91e2/telemetry/+` to monitor all nodes).

Saved custom settings take precedence. **Use HiveMQ public** restores the public defaults in the form; **Save & connect** applies them. The topic prefix reduces accidental collisions but provides no access control: anyone can read or publish to it. Use test data only; this public broker provides no uptime guarantee.

Payloads are logged as received; no device JSON schema is imposed. The URL, topic, and username are saved in local storage. Passwords are used for the active connection only.

## Private HiveMQ Cloud connections

Enter the cluster WebSocket URL `wss://your-cluster.s1.eu.hivemq.cloud:8884/mqtt`, the device topic, and active MQTT credentials from HiveMQ Access Management. You can also paste a HiveMQ Cloud `mqtts://…:8883` URI: the dashboard converts it to the WebSocket listener. The ESP still uses MQTT TLS on port 8883. The browser creates its own client ID.

Passwords are never saved; re-enter the password after refreshing or reopening settings. A missing password is caught before connecting. Authentication or subscription rejection stops the connection and leaves an explanation in the status strip. Transport failures retry up to three total attempts, then stop. **Cancel connection** stops an in-progress attempt or reconnection. The browser cannot determine every TLS/network failure; check the cluster endpoint, certificate, network, and cluster availability when a WebSocket connection closes.

## Cloud localization integration

The map starts empty, with coordinate values shown as `—`. A future cloud-result adapter should call `AppController.onLocalizationResult({ x, y }, receivedAt)` with finite numeric coordinates in meters. This is an internal integration hook, not an HTTP endpoint or an active subscription. Wire the adapter through `app.js` once the cloud transport and result schema are defined. Do not route raw device messages into it.

`LocalizationService` validates already computed coordinates and holds the path; it performs no localization computation. The 4 × 4 m map is centered at `(0, 0)` with both axes ranging from `−2` to `2` meters. Positive Y points upward. Display coordinates are clamped to map bounds.

## Movement preview

Click **Run demo** above the map to preview a simulated node moving at approximately 0.13 m/s. It advances continuously toward random interior targets and turns gradually. **Pause** freezes the preview; **Resume** continues from the same point. **Reset map** stops it and clears the trajectory. The display retains up to 1,200 recent points.

Demo positions are labeled as simulated and never enter MQTT logs. Starting a demo clears the previous map path. A valid cloud result stops the preview and starts a separate cloud trajectory. This preview runs locally without a broker or cloud service.

## Logs and validation

Telemetry history stays in page memory. Filter, export with **Export JSON**, or use **Clear logs**. Clearing logs does not reset positioning; **Reset map** clears the position and trajectory. Refresh clears both.

Run `node --test` for regression checks of telemetry/result separation and cloud coordinate validation. Run `git diff --check` before review. Check desktop and mobile layouts in a browser after UI changes. Mock-based tests do not verify a live broker or cloud service.

MQTT.js and Google Fonts load from external CDNs. Network access is needed for those assets and live broker connectivity.
