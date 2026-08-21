export interface UploadOutcomeLike {
    ok: boolean;
}

export function shouldAbortStorageFailure(photoId: string | null, error: unknown): boolean;
export function summarizeUploadOutcomes(outcomes: UploadOutcomeLike[]): { ok: number; ko: number };
