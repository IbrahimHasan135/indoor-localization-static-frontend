import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationService } from '../src/services/SimulationService.js';

test('motion stays slow, turns gradually, and remains inside the map over long runs', () => {
  let seed = 25;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const service = new SimulationService({ random });
  for (let i = 0; i < 36000; i++) {
    const previous = { ...service.position };
    const heading = service.heading;
    const position = service.step(0.1);
    assert.ok(Math.abs(Math.hypot(position.x - previous.x, position.y - previous.y) - 0.013) < 1e-10);
    assert.ok(Math.abs(service.heading - heading) <= 0.070001);
    assert.ok(Math.abs(position.x) < 2 && Math.abs(position.y) < 2);
  }
  const previous = { ...service.position };
  const position = service.step(60);
  assert.ok(Math.hypot(position.x - previous.x, position.y - previous.y) <= 0.019501);
});

test('pause and resume retain position, prevent duplicate timers, and reset cancels motion', () => {
  let callback, time = 0, scheduled = 0, cancelled = 0;
  const service = new SimulationService({
    random: () => 0.75, now: () => time,
    schedule(fn) { callback = fn; scheduled++; return 1; },
    cancel() { cancelled++; }
  });
  const positions = [];
  service.run(p => positions.push(p));
  service.run(() => assert.fail('duplicate timer'));
  assert.equal(scheduled, 1);
  time = 100; callback();
  service.pause();
  const position = { ...service.position };
  time = 60000;
  service.run(p => positions.push(p));
  assert.deepEqual(service.position, position);
  time += 100; callback();
  assert.equal(positions.length, 2);
  assert.equal(cancelled, 1);
  service.reset();
  assert.equal(service.isRunning, false);
  assert.deepEqual(service.position, { x: 0, y: 0 });
  assert.equal(cancelled, 2);
});
