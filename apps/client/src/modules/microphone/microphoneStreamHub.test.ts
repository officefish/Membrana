import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  subscribeMicrophoneStream,
  publishMicrophoneStream,
  resetMicrophoneStreamHubForTests,
} from './microphoneStreamHub.ts';

afterEach(() => resetMicrophoneStreamHubForTests());

test('late subscriber receives last published stream', () => {
  const fakeStream = {} as MediaStream;
  publishMicrophoneStream('mod', fakeStream);

  const received: (MediaStream | null)[] = [];
  const unsub = subscribeMicrophoneStream('mod', (s) => received.push(s));

  assert.equal(received.length, 1);
  assert.equal(received[0], fakeStream);
  unsub();
});

test('late subscriber gets null when stream was stopped', () => {
  publishMicrophoneStream('mod', {} as MediaStream);
  publishMicrophoneStream('mod', null);

  const received: (MediaStream | null)[] = [];
  const unsub = subscribeMicrophoneStream('mod', (s) => received.push(s));

  assert.equal(received.length, 1);
  assert.equal(received[0], null);
  unsub();
});

test('unsubscribe stops listener from receiving further publishes', () => {
  const received: (MediaStream | null)[] = [];
  const unsub = subscribeMicrophoneStream('mod', (s) => received.push(s));
  publishMicrophoneStream('mod', {} as MediaStream);
  unsub();
  publishMicrophoneStream('mod', null);

  assert.equal(received.length, 1);
});

test('publish to moduleA does not fire listeners on moduleB (live path)', () => {
  const receivedB: (MediaStream | null)[] = [];
  const unsubB = subscribeMicrophoneStream('modB', (s) => receivedB.push(s));

  publishMicrophoneStream('modA', {} as MediaStream);

  assert.equal(receivedB.length, 0);
  unsubB();
});

test('late subscriber on moduleB does not receive replay from moduleA publish', () => {
  publishMicrophoneStream('modA', {} as MediaStream);

  const receivedB: (MediaStream | null)[] = [];
  const unsubB = subscribeMicrophoneStream('modB', (s) => receivedB.push(s));

  assert.equal(receivedB.length, 0);
  unsubB();
});
