import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useI18nStore } from '@/store/i18nStore';
import { verifyMagicLink } from '@/lib/auth';
import { Loader } from '@/components/Loader';

export default function Auth() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setAuth, token, _hasHydrated } = useAuthStore();
    const { t } = useI18nStore();

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [countryCode, setCountryCode] = useState('+39');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [accessCode, setAccessCode] = useState('');

    const rawPhone = searchParams.get('phone') || searchParams.get('phoneNumber');
    const urlPhone = rawPhone ? rawPhone.replace(/\s+/g, '+') : null;

    // Redirect se già loggato
    useEffect(() => {
        if (!_hasHydrated) return;
        if (token) {
            const redirectTo = searchParams.get('redirect') || '/rsvp';
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
            // We still use the library function, which we will update next to drop token
            const data = await verifyMagicLink({ phoneNumber: formattedPhone, accessCode });
            setAuth(data.jwt, data.guestName);
            setStatus('success');
            const redirectTo = searchParams.get('redirect') || '/rsvp';
            setTimeout(() => navigate(redirectTo, { replace: true }), 1500);
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
                {t('auth.subtitle')}
            </p>

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
            </form>
        </div>
    );
}
