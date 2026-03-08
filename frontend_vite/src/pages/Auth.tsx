import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BackBar } from '@/components/BackBar';
import { useAuthStore } from '@/store/authStore';
import { useI18nStore } from '@/store/i18nStore';
import { verifyMagicLink } from '@/lib/auth';

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

    const urlToken = searchParams.get('token');
    const rawPhone = searchParams.get('phone') || searchParams.get('phoneNumber');
    const urlPhone = rawPhone ? rawPhone.replace(/\s+/g, '+') : null;
    const urlEmail = searchParams.get('email');

    // Auto-verify magic link from URL
    useEffect(() => {
        if (!_hasHydrated) return;
        if (token) {
            navigate('/rsvp', { replace: true });
            return;
        }
        if (urlToken && (urlPhone || urlEmail)) {
            setStatus('loading');
            setIsLoading(true);
            verifyMagicLink({ token: urlToken, phoneNumber: urlPhone || '', email: urlEmail || undefined })
                .then((data) => {
                    setAuth(data.jwt, data.guestName);
                    setStatus('success');
                    setIsLoading(false);
                    setTimeout(() => navigate('/rsvp', { replace: true }), 1500);
                })
                .catch((err: Error) => {
                    setStatus('error');
                    setIsLoading(false);
                    setErrorMsg(err.message || t('auth.errorInvalid'));
                });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [_hasHydrated]);

    const handleManualLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus('loading');
        setErrorMsg('');
        try {
            const formattedPhone = `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;
            const data = await verifyMagicLink({ phoneNumber: formattedPhone, accessCode });
            setAuth(data.jwt, data.guestName);
            setStatus('success');
            setTimeout(() => navigate('/rsvp', { replace: true }), 1500);
        } catch (err: unknown) {
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : t('auth.errorInvalid'));
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="status-box">
                <div className="spinner purple" role="status" aria-label="Caricamento..." />
            </div>
        );
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

    if (status === 'error' && urlToken) {
        return (
            <>
                <BackBar title={t('auth.title')} />
                <div className="page-content">
                    <div className="status-box">
                        <div className="status-icon-circle error" aria-hidden="true">✕</div>
                        <h2 className="status-title">{t('auth.errorTitle')}</h2>
                        <p className="status-text">{errorMsg}</p>
                        <p className="status-text">{t('auth.errorCheck')}</p>
                        <button className="btn-secondary mt-4" onClick={() => setStatus('idle')}>
                            {t('auth.errorTryManual')}
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <BackBar title={t('auth.title')} />
            <div className="page-content">
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
                                placeholder="333 123 4567"
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
                            placeholder="1234"
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
        </>
    );
}
