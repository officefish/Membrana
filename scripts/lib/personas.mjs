/**
 * Single reader for the virtual-team voice registry.
 *
 * Source of truth stays in docs/virtual-team/voices.registry.json. This module only
 * reads it and exposes named projections used by scripts.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const VOICES_REGISTRY_PATH = resolve(REPO_ROOT, 'docs/virtual-team/voices.registry.json');

const ROLE_LABEL_BY_PROMPT_FILE = Object.freeze({
  'docs/virtual-team/PROMPT_TEAMLEAD.md': 'Teamlead',
  'docs/virtual-team/PROMPT_ARCHITECT.md': 'Архитектор',
  'docs/virtual-team/PROMPT_STRUCTURER.md': 'Структурщик',
  'docs/virtual-team/PROMPT_MATHEMATICIAN.md': 'Математик',
  'docs/virtual-team/PROMPT_MUSICIAN.md': 'Музыкант',
  'docs/virtual-team/PROMPT_LAYOUT_DEVELOPER.md': 'Верстальщик',
  'docs/virtual-team/PROMPT_ANGELINA.md': 'Секретарь',
  'docs/virtual-team/PROMPT_FARRELL.md': 'Свободный голос',
});

const CONSILIUM_ROLE_KEY_BY_PROMPT_FILE = Object.freeze({
  'docs/virtual-team/PROMPT_TEAMLEAD.md': 'teamlead',
  'docs/virtual-team/PROMPT_ARCHITECT.md': 'architect',
  'docs/virtual-team/PROMPT_STRUCTURER.md': 'structurer',
  'docs/virtual-team/PROMPT_MATHEMATICIAN.md': 'mathematician',
  'docs/virtual-team/PROMPT_MUSICIAN.md': 'musician',
  'docs/virtual-team/PROMPT_LAYOUT_DEVELOPER.md': 'layout',
});

const byCodePoint = (a, b) => String(a).localeCompare(String(b), 'en');

export function loadVoiceRegistry(path = VOICES_REGISTRY_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadVoices(path = VOICES_REGISTRY_PATH) {
  const raw = loadVoiceRegistry(path);
  return Object.freeze(Array.isArray(raw?.voices) ? raw.voices : []);
}

export function loadKnownPersonaIds(path = VOICES_REGISTRY_PATH) {
  return Object.freeze(loadVoices(path).map((v) => String(v?.id ?? '')).filter((id) => id !== ''));
}

export function roleLabelOfVoice(voice) {
  const fromPrompt = ROLE_LABEL_BY_PROMPT_FILE[voice?.promptFile];
  if (fromPrompt) return fromPrompt;
  return String(voice?.kind ?? voice?.id ?? 'voice');
}

export function personaRoleLabels(voices = loadVoices()) {
  return Object.freeze(Object.fromEntries(voices.map((v) => [v.id, roleLabelOfVoice(v)])));
}

export function voicesWithCallable(callable, voices = loadVoices()) {
  return Object.freeze(voices.filter((v) => (v.callable ?? []).includes(callable)));
}

export function askPersonas(voices = loadVoices()) {
  return Object.freeze(Object.fromEntries(
    voicesWithCallable('ask', voices).map((v) => [
      v.id,
      Object.freeze({
        role: roleLabelOfVoice(v),
        promptFile: v.promptFile,
        description: `${v.human ?? v.id} — ${roleLabelOfVoice(v)}. ${String(v.notes ?? '').trim()}`,
      }),
    ]),
  ));
}

export function consiliumPersonaFiles(voices = loadVoices()) {
  const rows = voicesWithCallable('consilium', voices)
    .map((v) => [CONSILIUM_ROLE_KEY_BY_PROMPT_FILE[v.promptFile], v.promptFile])
    .filter(([key, file]) => key && file);
  return Object.freeze(Object.fromEntries(rows));
}

export function consiliumRoleKeyToSlug(voices = loadVoices()) {
  const rows = voicesWithCallable('consilium', voices)
    .map((v) => [CONSILIUM_ROLE_KEY_BY_PROMPT_FILE[v.promptFile], v.id])
    .filter(([key, id]) => key && id);
  return Object.freeze(Object.fromEntries(rows));
}

export function authorPersonas(extra = ['human'], voices = loadVoices()) {
  return Object.freeze([...loadKnownPersonaIdsFromVoices(voices), ...extra].sort(byCodePoint));
}

export function loadKnownPersonaIdsFromVoices(voices) {
  return Object.freeze(voices.map((v) => String(v?.id ?? '')).filter((id) => id !== ''));
}

export const ASK_PERSONAS = askPersonas();
export const CONSILIUM_PERSONA_FILES = consiliumPersonaFiles();
export const CONSILIUM_ROLE_KEY_TO_SLUG = consiliumRoleKeyToSlug();
export const PERSONA_ROLE_LABELS = personaRoleLabels();
export const AUTHOR_PERSONAS = authorPersonas();
