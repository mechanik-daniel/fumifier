import fumifier from '../dist/index.mjs';
import { expect } from 'chai';

/**
 * Async sleep helper used to force interleaving across concurrent evaluations.
 *
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise<void>} Resolves after the delay.
 */
function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Concurrency safety', () => {
  it('should not leak $ (root input) across concurrent evaluations', async () => {
    const compiled = await fumifier('($before := $.payload; $pause($.delay); $after := $.payload; {"before": $before, "after": $after, "id": $executionId})');
    compiled.registerFunction('pause', pause);

    const inputs = [
      { payload: 'A', delay: 25 },
      { payload: 'B', delay: 5 },
      { payload: 'C', delay: 15 },
      { payload: 'D', delay: 1 }
    ];

    const results = await Promise.all(inputs.map((input) => compiled.evaluate(input)));

    for (let i = 0; i < results.length; i++) {
      expect(results[i].before).to.equal(inputs[i].payload);
      expect(results[i].after).to.equal(inputs[i].payload);
      expect(results[i].id).to.be.a('string');
    }

    const ids = results.map(r => r.id);
    expect(new Set(ids).size).to.equal(ids.length);
  });

  it('should not leak $ (root input) across concurrent verbose evaluations', async () => {
    const compiled = await fumifier('($before := $.payload; $pause($.delay); $after := $.payload; {"before": $before, "after": $after, "id": $executionId})');
    compiled.registerFunction('pause', pause);

    const inputs = [
      { payload: 'A', delay: 25 },
      { payload: 'B', delay: 5 },
      { payload: 'C', delay: 15 },
      { payload: 'D', delay: 1 }
    ];

    const reports = await Promise.all(inputs.map((input) => compiled.evaluateVerbose(input)));

    for (let i = 0; i < reports.length; i++) {
      expect(reports[i].status).to.equal(200);
      expect(reports[i].ok).to.equal(true);
      expect(reports[i].result.before).to.equal(inputs[i].payload);
      expect(reports[i].result.after).to.equal(inputs[i].payload);
      expect(reports[i].executionId).to.be.a('string');
      expect(reports[i].result.id).to.equal(reports[i].executionId);
    }

    const ids = reports.map(r => r.executionId);
    expect(new Set(ids).size).to.equal(ids.length);
  });

  it('should keep $millis stable within an evaluation (even across awaits)', async () => {
    const compiled = await fumifier('($start := $millis(); $pause(20); $end := $millis(); {"start": $start, "end": $end, "id": $executionId})');
    compiled.registerFunction('pause', pause);

    const results = await Promise.all(
      Array.from({ length: 10 }).map(() => compiled.evaluate({}))
    );

    results.forEach((r) => {
      expect(r.start).to.equal(r.end);
      expect(r.id).to.be.a('string');
    });
  });

  it('should not persist runtimeOptions.logger across evaluations', async () => {
    const logger1 = { debug() {}, info() {}, warnCount: 0, error() {}, warn() { this.warnCount++; } };
    const logger2 = { debug() {}, info() {}, warnCount: 0, error() {}, warn() { this.warnCount++; } };

    const compiled = await fumifier('$warn("hello")', { logger: logger2 });

    await compiled.evaluate({}, undefined, { logger: logger1 });
    expect(logger1.warnCount).to.equal(1);
    expect(logger2.warnCount).to.equal(0);

    await compiled.evaluate({});
    expect(logger1.warnCount).to.equal(1);
    expect(logger2.warnCount).to.equal(1);
  });
});
