import { useState, useEffect } from 'react';
import { Baby, User, Info } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useI18nStore } from '@/store/i18nStore';
import { getRsvp, submitEmail } from '@/lib/auth';
import { Loader } from '@/components/Loader';
import { Mail } from 'lucide-react';

interface Guest {
    name: string;
    isChild: boolean;
}

/**
 * Pagina RSVP in SOLA LETTURA: le conferme sono chiuse.
 * Gli invitati vedono i dati che hanno inviato (input disabilitati);
 * resta attiva solo la sezione "Aggiungi la tua email".
 */
export default function Rsvp() {
    const { t } = useI18nStore();
    const { setRsvpCompleted } = useAuthStore();

    const [attending, setAttending] = useState<boolean | null>(null);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [dietaryRestrictions, setDietaryRestrictions] = useState('');
    const [sleepAtCastle, setSleepAtCastle] = useState<boolean | null>(null);
    const [busInterested, setBusInterested] = useState<boolean | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading'>('loading');
    const [hasRsvp, setHasRsvp] = useState(false);

    // Email state from Profilo
    const [email, setEmail] = useState('');
    const [emailStatus, setEmailStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [emailError, setEmailError] = useState('');

    useEffect(() => {
        const loadRsvp = async () => {
            try {
                const data = await getRsvp();
                if (data && data.PK) {
                    setAttending(data.attending ?? null);
                    setGuests(data.guests ?? []);
                    setDietaryRestrictions(data.dietaryRestrictions ?? '');
                    setSleepAtCastle(data.sleepAtCastle ?? null);
                    setBusInterested(data.busInterested ?? null);
                    setRsvpCompleted(true);
                    setHasRsvp(true);
                }
                setStatus('idle');
            } catch (err) {
                console.error("Error loading RSVP:", err);
                setStatus('idle');
            }
        };
        loadRsvp();
    }, []);

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

    if (status === 'loading') {
        return <Loader />;
    }

    return (
        <main className="page-content">
            <h1 className="hero-title" style={{ fontSize: '32px', marginBottom: '24px' }}>
                {t('rsvp.title')}
            </h1>

            {/* Avviso: conferme chiuse, pagina in sola lettura */}
            <div className="form-card" style={{ marginBottom: 24, padding: '20px', borderLeft: '4px solid var(--color-primary)', background: 'rgba(255,255,255,0.8)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Info size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0, color: 'var(--color-text-primary)' }}>
                    {t('rsvp.readOnlyNotice')}
                </p>
            </div>

            {!hasRsvp ? (
                <div className="form-card" style={{ marginBottom: 24, padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    {t('rsvp.noRsvpFound')}
                </div>
            ) : (
                <div style={{ opacity: 0.85 }}>
                    <p style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                        {t('rsvp.attendingQuestion')}
                    </p>

                    {/* Attending (read-only) */}
                    <div style={{ marginBottom: 20 }}>
                        <div
                            className={`rsvp-option${attending === true ? ' selected' : ''}`}
                            aria-disabled="true"
                            style={{ cursor: 'default' }}
                        >
                            <span className="rsvp-option-radio" aria-hidden="true" />
                            <div className="rsvp-option-text">{t('rsvp.attending')}</div>
                        </div>

                        <div
                            className={`rsvp-option${attending === false ? ' selected' : ''}`}
                            aria-disabled="true"
                            style={{ cursor: 'default' }}
                        >
                            <span className="rsvp-option-radio" aria-hidden="true" />
                            <div className="rsvp-option-text">{t('rsvp.notAttending')}</div>
                        </div>
                    </div>

                    {/* Details only if attending */}
                    {attending === true && (
                        <div className="form-card" style={{ marginBottom: 20, padding: '20px' }}>
                            {guests.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {guests.map((guest, index) => (
                                        <div key={index} className="guest-item" style={{
                                            padding: '16px',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            background: 'rgba(255,255,255,0.5)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-primary)' }}>
                                                    # {index + 1}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                                    {guest.isChild
                                                        ? <><Baby size={16} /> {t('rsvp.isChild')}</>
                                                        : <><User size={16} /> {t('rsvp.isAdult')}</>}
                                                </span>
                                            </div>

                                            <input
                                                type="text"
                                                value={guest.name}
                                                disabled
                                                readOnly
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1.5px solid var(--color-border)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: 15,
                                                    background: '#f9fafb',
                                                    color: 'var(--color-text-primary)'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="form-group" style={{ marginTop: guests.length > 0 ? 24 : 0 }}>
                                <label className="form-label" htmlFor="dietary" style={{ fontSize: 15 }}>
                                    {t('rsvp.dietLabel')}
                                </label>
                                <textarea
                                    id="dietary"
                                    value={dietaryRestrictions}
                                    disabled
                                    readOnly
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        fontSize: 16,
                                        border: '1.5px solid var(--color-border)',
                                        borderRadius: 'var(--radius-sm)',
                                        resize: 'none',
                                        fontFamily: 'inherit',
                                        lineHeight: 1.5,
                                        background: '#f9fafb',
                                        color: 'var(--color-text-primary)'
                                    }}
                                />
                            </div>

                            {/* Castle answer (read-only) */}
                            <div className="form-group" style={{ marginTop: 24 }}>
                                <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>{t('rsvp.castleQuestion')}</p>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{
                                        flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center',
                                        border: `1.5px solid ${sleepAtCastle === true ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        background: sleepAtCastle === true ? 'rgba(124, 71, 232, 0.05)' : '#f9fafb',
                                        color: sleepAtCastle === true ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                                    }}>
                                        {t('rsvp.yes')}
                                    </div>
                                    <div style={{
                                        flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center',
                                        border: `1.5px solid ${sleepAtCastle === false ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        background: sleepAtCastle === false ? 'rgba(124, 71, 232, 0.05)' : '#f9fafb',
                                        color: sleepAtCastle === false ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                                    }}>
                                        {t('rsvp.no')}
                                    </div>
                                </div>
                            </div>

                            {/* Bus answer (read-only) */}
                            <div className="form-group" style={{ marginTop: 24 }}>
                                <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>{t('rsvp.busQuestion')}</p>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{
                                        flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center',
                                        border: `1.5px solid ${busInterested === true ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        background: busInterested === true ? 'rgba(124, 71, 232, 0.05)' : '#f9fafb',
                                        color: busInterested === true ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                                    }}>
                                        {t('rsvp.yes')}
                                    </div>
                                    <div style={{
                                        flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center',
                                        border: `1.5px solid ${busInterested === false ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        background: busInterested === false ? 'rgba(124, 71, 232, 0.05)' : '#f9fafb',
                                        color: busInterested === false ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                                    }}>
                                        {t('rsvp.no')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.8)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', marginTop: '24px' }}>
                <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, textAlign: 'center', color: 'var(--color-text-primary)' }}>
                    {t('rsvp.footerText')}
                </p>
            </div>

            {/* Email: unica sezione ancora attiva */}
            <div style={{ marginTop: '32px' }}>
                <section className="form-card" aria-labelledby="email-section-title">
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
                                disabled={emailStatus === 'saving'}
                            >
                                {emailStatus === 'saving' ? t('profile.emailSaving') : t('profile.emailBtn')}
                            </button>
                        </form>
                    )}
                </section>
            </div>
        </main>
    );
}
