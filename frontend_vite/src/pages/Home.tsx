import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Camera, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePhotoAccessStore } from '@/store/photoAccessStore';
import { useI18nStore, type NestedKeyOf, type Dictionary } from '@/store/i18nStore';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { ACCEPT_ATTR, MAX_IMAGE_SIZE_MB, MAX_VIDEO_SIZE_MB, fmt } from '@/lib/uploadConfig';
import { Loader } from '@/components/Loader';
import { UploadConfirmModal } from '@/components/UploadConfirmModal';

const HERO_IMAGE = "/photos/PXL_20250331_120242708.webp";

interface HomeRow {
    image: string;
    title: NestedKeyOf<Dictionary>;
}

const rows: HomeRow[] = [
    { image: "/photos/IMG_20170517_122100.webp", title: 'home.textRow1' },
    { image: "/photos/IMG_5133.webp", title: 'home.textRow2' },
    { image: "/photos/PXL_20250323_132309900.webp", title: 'home.textRow3' },
    { image: "/photos/IMG_9811.webp", title: 'home.textRow4' },
    { image: "/photos/PXL_20250723_142636501.webp", title: 'home.textRow5' },
];
// const HERO_IMAGE = "/photos/PXL_20250323_132309900.webp";

export default function Home() {
    const { t } = useI18nStore();
    const { token, isAdmin } = useAuthStore();
    const { photoCode } = usePhotoAccessStore();
    // VITE_ENABLE_PHOTOS e' il kill-switch globale; il gate reale e' admin o codice foto
    const photosEnabled = import.meta.env.VITE_ENABLE_PHOTOS === 'true';
    const canUsePhotos = isAdmin || (photosEnabled && !!photoCode);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const {
        uploadPhotos,
        confirmUpload,
        cancelUpload,
        uploadConfirmation,
        status,
        progress,
        message,
    } = usePhotoUpload();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            uploadPhotos(files);
        }
        // Reset per poter riselezionare gli stessi file
        if (fileInputRef.current) fileInputRef.current.value = '';
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
                        src={HERO_IMAGE}
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
                    {rows.map((item, idx) => (
                        <div key={idx} className={`alternating-row ${idx % 2 !== 0 ? 'reverse' : ''}`}>
                            {idx === 0 && <span className="emoji-inline emoji-tl">⭐</span>}
                            {idx === 0 && <span className="emoji-inline emoji-bl">💙</span>}
                            {idx === 1 && <span className="emoji-inline emoji-mid-bottom">🎉</span>}
                            {idx === 3 && <span className="emoji-inline emoji-desc-tr">💜</span>}
                            {idx === 4 && <span className="emoji-inline emoji-mid-top">🎉</span>}
                            <div className="alt-image-box">
                                <img src={item.image} alt="Momento" />
                            </div>
                            <div className="alt-text-box">
                                <p>{t(item.title)}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Card Testo Dettagli */}
                <div className="home-details-card">
                    {t('home.storyText').split('\n').map((line, i) => {
                        const formattedLine = line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={j}>{part.slice(2, -2)}</strong>;
                            }
                            return part;
                        });

                        return i === 1
                            ? <h1 key={i} className="">{formattedLine}</h1>
                            : <p key={i} className="home-details-text">{formattedLine}</p>;
                    })}
                    <span className="emoji-inline emoji-details-br">💜</span>
                </div>
            </div>

            {/* Area upload media, visibile ad admin o a chi ha il link speciale */}
            {canUsePhotos && (
                <div className="rsvp-section home-actions">
                    {status === 'loading' && <Loader message={`${t('gallery.uploading')} ${progress.done}/${progress.total}`} />}
                    {status === 'success' && (
                        <div style={{ position: 'fixed', bottom: '100px', right: '24px', background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 100 }}>
                            <CheckCircle2 color="var(--color-success)" size={20} />
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>{message}</span>
                        </div>
                    )}
                    {status === 'error' && (
                        <div style={{ position: 'fixed', bottom: '100px', right: '24px', background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 100 }}>
                            <AlertCircle color="var(--color-error)" size={20} />
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>{message}</span>
                        </div>
                    )}

                    {token && (
                        <p style={{
                            textAlign: 'center',
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'white',
                            background: 'rgba(25, 5, 60, 0.92)',
                            border: '1px solid rgba(255, 255, 255, 0.35)',
                            borderRadius: 12,
                            padding: '5px 14px',
                            width: 'fit-content',
                            margin: '0 auto 8px',
                        }}>
                            {fmt(t('gallery.uploadHint'), {
                                imageMb: MAX_IMAGE_SIZE_MB,
                                videoMb: MAX_VIDEO_SIZE_MB,
                            })}
                        </p>
                    )}
                    <Link
                        to={token ? "#" : "/accedi?redirect=/"}
                        onClick={token ? (e) => { e.preventDefault(); triggerFileInput(); } : undefined}
                        className="btn-primary photo"
                        aria-label={t('gallery.uploadBtn')}
                    >
                        <Camera size={22} aria-hidden="true" style={{ marginRight: '8px' }} />
                        {token ? t('gallery.uploadBtn') : t('gallery.loginToUpload')}
                    </Link>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept={ACCEPT_ATTR}
                        multiple
                        style={{ display: 'none' }}
                    />
                </div>
            )}
            {uploadConfirmation && (
                <UploadConfirmModal
                    confirmation={uploadConfirmation}
                    onCancel={cancelUpload}
                    onConfirm={() => void confirmUpload()}
                />
            )}
        </main>
    );
}
