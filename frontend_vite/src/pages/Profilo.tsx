import { useState } from 'react';
import { LogOut, Mail } from 'lucide-react';
import { BackBar } from '@/components/BackBar';
import { useAuthStore } from '@/store/authStore';
import { useI18nStore } from '@/store/i18nStore';
import { submitEmail } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

export default function Profilo() {
    const { t } = useI18nStore();
    const { guestName, logout } = useAuthStore();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [emailStatus, setEmailStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [emailError, setEmailError] = useState('');

    const initials = guestName
        ? guestName
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : '?';

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailStatus('saving');
        setEmailError('');
        try {
            await submitEmail(email);
            setEmailStatus('success');
            setEmail('');
        } catch (err: unknown) {
            setEmailStatus('error');
            setEmailError(err instanceof Error ? err.message : 'Errore');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/', { replace: true });
    };

    return (
        <>
            <BackBar title={t('profile.title')} />
            <main className="page-content">
                {/* Avatar + name */}
                <div className="profile-header">
                    <div className="profile-avatar-large" aria-hidden="true">
                        {initials}
                    </div>
                    <h1 className="profile-name">{guestName}</h1>
                </div>

                {/* Add email section */}
                <section className="section-card" aria-labelledby="email-section-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <Mail size={20} color="var(--color-primary)" aria-hidden="true" />
                        <h2 id="email-section-title" className="section-title" style={{ margin: 0 }}>
                            {t('profile.emailTitle')}
                        </h2>
                    </div>

                    {emailStatus === 'success' ? (
                        <p style={{ color: 'var(--color-success)', fontWeight: 500 }}>
                            ✓ {t('profile.emailSuccess')}
                        </p>
                    ) : (
                        <form onSubmit={handleEmailSubmit} noValidate>
                            {emailStatus === 'error' && (
                                <div className="form-error">{emailError}</div>
                            )}
                            <div className="form-group">
                                <label className="form-label" htmlFor="email">
                                    {t('profile.emailLabel')}
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    className="form-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn-primary"
                                style={{ height: 48, fontSize: 15 }}
                                disabled={emailStatus === 'saving'}
                            >
                                {emailStatus === 'saving' ? t('profile.emailSaving') : t('profile.emailBtn')}
                            </button>
                        </form>
                    )}
                </section>

                {/* Logout */}
                <button
                    className="btn-secondary mt-6"
                    onClick={handleLogout}
                    aria-label={t('profile.logout')}
                    style={{ width: '100%' }}
                >
                    <LogOut size={18} aria-hidden="true" />
                    {t('profile.logout')}
                </button>
            </main>
        </>
    );
}
