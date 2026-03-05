import { getApiUrl } from './api';

interface VerifyAuthArgs {
    token?: string;
    email?: string;
    phoneNumber?: string;
    accessCode?: string;
}

export async function verifyMagicLink(args: VerifyAuthArgs) {
    const response = await fetch(`${getApiUrl()}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Errore di autenticazione');

    return data;
}

export async function submitRsvp(attending: boolean, plusOne: boolean, dietaryRestrictions: string) {
    const { fetchWithAuth } = await import('./api');
    return fetchWithAuth('/rsvp', {
        method: 'POST',
        body: JSON.stringify({ attending, plusOne, dietaryRestrictions })
    });
}

export async function submitSurvey(surveyAnswers: unknown) {
    const { fetchWithAuth } = await import('./api');
    return fetchWithAuth('/survey', {
        method: 'POST',
        body: JSON.stringify({ surveyAnswers })
    });
}
