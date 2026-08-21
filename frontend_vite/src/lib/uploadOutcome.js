export function shouldAbortStorageFailure(photoId, error) {
    return Boolean(photoId && error?.storageResponded === true);
}

export function summarizeUploadOutcomes(outcomes) {
    return outcomes.reduce(
        (summary, outcome) => {
            if (outcome?.ok) summary.ok += 1;
            else summary.ko += 1;
            return summary;
        },
        { ok: 0, ko: 0 },
    );
}
