import { useState } from 'react';
import {
    abortUpload,
    getUploadUrl,
    uploadToS3,
} from '@/lib/photos';
import { useI18nStore } from '@/store/i18nStore';
import {
    MAX_IMAGE_SIZE_BYTES,
    MAX_IMAGE_SIZE_MB,
    MAX_VIDEO_SIZE_BYTES,
    MAX_VIDEO_SIZE_MB,
    UPLOAD_CONCURRENCY,
    fmt,
    getMediaKind,
    getSupportedContentType,
    type MediaKind,
} from '@/lib/uploadConfig';
import { shouldAbortStorageFailure, summarizeUploadOutcomes } from '@/lib/uploadOutcome.js';

interface ValidatedMedia {
    file: File;
    kind: MediaKind;
    contentType: string;
}

interface PendingUpload {
    valid: ValidatedMedia[];
    notes: string[];
}

export interface UploadConfirmation {
    photos: number;
    videos: number;
    notes: string[];
}

interface UploadOutcome {
    ok: boolean;
    cleanup: 'completed' | 'deferred' | 'not-needed';
}

export function usePhotoUpload(onSuccess?: () => void) {
    const { t } = useI18nStore();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [message, setMessage] = useState('');
    const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

    /** Valida un batch senza limite numerico e apre il riepilogo applicativo. */
    const uploadPhotos = (fileList: FileList | File[]) => {
        const files = Array.from(fileList);
        if (files.length === 0) return;

        const notes: string[] = [];

        // Validazione formato e dimensione
        const classified = files.map(file => ({
            file,
            contentType: getSupportedContentType(file),
        }));
        const badFormat = classified.filter(item => !item.contentType);
        const tooBigImages = classified.filter(item =>
            item.contentType && getMediaKind(item.contentType) === 'image' && item.file.size > MAX_IMAGE_SIZE_BYTES
        );
        const tooBigVideos = classified.filter(item =>
            item.contentType && getMediaKind(item.contentType) === 'video' && item.file.size > MAX_VIDEO_SIZE_BYTES
        );
        const valid = classified.flatMap(({ file, contentType }) => {
            if (!contentType) return [];

            const kind = getMediaKind(contentType);
            if (!kind) return [];

            const maxSize = kind === 'image' ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
            return file.size <= maxSize ? [{ file, kind, contentType }] : [];
        });

        if (badFormat.length > 0) {
            notes.push(fmt(t('gallery.uploadSkippedFormat'), { n: badFormat.length }));
        }
        if (tooBigImages.length > 0) {
            notes.push(fmt(t('gallery.uploadSkippedImageSize'), { n: tooBigImages.length, mb: MAX_IMAGE_SIZE_MB }));
        }
        if (tooBigVideos.length > 0) {
            notes.push(fmt(t('gallery.uploadSkippedVideoSize'), { n: tooBigVideos.length, mb: MAX_VIDEO_SIZE_MB }));
        }

        if (valid.length === 0) {
            setStatus('error');
            setMessage(fmt(t('gallery.uploadNoneValid'), {
                imageMb: MAX_IMAGE_SIZE_MB,
                videoMb: MAX_VIDEO_SIZE_MB,
            }));
            setTimeout(() => setStatus('idle'), 5000);
            return;
        }

        setStatus('idle');
        setMessage('');
        setPendingUpload({ valid, notes });
    };

    /** Avvia l'upload solo dopo la conferma esplicita nella modale. */
    const confirmUpload = async () => {
        if (!pendingUpload) return;
        const { valid, notes } = pendingUpload;
        setPendingUpload(null);

        setStatus('loading');
        setProgress({ done: 0, total: valid.length });
        setMessage('');

        let revoked = false;
        let nextIndex = 0;
        const outcomes: Array<UploadOutcome | undefined> = new Array(valid.length);

        const worker = async () => {
            while (!revoked) {
                const index = nextIndex++;
                if (index >= valid.length) break;
                const { file, contentType } = valid[index];
                let photoId: string | null = null;
                try {
                    const uploadSession = await getUploadUrl(file.name, contentType);
                    const { uploadUrl } = uploadSession;
                    photoId = uploadSession.photoId;
                    if (!photoId) throw new Error('Sessione di upload non valida');
                    await uploadToS3(uploadUrl, file, contentType);
                    outcomes[index] = {
                        ok: true,
                        cleanup: 'not-needed',
                    };
                } catch (err) {
                    console.error('Upload error:', err);
                    // 403 = codice foto revocato: inutile continuare col resto del batch
                    if (!photoId && (err as { status?: number })?.status === 403) {
                        revoked = true;
                    }
                    let cleanup: UploadOutcome['cleanup'] = photoId
                        ? 'deferred'
                        : 'not-needed';
                    // Soltanto una risposta HTTP esplicitamente negativa da S3
                    // prova che il PUT non e' riuscito. Errori di rete e timeout
                    // restano pending e vengono riconciliati dal backend.
                    if (photoId && shouldAbortStorageFailure(photoId, err)) {
                        try {
                            await abortUpload(photoId);
                            cleanup = 'completed';
                        } catch (cleanupError) {
                            // Il reaper backend eliminera' la sessione pending scaduta.
                            console.error('Deferred upload cleanup:', cleanupError);
                        }
                    }
                    outcomes[index] = {
                        ok: false,
                        cleanup,
                    };
                }
                setProgress(p => ({ ...p, done: p.done + 1 }));
            }
        };

        await Promise.all(
            Array.from({ length: Math.min(UPLOAD_CONCURRENCY, valid.length) }, worker)
        );

        // Se il codice e' stato revocato, i file non ancora iniziati sono KO
        // senza risorse allocate da ripulire.
        valid.forEach((_, index) => {
            if (!outcomes[index]) {
                outcomes[index] = {
                    ok: false,
                    cleanup: 'not-needed',
                };
            }
        });

        const completedOutcomes = outcomes.filter((item): item is UploadOutcome => !!item);
        const succeeded = completedOutcomes.filter(item => item.ok);
        const failed = completedOutcomes.filter(item => !item.ok);
        const summary = summarizeUploadOutcomes(completedOutcomes);
        const resultLines = [
            `OK: ${summary.ok}`,
            `KO: ${summary.ko}`,
        ];
        const resultIntro = t('gallery.uploadCompleteTitle');

        if (revoked) {
            setStatus('error');
            setMessage([t('gallery.uploadRevoked'), ...resultLines, ...notes].join('\n'));
            setTimeout(() => setStatus('idle'), 15000);
            return;
        }

        if (succeeded.length > 0) {
            setStatus(failed.length > 0 ? 'error' : 'success');
            setMessage([
                resultIntro,
                ...resultLines,
                t('gallery.uploadProcessingNotice'),
                ...notes,
            ].join('\n'));
            if (onSuccess) onSuccess();
        } else {
            setStatus('error');
            setMessage([resultIntro, ...resultLines, ...notes].join('\n'));
        }
        setTimeout(() => setStatus('idle'), 15000);
    };

    const cancelUpload = () => {
        setPendingUpload(null);
    };

    const uploadConfirmation: UploadConfirmation | null = pendingUpload
        ? {
            photos: pendingUpload.valid.filter(item => item.kind === 'image').length,
            videos: pendingUpload.valid.filter(item => item.kind === 'video').length,
            notes: pendingUpload.notes,
        }
        : null;

    return {
        uploadPhotos,
        confirmUpload,
        cancelUpload,
        uploadConfirmation,
        status,
        progress,
        message,
        resetStatus: () => setStatus('idle'),
    };
}
