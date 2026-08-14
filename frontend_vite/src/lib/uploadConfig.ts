/** Config condivisa per l'upload di foto e video (Home e pagina Foto). */

export type MediaKind = 'image' | 'video';

/** Formati ammessi: i piu' comuni da telefono. Devono combaciare con la whitelist del backend. */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
export const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

/** Valore per l'attributo accept dell'input file. */
export const ACCEPT_ATTR = [
    '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.mp4', '.mov', '.webm',
    ...ALLOWED_MEDIA_TYPES,
].join(',');

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
};

/** Nessun limite al numero di file selezionabili; resta un limite per singolo file. */
export const MAX_IMAGE_SIZE_MB = 20;
export const MAX_VIDEO_SIZE_MB = 500;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

export function getMediaKind(contentType: string): MediaKind | null {
    if (ALLOWED_IMAGE_TYPES.includes(contentType)) return 'image';
    if (ALLOWED_VIDEO_TYPES.includes(contentType)) return 'video';
    return null;
}

/** Alcuni browser mobili non valorizzano file.type: in quel caso usa l'estensione selezionata. */
export function getSupportedContentType(file: Pick<File, 'name' | 'type'>): string | null {
    const normalizedType = file.type.toLowerCase();
    if (ALLOWED_MEDIA_TYPES.includes(normalizedType)) return normalizedType;

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    return CONTENT_TYPE_BY_EXTENSION[extension] || null;
}

/** Upload contemporanei: compromesso tra velocita' e robustezza su rete mobile. */
export const UPLOAD_CONCURRENCY = 3;

/** Sostituisce i placeholder {nome} in una stringa di traduzione. */
export function fmt(template: string, vars: Record<string, string | number>): string {
    return Object.entries(vars).reduce(
        // split/join = replaceAll, ma senza richiedere lib es2021
        (acc, [key, value]) => acc.split(`{${key}}`).join(String(value)),
        template
    );
}
