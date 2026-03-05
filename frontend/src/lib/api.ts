import { useAuthStore } from '@/store/authStore';

export const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Errore API');
    }

    return data;
}
