/** Low-level browser adapter for MQTT.js. No localization rules live here. */
export class MqttClientDriver {
  constructor(mqttLibrary = window.mqtt) {
    this.mqttLibrary = mqttLibrary;
    this.client = null;
  }

  connect(config, handlers) {
    if (!this.mqttLibrary) throw new Error('MQTT.js did not load. Check your internet connection.');
    this.disconnect();

    const options = { clean: true, connectTimeout: 10000, reconnectPeriod: 3000 };
    if (config.username) options.username = config.username;
    if (config.password) options.password = config.password;

    const client = this.mqttLibrary.connect(config.url, options);
    this.client = client;
    client.on('connect', () => client.subscribe(config.topic, { qos: 0 }, (error) => {
      if (error) handlers.onError(error);
      else handlers.onConnected(config.topic);
    }));
    client.on('message', (topic, payload) => handlers.onMessage(topic, payload.toString()));
    client.on('reconnect', () => handlers.onStatus('reconnecting'));
    client.on('close', () => {
      if (this.client === client) handlers.onStatus('disconnected');
    });
    client.on('error', (error) => handlers.onError(error));
    return client;
  }

  disconnect() {
    if (!this.client) return;
    this.client.end(true);
    this.client = null;
  }

  get isConnected() {
    return Boolean(this.client?.connected);
  }
}
