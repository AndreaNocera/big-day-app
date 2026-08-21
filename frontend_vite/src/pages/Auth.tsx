import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePhotoAccessStore } from '@/store/photoAccessStore';
import { useI18nStore } from '@/store/i18nStore';
import { verifyMagicLink, registerPhotoGuest } from '@/lib/auth';
import { Loader } from '@/components/Loader';

export default function Auth() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setAuth, token, _hasHydrated } = useAuthStore();
    const { t } = useI18nStore();

    const { photoCode } = usePhotoAccessStore();
    const sessionExpired = searchParams.get('reason') === 'session-expired';

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [countryCode, setCountryCode] = useState('+39');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [accessCode, setAccessCode] = useState('');

    // Modalita' "photo guest": registrazione con nome e cognome,
    // disponibile solo per chi e' arrivato tramite il link speciale foto.
    // Se c'e' un codice foto, e' la modalita' proposta per prima;
    // il login con telefono + PIN resta raggiungibile dal link in basso.
    const [guestMode, setGuestMode] = useState<boolean | null>(sessionExpired ? false : null);
    const isGuestMode = (guestMode ?? true) && !!photoCode;
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    const rawPhone = searchParams.get('phone') || searchParams.get('phoneNumber');
    const urlPhone = rawPhone ? rawPhone.replace(/\s+/g, '+') : null;

    // Redirect se già loggato
    useEffect(() => {
        if (!_hasHydrated) return;
        if (token) {
            const redirectTo = searchParams.get('redirect') || '/';
            navigate(redirectTo, { replace: true });
        }
    }, [token, _hasHydrated, navigate, searchParams]);

    // Se esiste urlPhone e non è ancora stato impostato manualmente, possiamo precompilarlo
    useEffect(() => {
        if (urlPhone && !phoneNumber) {
            setPhoneNumber(urlPhone.replace(/^\+39/, '')); // Semplificazione per mostrare solo il numero se italiano
            if (urlPhone.startsWith('+39')) setCountryCode('+39');
        }
    }, [urlPhone, phoneNumber]);

    const handleManualLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus('loading');
        setErrorMsg('');
        try {
            const formattedPhone = `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;
            const data = await verifyMagicLink({ phoneNumber: formattedPhone, accessCode });
            setAuth(data.jwt, data.guestName, data.isAdmin ?? false, data.isPhotoGuest ?? false);
            setStatus('success');
            const redirectTo = searchParams.get('redirect') || '/';
            setTimeout(() => navigate(redirectTo, { replace: true }), 1500);
        } catch (err: unknown) {
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : t('auth.errorInvalid'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!photoCode) return;
        setIsLoading(true);
        setStatus('loading');
        setErrorMsg('');
        try {
            const data = await registerPhotoGuest(photoCode, firstName.trim(), lastName.trim());
            setAuth(data.jwt, data.guestName, false, true);
            setStatus('success');
            setTimeout(() => navigate('/', { replace: true }), 1500);
        } catch (err: unknown) {
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : t('auth.errorInvalid'));
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'loading') {
        return <Loader />;
    }

    if (status === 'success') {
        return (
            <div className="status-box">
                <div className="status-icon-circle success" aria-hidden="true">✓</div>
                <h2 className="status-title">{t('auth.success')}</h2>
                <p className="status-text">{t('auth.redirecting')}</p>
            </div>
        );
    }

    // The error is now shown inline within the form for manual login.
    return (
        <div className="page-content">
            <h1 className="hero-title" style={{ fontSize: '32px', marginBottom: '24px' }}>
                {t('auth.title')}
            </h1>
            <p className="text-muted mb-4" style={{ fontSize: '16px', lineHeight: '1.6' }}>
                {isGuestMode ? t('auth.guestSubtitle') : t('auth.subtitle')}
            </p>

            {sessionExpired && (
                <div className="auth-session-expired" role="status">
                    {t('auth.sessionExpired')}
                </div>
            )}

            {isGuestMode ? (
                <>
                    <form onSubmit={handleGuestRegister} className="form-card" noValidate>
                        <p className="auth-guest-register-help">
                            {t('auth.guestRegisterHelp')}
                        </p>

                        {status === 'error' && (
                            <div className="form-error" role="alert">{errorMsg}</div>
                        )}

                        <div className="form-group">
                            <label className="form-label" htmlFor="first-name">{t('auth.firstNameLabel')}</label>
                            <input
                                id="first-name"
                                type="text"
                                className="form-input"
                                required
                                placeholder={t('auth.firstNamePlaceholder')}
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                autoComplete="given-name"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="last-name">{t('auth.lastNameLabel')}</label>
                            <input
                                id="last-name"
                                type="text"
                                className="form-input"
                                required
                                placeholder={t('auth.lastNamePlaceholder')}
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                autoComplete="family-name"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary mt-6"
                            disabled={isLoading || !firstName.trim() || !lastName.trim()}
                        >
                            {isLoading ? t('auth.loading') : t('auth.guestRegisterBtn')}
                        </button>
                    </form>

                    <div
                        className="auth-mode-divider"
                        role="separator"
                        aria-label={t('auth.guestModeDivider')}
                    >
                        <span aria-hidden="true" />
                        <strong>{t('auth.guestModeDivider')}</strong>
                        <span aria-hidden="true" />
                    </div>

                    <button
                        type="button"
                        className="auth-existing-login"
                        onClick={() => { setGuestMode(false); setStatus('idle'); setErrorMsg(''); }}
                    >
                        <span className="auth-existing-login-icon" aria-hidden="true">
                            <LogIn size={22} />
                        </span>
                        <span className="auth-existing-login-copy">
                            <strong>{t('auth.loginBtn')}</strong>
                            <span>{t('auth.guestBackToLogin')}</span>
                        </span>
                        <ChevronRight className="auth-existing-login-chevron" size={22} aria-hidden="true" />
                    </button>
                </>
            ) : (
            <form onSubmit={handleManualLogin} className="form-card" noValidate>
                {status === 'error' && (
                    <div className="form-error" role="alert">{errorMsg}</div>
                )}

                <div className="form-group">
                    <label className="form-label" htmlFor="phone-number">{t('auth.phoneLabel')}</label>
                    <div className="phone-row">
                        <select
                            id="country-code"
                            className="form-input select"
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            aria-label="Prefisso internazionale"
                        >
                            <option value="+39">🇮🇹 +39</option>
                            <option value="+34">🇪🇸 +34</option>
                            <option value="+33">🇫🇷 +33</option>
                            <option value="+44">🇬🇧 +44</option>
                            <option value="+54">🇦🇷 +54</option>
                        </select>
                        <input
                            id="phone-number"
                            type="tel"
                            className="form-input"
                            required
                            placeholder={t('auth.phonePlaceholder')}
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            autoComplete="tel-national"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="pin">{t('auth.pinLabel')}</label>
                    <input
                        id="pin"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        required
                        placeholder={t('auth.pinPlaceholder')}
                        className="form-input pin"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, ''))}
                        autoComplete="one-time-code"
                    />
                </div>

                <button
                    type="submit"
                    className="btn-primary mt-6"
                    disabled={isLoading}
                >
                    {isLoading ? t('auth.loading') : t('auth.loginBtn')}
                </button>

                {photoCode && (
                    <button
                        type="button"
                        className="text-muted"
                        style={{ background: 'none', border: 'none', marginTop: 16, textDecoration: 'underline', cursor: 'pointer', width: '100%' }}
                        onClick={() => { setGuestMode(true); setStatus('idle'); setErrorMsg(''); }}
                    >
                        {t('auth.guestModeLink')}
                    </button>
                )}
            </form>
            )}
        </div>
    );
}
