import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const updates = read('src/components/HomeUpdates.tsx');
const exampleLocale = read('src/locales/example_language.ts');

test('updates include the six available driving photos and the event map', () => {
    for (let index = 1; index <= 6; index += 1) {
        assert.match(updates, new RegExp(`Foto%20${index}\\.webp`));
    }
    assert.match(updates, /mappa_evento\.webp/);
    assert.doesNotMatch(updates, /Foto%207\.webp/);
});

test('driving photos and the event map are lazy, expandable, and localized', () => {
    assert.match(updates, /loading="lazy"/);
    assert.match(updates, /target="_blank"/);
    assert.match(updates, /eventGuide\.drivingWarning/);
    assert.match(updates, /eventGuide\.eventMapTitle/);
    assert.match(exampleLocale, /drivingStep7/);
    assert.match(exampleLocale, /eventMapAlt/);
    assert.match(exampleLocale, /expandImage/);
});
