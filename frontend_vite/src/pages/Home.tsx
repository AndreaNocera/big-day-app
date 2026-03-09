import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Camera, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useI18nStore } from '@/store/i18nStore';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { Loader } from '@/components/Loader';

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
        <main className="home-page-container">
            {/* Contenuto Principale */}
            <div className="home-content-wrapper">
                {/* Frase / Citazione */}
                <div className="home-quote">
                    {t('home.quote').split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
                </div>

                {/* Foto Sposi */}
                <div className="home-hero-image-wrapper">
                    {/* Placeholder invece della foto reale, come da richiesta */}
                    <img
                        src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2069&auto=format&fit=crop"
                        alt="Foto Sposi"
                        className="home-hero-image"
                        loading="eager"
                    />
                </div>

                {/* Card "Ci sposiamo / Condividi la storia" */}
                <div className="home-story-card">
                    <h2 className="home-story-title">{t('home.storyTitle')}</h2>
                    <span className="emoji-inline emoji-under-story">✨</span>
                </div>

                {/* Lista "Immagini - descrizione" 5 righe */}
                <div className="home-alternating-list">
                    {[1, 2, 3, 4, 5].map((item, idx) => (
                        <div key={item} className={`alternating-row ${idx % 2 !== 0 ? 'reverse' : ''}`}>
                            {idx === 0 && <span className="emoji-inline emoji-tl">⭐</span>}
                            {idx === 0 && <span className="emoji-inline emoji-bl">💙</span>}
                            {idx === 1 && <span className="emoji-inline emoji-mid-bottom">🎉</span>}
                            {idx === 3 && <span className="emoji-inline emoji-desc-tr">💜</span>}
                            {idx === 4 && <span className="emoji-inline emoji-mid-top">🎉</span>}
                            <div className="alt-image-box">
                                <img src={`https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop&sig=${item}`} alt="Momento" />
                            </div>
                            <div className="alt-text-box">
                                <p>{t('home.placeholderTitle')}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Card Testo Dettagli */}
                <div className="home-details-card">
                    {t('home.storyText').split('\n').map((line, i) => (
                        <p key={i} className="home-details-text">{line}</p>
                    ))}
                    <span className="emoji-inline emoji-details-br">💜</span>
                </div>
            </div>

            {/* Area Pulsanti (Upload / RSVP) */}
            <div className="rsvp-section home-actions">
                {photosEnabled ? (
                    <>
                        {status === 'loading' && <Loader />}
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

                        <Link
                            to={token ? "#" : "/accedi?redirect=/"}
                            onClick={token ? (e) => { e.preventDefault(); triggerFileInput(); } : undefined}
                            className="btn-primary inverted"
                            aria-label="Carica una foto del matrimonio"
                        >
                            <Camera size={22} aria-hidden="true" style={{ marginRight: '8px' }} />
                            {token ? t('gallery.uploadBtn') : "Accedi per caricare foto"}
                        </Link>
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
                        className={`btn-primary inverted ${token && rsvpCompleted ? 'success' : ''}`}
                        aria-label="Conferma la tua presenza al matrimonio"
                    >
                        {token && rsvpCompleted ? (
                            <><CheckCircle2 size={22} aria-hidden="true" /> {t('home.rsvpDone')}</>
                        ) : (
                            <><AlertCircle size={22} aria-hidden="true" /> {t('home.rsvpBtn')}</>
                        )}
                    </Link>
                )}
            </div>
        </main>
    );
}
