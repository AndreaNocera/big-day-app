import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Baby, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useI18nStore } from '@/store/i18nStore';
import { submitRsvp, getRsvp, submitEmail } from '@/lib/auth';
import { StatusModal } from '@/components/StatusModal';
import { Loader } from '@/components/Loader';
import { Mail } from 'lucide-react';

interface Guest {
    name: string;
    isChild: boolean;
}

export default function Rsvp() {
    const { t } = useI18nStore();
    const { setRsvpCompleted } = useAuthStore();

    const [attending, setAttending] = useState<boolean | null>(null);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [dietaryRestrictions, setDietaryRestrictions] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'submitting' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [showModal, setShowModal] = useState(false);

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
                    setRsvpCompleted(true);
                }
                setStatus('idle');
            } catch (err) {
                console.error("Error loading RSVP:", err);
                setStatus('idle'); // Allow filling even if load fails
            }
        };
        loadRsvp();
    }, []);

    const handleAddGuest = () => {
        setGuests([...guests, { name: '', isChild: false }]);
    };

    const handleRemoveGuest = (index: number) => {
        setGuests(guests.filter((_, i) => i !== index));
    };

    const updateGuest = (index: number, field: keyof Guest, value: string | boolean) => {
        const newGuests = [...guests];
        newGuests[index] = { ...newGuests[index], [field]: value };
        setGuests(newGuests);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (attending === null) return;
        setStatus('submitting');
        setErrorMsg('');
        try {
            await submitRsvp(attending, guests, dietaryRestrictions);
            setRsvpCompleted(true);
            setStatus('success');
            setShowModal(true);
            // Reset state to allow further edits if needed
            setTimeout(() => setStatus('idle'), 3000);
        } catch (err: unknown) {
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : t('rsvp.errorText'));
            setShowModal(true);
        }
    };

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

    return (
        <main className="page-content">
            <h1 className="hero-title" style={{ fontSize: '32px', marginBottom: '24px' }}>
                {t('rsvp.title')}
            </h1>

            {status === 'loading' && <Loader />}
            {status === 'submitting' && <Loader message={t('rsvp.submitting')} />}

            {showModal && (
                <StatusModal
                    status={status === 'success' || status === 'error' ? status : null}
                    message={status === 'success' ? t('rsvp.successText') : errorMsg}
                    onClose={() => setShowModal(false)}
                />
            )}

            {/* Attendance Step */}
            <form onSubmit={handleSubmit} noValidate>

                {/* Attending options */}
                <div style={{ marginBottom: 20 }}>
                    <button
                        type="button"
                        className={`rsvp-option${attending === true ? ' selected' : ''}`}
                        onClick={() => setAttending(true)}
                        aria-pressed={attending === true}
                    >
                        <span className="rsvp-option-radio" aria-hidden="true" />
                        <div className="rsvp-option-text">{t('rsvp.attending')}</div>
                    </button>

                    <button
                        type="button"
                        className={`rsvp-option${attending === false ? ' selected' : ''}`}
                        onClick={() => setAttending(false)}
                        aria-pressed={attending === false}
                    >
                        <span className="rsvp-option-radio" aria-hidden="true" />
                        <div className="rsvp-option-text">{t('rsvp.notAttending')}</div>
                    </button>
                </div>

                {/* Extra options only if attending */}
                {attending === true && (
                    <div className="form-card" style={{ marginBottom: 20, padding: '20px' }}>
                        <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.4 }}>
                            {t('rsvp.plusOneLabel')}
                        </p>

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
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveGuest(index)}
                                            style={{ color: '#ef4444', background: 'none', border: 'none', padding: 4 }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder={t('rsvp.guestNamePlaceholder')}
                                        value={guest.name}
                                        onChange={(e) => updateGuest(index, 'name', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            marginBottom: 12,
                                            border: '1.5px solid var(--color-border)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: 15
                                        }}
                                    />

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            type="button"
                                            onClick={() => updateGuest(index, 'isChild', false)}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                padding: '8px',
                                                fontSize: 14,
                                                borderRadius: 'var(--radius-sm)',
                                                border: `1.5px solid ${!guest.isChild ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                background: !guest.isChild ? 'rgba(124, 71, 232, 0.05)' : 'white',
                                                color: !guest.isChild ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                                            }}
                                        >
                                            <User size={16} /> {t('rsvp.isAdult')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateGuest(index, 'isChild', true)}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                padding: '8px',
                                                fontSize: 14,
                                                borderRadius: 'var(--radius-sm)',
                                                border: `1.5px solid ${guest.isChild ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                background: guest.isChild ? 'rgba(124, 71, 232, 0.05)' : 'white',
                                                color: guest.isChild ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                                            }}
                                        >
                                            <Baby size={16} /> {t('rsvp.isChild')}
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={handleAddGuest}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px',
                                    border: '2px dashed var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'none',
                                    color: 'var(--color-primary)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <UserPlus size={20} />
                                {t('rsvp.addGuestBtn')}
                            </button>
                        </div>

                        <div className="form-group" style={{ marginTop: 24 }}>
                            <label className="form-label" htmlFor="dietary" style={{ fontSize: 15 }}>
                                {t('rsvp.dietLabel')}
                            </label>
                            <textarea
                                id="dietary"
                                placeholder={t('rsvp.dietPlaceholder')}
                                value={dietaryRestrictions}
                                onChange={(e) => setDietaryRestrictions(e.target.value)}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    fontSize: 16,
                                    border: '1.5px solid var(--color-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    lineHeight: 1.5,
                                }}
                            />
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    className="btn-primary"
                    disabled={attending === null || status === 'submitting'}
                >
                    {status === 'submitting' ? t('rsvp.submitting') : t('rsvp.submit')}
                </button>
            </form>

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
