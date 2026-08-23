import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const photosApi = read('src/lib/photos.ts');
const uploadHook = read('src/hooks/usePhotoUpload.ts');
const photosPage = read('src/pages/Photos.tsx');

test('the browser upload has no complete or debug endpoint', () => {
    const removedRoute = new RegExp(['upload', 'complete'].join('/'));
    const removedDebugRoute = new RegExp(['debug', 'process'].join('-'));
    const removedCompleteFunction = new RegExp(['complete', 'Upload'].join(''));
    const removedDebugFunction = new RegExp(['debug', 'ProcessPhoto'].join(''));
    for (const forbidden of [removedRoute, removedDebugRoute, removedCompleteFunction, removedDebugFunction]) {
        assert.doesNotMatch(photosApi, forbidden);
        assert.doesNotMatch(uploadHook, forbidden);
    }
});

test('the S3 PUT is not retried and marks explicit HTTP responses', () => {
    assert.doesNotMatch(photosApi, /for\s*\(let attempt|setTimeout/);
    assert.match(photosApi, /if \(response\.ok\) return;/);
    assert.match(photosApi, /error\.storageResponded = true/);
});

test('abort is limited to explicit S3 failures', () => {
    assert.match(uploadHook, /photoId && shouldAbortStorageFailure\(photoId, err\)/);
    assert.match(uploadHook, /await abortUpload\(photoId\)/);
});

test('the UI has one refresh after the batch, no thumbnail polling, and a compact result toast', () => {
    const removedPollingConstant = ['THUMBNAIL', 'POLL'].join('_');
    const removedPollingState = ['thumbnail', 'PollAttempts'].join('');
    assert.match(uploadHook, /if \(onSuccess\) onSuccess\(\)/);
    assert.equal(photosPage.includes(removedPollingConstant), false);
    assert.equal(photosPage.includes(removedPollingState), false);
    assert.match(uploadHook, /Completati: \$\{summary\.ok\}/);
    assert.match(uploadHook, /summary\.ko > 0 \? \[`Errori: \$\{summary\.ko\}`\] : \[\]/);
    assert.match(uploadHook, /summary\.ok > 0 \? \[t\('gallery\.uploadProcessingNotice'\)\] : \[\]/);
});

test('admin UI renders completed, pending, and failed counters', () => {
    assert.match(photosPage, /counts\.completed/);
    assert.match(photosPage, /counts\.pending/);
    assert.match(photosPage, /counts\.failed/);
    assert.match(photosPage, /failureCode/);
});
