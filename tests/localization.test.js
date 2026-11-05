import test from 'node:test';
import assert from 'node:assert/strict';
import { AppController } from '../src/controllers/AppController.js';
import { LocalizationService } from '../src/services/LocalizationService.js';
import { MessageLogService } from '../src/services/MessageLogService.js';

test('raw MQTT messages are logged without updating the position, even with x/y', () => {
  let handlers;
  const rendered = [];
  const localizationService = new LocalizationService();
  const messageLogService = new MessageLogService();
  const view = new Proxy({}, { get: (_, method) => (...args) => {
    if (method === 'renderPosition') rendered.push(args);
  } });
  const connectionService = {
    setHandlers(value) { handlers = value; },
    getSavedConfig() { return null; }
  };
  const controller = new AppController({ view, connectionService, localizationService, messageLogService });
  for (const payload of ['{"x":1,"y":1}', '{"position":{"x":1,"y":1}}', '{"rssi":-65}', 'invalid JSON']) {
    handlers.onMessage('devices/telemetry', payload);
  }
  assert.equal(messageLogService.count, 4);
  assert.deepEqual(localizationService.getTrajectory(), []);
  assert.equal(rendered.length, 0);
  controller.onLocalizationResult({ x: 0.6, y: -0.4 });
  assert.equal(rendered.length, 1);
  assert.deepEqual(localizationService.getTrajectory(), [{ x: 0.6, y: -0.4 }]);
  controller.clearLogs();
  assert.equal(localizationService.getTrajectory().length, 1);
  controller.resetMap();
  assert.deepEqual(localizationService.getTrajectory(), []);
});

test('cloud results require finite numeric coordinates and stay within map bounds', () => {
  const service = new LocalizationService();
  for (const result of [null, {}, { x: null, y: 1 }, { x: '1', y: 1 }, { x: Infinity, y: 1 }, { x: 1, y: NaN }]) {
    assert.equal(service.processResult(result), null);
  }
  assert.deepEqual(service.processResult({ x: 4, y: -3 }).position, { x: 2, y: -2 });
});

test('demo stays separate from telemetry and valid cloud results take over its trajectory', () => {
  let actions, tick;
  const renders = [];
  const simulationService = {
    isRunning: false, position: { x: 0, y: 0 },
    reset() { this.isRunning = false; this.position = { x: 0, y: 0 }; },
    run(callback) { this.isRunning = true; tick = callback; },
    pause() { this.isRunning = false; }
  };
  const view = new Proxy({}, { get: (_, method) => (...args) => {
    if (method === 'bindActions') actions = args[0];
    if (method === 'renderPosition') renders.push(args);
  } });
  const localizationService = new LocalizationService();
  const messageLogService = new MessageLogService();
  const controller = new AppController({
    view, localizationService, messageLogService, simulationService,
    connectionService: { setHandlers() {}, getSavedConfig() { return null; } }
  });
  actions.onToggleSimulation();
  tick({ x: 0.01, y: 0.01 });
  assert.equal(simulationService.isRunning, true);
  assert.equal(renders.at(-1)[4], 'simulation');
  assert.equal(messageLogService.count, 0);
  controller.onIncomingMessage('telemetry', '{"x":1,"y":1}');
  assert.equal(renders.length, 2);
  controller.onLocalizationResult({ x: null, y: 1 });
  assert.equal(simulationService.isRunning, true);
  controller.onLocalizationResult({ x: 1, y: 0.5 });
  assert.equal(simulationService.isRunning, false);
  assert.deepEqual(localizationService.getTrajectory(), [{ x: 1, y: 0.5 }]);
  assert.equal(renders.at(-1)[4], 'cloud');
  actions.onToggleSimulation();
  assert.deepEqual(localizationService.getTrajectory(), [{ x: 0, y: 0 }]);
  actions.onResetMap();
  assert.equal(simulationService.isRunning, false);
  assert.deepEqual(localizationService.getTrajectory(), []);
  assert.equal(messageLogService.count, 1);
});
