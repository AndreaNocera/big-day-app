/** Config condivisa per l'upload foto (Home e pagina Foto). */

/** Formati immagine ammessi: i piu' comuni da telefono. Deve combaciare con la whitelist del backend. */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Valore per l'attributo accept dell'input file (.jpg e .jpeg sono lo stesso formato). */
export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

export const MAX_FILES_PER_BATCH = 30;

export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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
