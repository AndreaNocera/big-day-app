import { useState } from 'react';
import { getUploadUrl, uploadToS3, debugProcessPhoto } from '@/lib/photos';
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

const IS_LOCAL = import.meta.env.VITE_API_URL?.includes('localhost');

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

        let ok = 0;
        let ko = 0;
        let revoked = false;
        let nextIndex = 0;

        const worker = async () => {
            while (!revoked) {
                const index = nextIndex++;
                if (index >= valid.length) break;
                const { file, kind, contentType } = valid[index];
                try {
                    const { uploadUrl, key } = await getUploadUrl(file.name, contentType);
                    await uploadToS3(uploadUrl, file, contentType);
                    if (IS_LOCAL && kind === 'image') {
                        await debugProcessPhoto(key);
                    }
                    ok++;
                } catch (err) {
                    console.error('Upload error:', err);
                    // 403 = codice foto revocato: inutile continuare col resto del batch
                    if ((err as { status?: number })?.status === 403) {
                        revoked = true;
                    }
                    ko++;
                }
                setProgress(p => ({ ...p, done: p.done + 1 }));
            }
        };

        await Promise.all(
            Array.from({ length: Math.min(UPLOAD_CONCURRENCY, valid.length) }, worker)
        );

        if (revoked) {
            setStatus('error');
            setMessage(t('gallery.uploadRevoked'));
            setTimeout(() => setStatus('idle'), 5000);
            return;
        }

        if (ok > 0) {
            const summary = ko > 0
                ? fmt(t('gallery.uploadPartial'), { ok, ko })
                : fmt(t('gallery.uploadDoneMulti'), { n: ok });
            setStatus('success');
            setMessage([summary, ...notes].join(' · '));
            if (onSuccess) onSuccess();
        } else {
            setStatus('error');
            setMessage(t('rsvp.errorText'));
        }
        setTimeout(() => setStatus('idle'), 5000);
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
