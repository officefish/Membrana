import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  subscribeMicrophoneStream,
  publishMicrophoneStream,
} from './microphoneStreamHub.ts';

test('late subscriber receives last published stream', () => {
  const moduleId = 'hub-late-receive';
  const fakeStream = {} as MediaStream;

  publishMicrophoneStream(moduleId, fakeStream);

  const received: (MediaStream | null)[] = [];
  const unsub = subscribeMicrophoneStream(moduleId, (s) => received.push(s));

  assert.equal(received.length, 1);
  assert.equal(received[0], fakeStream);
  unsub();
});

test('late subscriber gets null when stream was stopped', () => {
  const moduleId = 'hub-late-null';
  const fakeStream = {} as MediaStream;

  publishMicrophoneStream(moduleId, fakeStream);
  publishMicrophoneStream(moduleId, null);

  const received: (MediaStream | null)[] = [];
  const unsub = subscribeMicrophoneStream(moduleId, (s) => received.push(s));

  assert.equal(received.length, 1);
  assert.equal(received[0], null);
  unsub();
});

test('unsubscribe stops listener from receiving further publishes', () => {
  const moduleId = 'hub-unsub';
  const received: (MediaStream | null)[] = [];

  const unsub = subscribeMicrophoneStream(moduleId, (s) => received.push(s));
  publishMicrophoneStream(moduleId, {} as MediaStream);
  unsub();
  publishMicrophoneStream(moduleId, null);

  assert.equal(received.length, 1);
});

test('publish to one moduleId does not fire listeners on another moduleId', () => {
  const moduleA = 'hub-isolation-a';
  const moduleB = 'hub-isolation-b';
  const fakeStream = {} as MediaStream;

  const receivedB: (MediaStream | null)[] = [];
  const unsubB = subscribeMicrophoneStream(moduleB, (s) => receivedB.push(s));

  publishMicrophoneStream(moduleA, fakeStream);

  assert.equal(receivedB.length, 0);
  unsubB();
});
