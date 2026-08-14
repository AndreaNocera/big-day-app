import { useAuthStore } from '@/store/authStore';

let handlingUnauthorized = false;

function redirectToLoginAfterUnauthorized() {
    if (handlingUnauthorized || typeof window === 'undefined') return;
    handlingUnauthorized = true;

    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const redirectPath = currentPath.startsWith('/accedi') ? '/' : currentPath;
    const params = new URLSearchParams({
        redirect: redirectPath,
        reason: 'session-expired',
    });

    // Rimuove soltanto la sessione applicativa. L'eventuale codice foto resta
    // nel relativo store, cosi' l'utente puo' autenticarsi di nuovo senza
    // dover scansionare una seconda volta il QR code.
    useAuthStore.getState().logout();
    window.location.replace(`/accedi?${params.toString()}`);
}

export const getApiUrl = () => {
    return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const token = useAuthStore.getState().token;
    const headers = new Headers(options.headers);

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');

    const response = await fetch(`${getApiUrl()}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401 && token) {
            redirectToLoginAfterUnauthorized();
        }
        const error = new Error(data.error || 'Errore API') as Error & { status?: number };
        error.status = response.status;
        throw error;
    }

    return data;
}
