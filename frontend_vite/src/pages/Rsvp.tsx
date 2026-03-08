import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { BackBar } from '@/components/BackBar';
import { useAuthStore } from '@/store/authStore';
import { useI18nStore } from '@/store/i18nStore';
import { submitRsvp } from '@/lib/auth';

export default function Rsvp() {
    const { t } = useI18nStore();
    const { rsvpCompleted, setRsvpCompleted } = useAuthStore();

    const [attending, setAttending] = useState<boolean | null>(null);
    const [plusOne, setPlusOne] = useState(false);
    const [dietaryRestrictions, setDietaryRestrictions] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    if (rsvpCompleted) {
        return (
            <>
                <BackBar title={t('rsvp.title')} />
                <div className="page-content">
                    <div className="status-box">
                        <div className="status-icon-circle success" aria-hidden="true">
                            <CheckCircle2 size={36} />
                        </div>
                        <h2 className="status-title">{t('rsvp.successTitle')}</h2>
                        <p className="status-text">{t('rsvp.successText')}</p>
                    </div>
                </div>
            </>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (attending === null) return;
        setStatus('submitting');
        setErrorMsg('');
        try {
            await submitRsvp(attending, plusOne, dietaryRestrictions);
            setRsvpCompleted(true);
            setStatus('success');
        } catch (err: unknown) {
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : t('rsvp.errorText'));
        }
    };

    if (status === 'success') {
        return (
            <>
                <BackBar title={t('rsvp.title')} />
                <div className="page-content">
                    <div className="status-box">
                        <div className="status-icon-circle success" aria-hidden="true">
                            <CheckCircle2 size={36} />
                        </div>
                        <h2 className="status-title">{t('rsvp.successTitle')}</h2>
                        <p className="status-text">{t('rsvp.successText')}</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <BackBar title={t('rsvp.title')} />
            <main className="page-content">
                <form onSubmit={handleSubmit} noValidate>
                    {status === 'error' && (
                        <div className="form-error" role="alert">{errorMsg}</div>
                    )}

                    {/* Attending options */}
                    <div style={{ marginBottom: 20 }}>
                        <button
                            type="button"
                            className={`rsvp-option${attending === true ? ' selected' : ''}`}
                            onClick={() => setAttending(true)}
                            aria-pressed={attending === true}
                        >
                            <span className="rsvp-option-radio" aria-hidden="true" />
                            <div>
                                <div className="rsvp-option-text">{t('rsvp.attending')}</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            className={`rsvp-option${attending === false ? ' selected' : ''}`}
                            onClick={() => setAttending(false)}
                            aria-pressed={attending === false}
                        >
                            <span className="rsvp-option-radio" aria-hidden="true" />
                            <div>
                                <div className="rsvp-option-text">{t('rsvp.notAttending')}</div>
                            </div>
                        </button>
                    </div>

                    {/* Extra options only if attending */}
                    {attending === true && (
                        <div className="form-card" style={{ marginBottom: 20 }}>
                            <label className="checkbox-row">
                                <input
                                    type="checkbox"
                                    checked={plusOne}
                                    onChange={(e) => setPlusOne(e.target.checked)}
                                    aria-label={t('rsvp.plusOneLabel')}
                                />
                                <span className="checkbox-label">{t('rsvp.plusOneLabel')}</span>
                            </label>

                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label className="form-label" htmlFor="dietary">
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
            </main>
        </>
    );
}
