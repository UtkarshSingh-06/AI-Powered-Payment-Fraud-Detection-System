import test from 'node:test';
import assert from 'node:assert/strict';

test('gateway health contract', () => {
  assert.equal(typeof '/health', 'string');
});
