import { fetchWithAuth } from './api';
import { usePhotoAccessStore } from '@/store/photoAccessStore';

export async function getPhotos() {
    const data = await fetchWithAuth('/photos');
    return data.photos || [];
}

export async function getAllPhotos() {
    const data = await fetchWithAuth('/admin/photos');
    return data.guests || [];
}

export async function getAdminVideoUrl(photoId: string, disposition: 'inline' | 'attachment' = 'inline') {
    return fetchWithAuth('/admin/photos/media-url', {
        method: 'POST',
        body: JSON.stringify({ photoId, disposition }),
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
