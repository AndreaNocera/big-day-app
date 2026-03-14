import { getApiUrl, fetchWithAuth } from './api';

interface VerifyAuthArgs {
    phoneNumber: string;
    accessCode: string;
}

export async function verifyMagicLink(args: VerifyAuthArgs) {
    const response = await fetch(`${getApiUrl()}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Errore di autenticazione');
    return data;
}

export async function getRsvp() {
    return fetchWithAuth('/rsvp', {
        method: 'GET',
    });
}

export async function submitRsvp(
    attending: boolean,
    guests: Array<{ name: string; isChild: boolean }>,
    dietaryRestrictions: string,
    sleepAtCastle: boolean | null,
    busInterested: boolean | null
) {
    return fetchWithAuth('/rsvp', {
        method: 'POST',
        body: JSON.stringify({ attending, guests, dietaryRestrictions, sleepAtCastle, busInterested }),
    });
}

export async function submitSurvey(surveyAnswers: unknown) {
    return fetchWithAuth('/survey', {
        method: 'POST',
        body: JSON.stringify({ surveyAnswers }),
    });
}

export async function submitEmail(email: string) {
    return fetchWithAuth('/profile/email', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

export async function getAllRsvps() {
    return fetchWithAuth('/admin/rsvps');
}
