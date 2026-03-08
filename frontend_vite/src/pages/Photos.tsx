import { useState, useEffect, useRef } from 'react';
import { Camera, AlertCircle, Loader2 } from 'lucide-react';
import { BackBar } from '@/components/BackBar';
import { useI18nStore } from '@/store/i18nStore';
import { getPhotos, getUploadUrl, uploadToS3 } from '@/lib/photos';

export default function Photos() {
    const { t } = useI18nStore();
    const [photos, setPhotos] = useState<any[]>([]);
    const [status, setStatus] = useState<'idle' | 'loading' | 'uploading' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('uploading');
        setErrorMsg('');

        try {
            // 1. Get presigned URL
            const { uploadUrl } = await getUploadUrl(file.name, file.type);

            // 2. Upload to S3
            await uploadToS3(uploadUrl, file);

            // 3. Reload photos
            await loadPhotos();
            setStatus('idle');
        } catch (err) {
            console.error("Upload error:", err);
            setStatus('error');
            setErrorMsg(t('rsvp.errorText'));
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <BackBar title={t('gallery.title')} />
            <main className="page-content">
                <div style={{ marginBottom: 24 }}>
                    <button
                        className="btn-primary"
                        onClick={triggerFileInput}
                        disabled={status === 'uploading'}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        {status === 'uploading' ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                        {status === 'uploading' ? t('gallery.uploading') : t('gallery.uploadBtn')}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                </div>

                {status === 'error' && (
                    <div className="form-error" style={{ marginBottom: 20 }}>
                        <AlertCircle size={18} /> {errorMsg}
                    </div>
                )}

                <section>
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
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {status === 'loading' && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                        <div className="loading-spinner" />
                    </div>
                )}
            </main>
        </>
    );
}
