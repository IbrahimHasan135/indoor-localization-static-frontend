/** Low-level browser adapter for MQTT.js. No localization rules live here. */
export class MqttClientDriver {
  constructor(mqttLibrary = window.mqtt) {
    this.mqttLibrary = mqttLibrary;
    this.client = null;
  }

  connect(config, handlers) {
    if (!this.mqttLibrary) throw new Error('MQTT.js did not load. Check your internet connection.');
    this.disconnect();

    const options = {
      clean: true, protocolVersion: 4, connectTimeout: 15000,
      reconnectPeriod: 3000, reconnectOnConnackError: false, resubscribe: false
    };
    if (config.username) options.username = config.username;
    if (config.password) options.password = config.password;

    const client = this.mqttLibrary.connect(config.url, options);
    this.client = client;
    let retries = 0;
    let detail = '';
    const active = () => this.client === client;
    const fail = (message) => {
      if (!active()) return;
      this.disconnect();
      handlers.onStatus('failed', message);
      handlers.onError(new Error(message));
    };
    const transportDetail = 'WebSocket connection closed. Check the broker endpoint, TLS certificate, network, and whether the cluster is running.';

    client.on('connect', () => {
      if (!active()) return;
      handlers.onStatus('connecting', 'Broker accepted the connection. Subscribing to your topic…');
      client.subscribe(config.topic, { qos: 0 }, (error, granted) => {
        if (!active()) return;
        if (error || !granted?.length || granted.some(({ qos }) => qos >= 128)) {
          fail('Subscription failed. Check the topic and Subscribe permission in HiveMQ Access Management.');
          return;
        }
        retries = 0;
        detail = '';
        handlers.onConnected(config.topic);
      });
    });
    client.on('message', (topic, payload) => {
      if (active()) handlers.onMessage(topic, payload.toString());
    });
    client.on('reconnect', () => {
      if (!active()) return;
      retries++;
      handlers.onStatus('reconnecting', `${detail || transportDetail} Retry ${retries + 1}/3…`);
    });
    client.on('close', () => {
      if (!active()) return;
      if (retries >= 2) {
        fail(`${detail || transportDetail} Automatic retries stopped after 3 attempts. Open settings to retry.`);
        return;
      }
      handlers.onStatus('reconnecting', `${detail || transportDetail} Retrying shortly…`);
    });
    client.on('error', (error) => {
      if (!active()) return;
      const code = Number(error.code);
      if ([4, 5, 134, 135, 140].includes(code) || /not authori[sz]ed|bad user|password|authentication/i.test(error.message)) {
        fail('Authentication rejected. Re-enter an active MQTT username and password from HiveMQ Access Management. Passwords are not saved after refresh.');
      } else if ([1, 2, 132, 133].includes(code)) {
        fail('Broker rejected the MQTT protocol or client ID. Check the broker configuration.');
      } else {
        // Browser WebSocket errors often contain no useful transport details.
        detail = transportDetail;
        handlers.onStatus('reconnecting', detail);
      }
    });
    return client;
  }

  disconnect() {
    if (!this.client) return;
    const client = this.client;
    this.client = null;
    client.end(true);
  }

  get isConnected() { return Boolean(this.client?.connected); }
  get isActive() { return this.client !== null; }
}
