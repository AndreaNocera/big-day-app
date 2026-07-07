import { useState } from 'react';
import { getUploadUrl, uploadToS3, debugProcessPhoto } from '@/lib/photos';
import { useI18nStore } from '@/store/i18nStore';
import {
    ALLOWED_IMAGE_TYPES,
    MAX_FILES_PER_BATCH,
    MAX_FILE_SIZE_BYTES,
    MAX_FILE_SIZE_MB,
    UPLOAD_CONCURRENCY,
    fmt,
} from '@/lib/uploadConfig';

const IS_LOCAL = import.meta.env.VITE_API_URL?.includes('localhost');

export function usePhotoUpload(onSuccess?: () => void) {
    const { t } = useI18nStore();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [message, setMessage] = useState('');

    /** Carica un batch di file: valida formato/dimensione, poi upload con concorrenza limitata. */
    const uploadPhotos = async (fileList: FileList | File[]) => {
        const all = Array.from(fileList);
        if (all.length === 0) return;

        const notes: string[] = [];

        // Limite per batch: prendiamo i primi N e avvisiamo
        let files = all;
        if (files.length > MAX_FILES_PER_BATCH) {
            files = files.slice(0, MAX_FILES_PER_BATCH);
            notes.push(fmt(t('gallery.uploadTooMany'), { max: MAX_FILES_PER_BATCH }));
        }

        // Validazione formato e dimensione
        const badFormat = files.filter(f => !ALLOWED_IMAGE_TYPES.includes(f.type));
        const tooBig = files.filter(f => ALLOWED_IMAGE_TYPES.includes(f.type) && f.size > MAX_FILE_SIZE_BYTES);
        const valid = files.filter(f => ALLOWED_IMAGE_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE_BYTES);

        if (badFormat.length > 0) {
            notes.push(fmt(t('gallery.uploadSkippedFormat'), { n: badFormat.length }));
        }
        if (tooBig.length > 0) {
            notes.push(fmt(t('gallery.uploadSkippedSize'), { n: tooBig.length, mb: MAX_FILE_SIZE_MB }));
        }

        if (valid.length === 0) {
            setStatus('error');
            setMessage(fmt(t('gallery.uploadNoneValid'), { mb: MAX_FILE_SIZE_MB }));
            setTimeout(() => setStatus('idle'), 5000);
            return;
        }

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
                const file = valid[index];
                try {
                    const { uploadUrl, key } = await getUploadUrl(file.name, file.type);
                    await uploadToS3(uploadUrl, file);
                    if (IS_LOCAL) {
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

    return {
        uploadPhotos,
        status,
        progress,
        message,
        resetStatus: () => setStatus('idle'),
    };
}
