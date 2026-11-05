import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { MqttClientDriver } from '../src/drivers/MqttClientDriver.js';
import { MqttConnectionService } from '../src/services/MqttConnectionService.js';

function setup() {
  const clients = [], statuses = [], errors = [], topics = [];
  const library = { connect(url, options) {
    const client = new EventEmitter();
    client.url = url; client.options = options; client.ended = false;
    client.end = () => { client.ended = true; client.emit('close'); };
    client.subscribe = (topic, options, callback) => { client.subscriptionCallback = callback; };
    clients.push(client);
    return client;
  } };
  const driver = new MqttClientDriver(library);
  const handlers = {
    onStatus: (...args) => statuses.push(args), onError: error => errors.push(error.message),
    onConnected: topic => topics.push(topic), onMessage() {}
  };
  driver.connect({ url: 'wss://example.org/mqtt', topic: 'telemetry' }, handlers);
  return { driver, handlers, clients, statuses, errors, topics };
}

test('authentication refusal stops reconnecting and leaves a persistent explanation', () => {
  const { driver, clients, statuses, errors } = setup();
  clients[0].emit('error', Object.assign(new Error('Connection refused'), { code: 5 }));
  clients[0].emit('close');
  assert.equal(driver.isActive, false);
  assert.equal(clients[0].ended, true);
  assert.equal(statuses.at(-1)[0], 'failed');
  assert.match(statuses.at(-1)[1], /Authentication rejected/);
  assert.equal(errors.length, 1);
});

test('transport failures stop after three attempts and do not alternate with disconnected', () => {
  const { driver, clients, statuses } = setup();
  const client = clients[0];
  client.emit('close');
  for (let i = 0; i < 2; i++) { client.emit('reconnect'); client.emit('close'); }
  assert.equal(driver.isActive, false);
  assert.equal(statuses.at(-1)[0], 'failed');
  assert.match(statuses.at(-1)[1], /3 attempts/);
  assert.ok(statuses.every(([status]) => status !== 'disconnected'));
});

test('subscription denial fails, and stale callbacks cannot overwrite a newer connection', () => {
  const { driver, clients, statuses, topics, handlers } = setup();
  clients[0].emit('connect');
  clients[0].subscriptionCallback(null, [{ topic: 'telemetry', qos: 128 }]);
  assert.equal(statuses.at(-1)[0], 'failed');
  assert.deepEqual(topics, []);
  driver.connect({ url: 'wss://example.org/mqtt', topic: 'new' }, handlers);
  clients[1].emit('connect');
  clients[1].subscriptionCallback(null, [{ topic: 'new', qos: 0 }]);
  const count = statuses.length;
  clients[0].emit('error', new Error('late error'));
  clients[0].subscriptionCallback(null, [{ topic: 'telemetry', qos: 0 }]);
  assert.equal(statuses.length, count);
  assert.deepEqual(topics, ['new']);
  driver.disconnect();
  assert.equal(driver.isActive, false);
});

test('HiveMQ Cloud URL conversion, required credentials, and password-free persistence', () => {
  let connected, saved;
  const service = new MqttConnectionService({ connect(config) { connected = config; } }, {
    load: () => null, save(config) { saved = config; }
  });
  const config = { url: 'mqtts://sample.s1.eu.hivemq.cloud:8883', topic: 'telemetry', username: 'test', password: 'test-password' };
  service.connect(config);
  assert.equal(connected.url, 'wss://sample.s1.eu.hivemq.cloud:8884/mqtt');
  assert.equal(connected.password, config.password);
  assert.equal('password' in saved, false);
  assert.equal('password' in service.getSavedConfig(), false);
  assert.throws(() => service.connect({ ...config, password: '' }), /Re-enter the password/);
  assert.throws(() => service.connect({ ...config, url: 'wss://sample.s1.eu.hivemq.cloud:8883/mqtt' }), /port 8884/);
  assert.throws(() => service.connect({ ...config, url: 'mqtts://another.example:8883' }), /WebSocket listener/);
  service.connect({ ...config, url: 'wss://sample.s1.eu.hivemq.cloud:8884' });
  assert.equal(connected.url, 'wss://sample.s1.eu.hivemq.cloud:8884/mqtt');
});
