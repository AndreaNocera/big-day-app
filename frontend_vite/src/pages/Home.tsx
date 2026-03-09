import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Camera, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useI18nStore } from '@/store/i18nStore';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';

export default function Home() {
    const { t } = useI18nStore();
    const { token, rsvpCompleted } = useAuthStore();
    const photosEnabled = import.meta.env.VITE_ENABLE_PHOTOS === 'true';

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadPhoto, status, errorMsg } = usePhotoUpload();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await uploadPhoto(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <main>
            {/* Hero */}
            <section className="hero-section" aria-labelledby="hero-title">
                <h1 id="hero-title" className="hero-title">{t('home.heroTitle')}</h1>
                <p className="hero-date">{t('home.date')}</p>
                <p className="hero-location">{t('home.location')}</p>
            </section>

            <div className="rsvp-section">
                {photosEnabled ? (
                    <>
                        {status === 'loading' && (
                            <div className="status-box fixed-full" style={{ zIndex: 1000, background: 'rgba(255,255,255,0.8)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="spinner purple" role="status" aria-label="Caricamento..." />
                            </div>
                        )}
                        {status === 'success' && (
                            <div style={{ position: 'fixed', bottom: '100px', right: '24px', background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 100 }}>
                                <CheckCircle2 color="var(--color-success)" size={20} />
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>Foto caricata!</span>
                            </div>
                        )}
                        {status === 'error' && (
                            <div style={{ position: 'fixed', bottom: '100px', right: '24px', background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 100 }}>
                                <AlertCircle color="var(--color-error)" size={20} />
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{errorMsg}</span>
                            </div>
                        )}

                        <button
                            onClick={token ? triggerFileInput : undefined}
                            className="btn-primary"
                            aria-label="Carica una foto del matrimonio"
                        >
                            <Camera size={22} aria-hidden="true" style={{ marginRight: '8px' }} />
                            {token ? t('gallery.uploadBtn') : "Accedi per caricare foto"}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </>
                ) : (
                    <Link
                        to={token ? '/rsvp' : '/accedi'}
                        className={`btn-primary${token && rsvpCompleted ? ' success' : ''}`}
                        aria-label="Conferma la tua presenza al matrimonio"
                    >
                        {token && rsvpCompleted && <CheckCircle2 size={22} aria-hidden="true" />}
                        {token && rsvpCompleted ? t('home.rsvpDone') : t('home.rsvpBtn')}
                    </Link>
                )}
            </div>
        </main>
    );
}
