import assert from 'node:assert/strict';
import test from 'node:test';

import {
    shouldAbortStorageFailure,
    summarizeUploadOutcomes,
} from '../src/lib/uploadOutcome.js';


test('all successful uploads are counted as OK', () => {
    assert.deepEqual(
        summarizeUploadOutcomes([{ ok: true }, { ok: true }, { ok: true }]),
        { ok: 3, ko: 0 },
    );
});

test('mixed upload results keep numerical OK and KO totals', () => {
    assert.deepEqual(
        summarizeUploadOutcomes([{ ok: true }, { ok: false }, { ok: true }]),
        { ok: 2, ko: 1 },
    );
});

test('an explicit S3 HTTP response enables abort', () => {
    assert.equal(
        shouldAbortStorageFailure('PHOTO#test', { status: 503, storageResponded: true }),
        true,
    );
});

test('network errors and timeouts never enable abort', () => {
    assert.equal(shouldAbortStorageFailure('PHOTO#test', new TypeError('network error')), false);
    const timeout = new Error('timeout');
    timeout.name = 'AbortError';
    assert.equal(shouldAbortStorageFailure('PHOTO#test', timeout), false);
});
