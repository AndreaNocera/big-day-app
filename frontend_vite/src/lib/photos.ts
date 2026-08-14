import { fetchWithAuth } from './api';
import { usePhotoAccessStore } from '@/store/photoAccessStore';

export type MediaDeletionMode = 'logical' | 'physical';
const MEDIA_DELETE_BATCH_SIZE = 500;

export async function getPhotos() {
    const data = await fetchWithAuth('/photos');
    return data.photos || [];
}

export async function getAllPhotos() {
    const data = await fetchWithAuth('/admin/photos');
    return data.guests || [];
}

export async function getAdminMediaUrl(photoId: string, disposition: 'inline' | 'attachment' = 'inline') {
    return fetchWithAuth('/admin/photos/media-url', {
        method: 'POST',
        body: JSON.stringify({ photoId, disposition }),
    });
}

export async function deleteAdminMedia(photoIds: string[], mode: MediaDeletionMode) {
    const result = {
        mode,
        deletedCount: 0,
        missingCount: 0,
        deletedS3Objects: 0,
    };

    for (let index = 0; index < photoIds.length; index += MEDIA_DELETE_BATCH_SIZE) {
        const response = await fetchWithAuth('/admin/photos/delete', {
            method: 'POST',
            body: JSON.stringify({
                photoIds: photoIds.slice(index, index + MEDIA_DELETE_BATCH_SIZE),
                mode,
            }),
        });
        result.deletedCount += response.deletedCount || 0;
        result.missingCount += response.missingCount || 0;
        result.deletedS3Objects += response.deletedS3Objects || 0;
    }

    return result;
}

export async function deleteOwnMedia(photoId: string) {
    return fetchWithAuth('/photos/delete', {
        method: 'POST',
        body: JSON.stringify({ photoIds: [photoId], mode: 'physical' }),
    });
}

export async function getUploadUrl(filename: string, contentType: string) {
    // Il backend autorizza l'upload solo per admin o con codice foto valido
    const photoCode = usePhotoAccessStore.getState().photoCode;
    return fetchWithAuth('/photos/upload', {
        method: 'POST',
        headers: photoCode ? { 'X-Photo-Code': photoCode } : undefined,
        body: JSON.stringify({ filename, contentType }),
    });
}

export async function debugProcessPhoto(s3Key: string) {
    return fetchWithAuth('/photos/debug-process', {
        method: 'POST',
        body: JSON.stringify({ s3Key }),
    });
}

export async function uploadToS3(url: string, file: File, contentType: string) {
    const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': contentType,
        },
    });

    if (!response.ok) {
        throw new Error('Errore nel caricamento su S3');
    }

    return true;
}
