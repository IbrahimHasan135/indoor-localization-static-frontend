// Public test broker: anonymous access; this topic namespace is not private.
const DEFAULT_MQTT_CONFIG = Object.freeze({
  url: 'wss://broker.hivemq.com:8884/mqtt',
  topic: 'atlas/indoor-lab/ibrohim-7c91e2/telemetry/node-01',
  username: ''
});

/** Application rules and connection state for MQTT. Depends on injected drivers. */
export class MqttConnectionService {
  constructor(mqttDriver, configStorageDriver) {
    this.mqttDriver = mqttDriver;
    this.configStorageDriver = configStorageDriver;
    this.config = configStorageDriver.load() || this.getDefaultConfig();
    this.handlers = {};
  }

  setHandlers(handlers) { this.handlers = handlers; }
  getSavedConfig() { return this.config; }
  getDefaultConfig() { return { ...DEFAULT_MQTT_CONFIG }; }
  get isConnected() { return this.mqttDriver.isConnected; }
  get isActive() { return this.mqttDriver.isActive; }

  connect(config) {
    let endpoint;
    try { endpoint = new URL(config.url.trim()); } catch { throw new Error('Enter a valid broker URL.'); }
    const hiveCloud = endpoint.hostname.endsWith('.hivemq.cloud');
    if (endpoint.username || endpoint.password) throw new Error('Enter credentials in the username and password fields, not in the URL.');
    // Only HiveMQ Cloud has a known equivalent browser listener on port 8884.
    if (hiveCloud && endpoint.protocol === 'mqtts:') {
      endpoint = new URL(`wss://${endpoint.hostname}:8884${endpoint.pathname || '/mqtt'}${endpoint.search}`);
    }
    if (!['ws:', 'wss:'].includes(endpoint.protocol)) throw new Error('Browser MQTT requires ws:// or wss://. Use the broker WebSocket listener.');
    if (hiveCloud) {
      if (endpoint.protocol !== 'wss:' || endpoint.port !== '8884') throw new Error('HiveMQ Cloud requires wss:// with port 8884 for browser connections.');
      if (!endpoint.pathname || endpoint.pathname === '/') endpoint.pathname = '/mqtt';
      if (!config.username?.trim() || !config.password) throw new Error('HiveMQ Cloud requires an active MQTT username and password. Re-enter the password; it is not saved after refresh.');
    }
    config = { ...config, url: endpoint.href, username: config.username?.trim() || '' };
    if (!config.topic) throw new Error('Enter a topic to subscribe to.');
    this.config = { url: config.url, topic: config.topic, username: config.username || '' };
    this.configStorageDriver.save(this.config);
    this.handlers.onStatus?.('connecting', `Connecting to ${config.url}`);
    try {
      this.mqttDriver.connect(config, {
        onConnected: (topic) => {
          this.handlers.onStatus?.('connected');
          this.handlers.onTopic?.(topic);
        },
        onStatus: (status, detail) => this.handlers.onStatus?.(status, detail),
        onMessage: (topic, payload) => this.handlers.onMessage?.(topic, payload),
        onError: (error) => this.handlers.onError?.(error)
      });
      return this.config;
    } catch (error) {
      this.handlers.onStatus?.('disconnected');
      throw error;
    }
  }

  disconnect() { this.mqttDriver.disconnect(); }
}
