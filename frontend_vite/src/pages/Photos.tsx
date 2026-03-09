import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useI18nStore } from '@/store/i18nStore';
import { getPhotos } from '@/lib/photos';

export default function Photos() {
    const { t } = useI18nStore();
    const [photos, setPhotos] = useState<any[]>([]);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    const loadPhotos = async () => {
        try {
            const data = await getPhotos();
            setPhotos(data);
            setStatus('idle');
        } catch (err) {
            console.error("Error loading photos:", err);
            setStatus('error');
            setErrorMsg(t('rsvp.errorText'));
        }
    };

    useEffect(() => {
        loadPhotos();
    }, []);

    if (status === 'loading') {
        return (
            <main className="page-content">
                <h1 className="hero-title" style={{ fontSize: '32px', marginBottom: '24px' }}>
                    Il tuo Album
                </h1>
                <div className="status-box">
                    <div className="spinner purple" role="status" aria-label="Caricamento..." />
                </div>
            </main>
        );
    }

    return (
        <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '40px' }}>
            <main className="page-content">
                <h1 className="hero-title" style={{ fontSize: '32px', marginBottom: '24px' }}>
                    Il tuo Album
                </h1>

                {status === 'error' && (
                    <div className="form-error" style={{ marginBottom: 20 }}>
                        <AlertCircle size={18} /> {errorMsg}
                    </div>
                )}

                <section className="section-card">
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: 'var(--color-primary)' }}>
                        {t('gallery.myPhotos')}
                    </h2>

                    {photos.length === 0 && status === 'idle' ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '48px 20px',
                            background: 'rgba(255,255,255,0.5)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px dashed var(--color-border)',
                            color: 'var(--color-text-secondary)'
                        }}>
                            <p>{t('gallery.empty')}</p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: '12px'
                        }}>
                            {photos.map((photo) => (
                                <div key={photo.PK} style={{
                                    aspectRatio: '1/1',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    boxShadow: 'var(--shadow-sm)',
                                    background: '#f3f4f6'
                                }}>
                                    <img
                                        src={photo.url}
                                        alt="Uploaded"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            opacity: photo.isOptimized ? 1 : 0.6
                                        }}
                                        loading="lazy"
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        padding: '4px 8px',
                                        background: 'rgba(0,0,0,0.5)',
                                        color: 'white',
                                        fontSize: '10px',
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span>{new Date(photo.uploadedAt).toLocaleDateString()}</span>
                                        {!photo.isOptimized && <span>...</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
