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

  connect(config) {
    if (!/^wss?:\/\//i.test(config.url)) throw new Error('Broker URL must start with ws:// or wss://');
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
        onStatus: (status) => this.handlers.onStatus?.(status),
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
