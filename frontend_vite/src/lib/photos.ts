import { fetchWithAuth } from './api';

export async function getPhotos() {
    const data = await fetchWithAuth('/photos');
    return data.photos || [];
}

export async function getUploadUrl(filename: string, contentType: string) {
    return fetchWithAuth('/photos/upload', {
        method: 'POST',
        body: JSON.stringify({ filename, contentType }),
    });
}

export async function uploadToS3(url: string, file: File) {
    const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type,
        },
    });

    if (!response.ok) {
        throw new Error('Errore nel caricamento su S3');
    }

    return true;
}
