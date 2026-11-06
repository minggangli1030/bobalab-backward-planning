import test from 'node:test';
import assert from 'node:assert/strict';
import { patternGenerator as patterns } from '../src/utils/patternGenerator.js';
import { taskDependencies as dependencies } from '../src/utils/taskDependencies.js';

test('seeded slider sequence reproduces across a session restart', () => {
  patterns.initializeSeed(42);
  const first = Array.from({length: 100}, (_, i) => patterns.generateSliderPattern(i + 1));
  patterns.initializeSeed(42);
  assert.deepEqual(Array.from({length: 100}, (_, i) => patterns.generateSliderPattern(i + 1)), first);
  assert.ok(first.every(p => p.target >= 0 && p.target <= 10));
});

test('difficulty transitions match the experiment contract', () => {
  for (const [level, difficulty] of [[1, 'easy'], [10, 'easy'], [11, 'medium'], [24, 'medium'], [25, 'hard'], [100, 'hard']]) {
    assert.equal(patterns.generateCountingPattern(level).difficulty, difficulty);
    assert.equal(patterns.generateSliderPattern(level).difficulty, difficulty);
  }
});

test('practice activation reaches target tasks and can be cleared', () => {
  dependencies.clearAllDependencies();
  assert.deepEqual(dependencies.checkDependencies('g2t1', true), ['g1t1', 'g1t2', 'g1t3']);
  assert.equal(dependencies.getActiveDependency('g1t2').type, 'highlight');
  dependencies.clearAllDependencies();
  assert.equal(dependencies.getActiveDependency('g1t2'), null);
});
