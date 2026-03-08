import { useState } from 'react';
import { getUploadUrl, uploadToS3, debugProcessPhoto } from '@/lib/photos';
import { useI18nStore } from '@/store/i18nStore';

const IS_LOCAL = import.meta.env.VITE_API_URL?.includes('localhost');

export function usePhotoUpload(onSuccess?: () => void) {
    const { t } = useI18nStore();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const uploadPhoto = async (file: File) => {
        if (!file) return;

        setStatus('loading');
        setErrorMsg('');

        try {
            // 1. Get presigned URL
            const { uploadUrl, key } = await getUploadUrl(file.name, file.type);

            // 2. Upload to S3 (MinIO or AWS)
            await uploadToS3(uploadUrl, file);

            // 3. Local simulation (only for dev)
            if (IS_LOCAL) {
                console.log("Simulating S3 trigger locally...");
                await debugProcessPhoto(key);
            }

            setStatus('success');
            if (onSuccess) onSuccess();

            // Reset to idle after 2 seconds
            setTimeout(() => setStatus('idle'), 2000);
        } catch (err) {
            console.error("Upload error:", err);
            setStatus('error');
            setErrorMsg(t('rsvp.errorText'));
        }
    };

    return {
        uploadPhoto,
        status,
        errorMsg,
        resetStatus: () => setStatus('idle')
    };
}
