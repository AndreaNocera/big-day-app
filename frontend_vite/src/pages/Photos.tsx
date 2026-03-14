import { useState, useEffect, useRef } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useI18nStore } from '@/store/i18nStore';
import { useAuthStore } from '@/store/authStore';
import { getPhotos, getAllPhotos, getUploadUrl, uploadToS3 } from '@/lib/photos';
import { Loader } from '@/components/Loader';

interface Photo {
    PK: string;
    url: string;
    originalUrl?: string;
    thumbUrl?: string;
    uploadedBy: string;
    uploadedAt: string;
    isOptimized: boolean;
}

interface GuestGroup {
    guestName: string;
    phone: string;
    photos: Photo[];
}

const enablePhotos = import.meta.env.VITE_ENABLE_PHOTOS === 'true';

function AdminAccordion({ group }: { group: GuestGroup }) {
    const [open, setOpen] = useState(false);
    const { t } = useI18nStore();

    return (
        <div style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            marginBottom: 12,
            background: 'rgba(255,255,255,0.8)'
        }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 15,
                    color: 'var(--color-text-primary)',
                }}
            >
                <span>
                    {group.guestName}
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                        ({group.photos.length} {group.photos.length === 1 ? 'foto' : 'foto'})
                    </span>
                </span>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {open && (
                <div style={{ padding: '0 16px 16px' }}>
                    {group.photos.length === 0 ? (
                        <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: 13 }}>{t('admin.noPhotos')}</div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                            gap: 10
                        }}>
                            {group.photos.map((photo) => {
                                const thumbSrc = photo.thumbUrl || photo.url;
                                const downloadSrc = photo.originalUrl || photo.url;
                                return (
                                    <a
                                        key={photo.PK}
                                        href={downloadSrc}
                                        download
                                        title={t('admin.downloadPhoto')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            aspectRatio: '1/1',
                                            borderRadius: 'var(--radius-sm)',
                                            overflow: 'hidden',
                                            position: 'relative',
                                            display: 'block',
                                            boxShadow: 'var(--shadow-sm)',
                                            background: '#f3f4f6',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <img
                                            src={thumbSrc}
                                            alt="Foto ospite"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: photo.isOptimized ? 1 : 0.6 }}
                                            loading="lazy"
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0, left: 0, right: 0,
                                            padding: '4px 6px',
                                            background: 'rgba(0,0,0,0.55)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{ color: 'white', fontSize: 9 }}>{new Date(photo.uploadedAt).toLocaleDateString('it-IT')}</span>
                                            <Download size={12} color="white" />
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Photos() {
    const { t } = useI18nStore();
    const { isAdmin } = useAuthStore();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [guestGroups, setGuestGroups] = useState<GuestGroup[]>([]);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    // Upload state (admin always, others only if VITE_ENABLE_PHOTOS=true)
    const canUpload = isAdmin || enablePhotos;
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadPhotos = async () => {
        try {
            setStatus('loading');
            if (isAdmin) {
                const groups = await getAllPhotos();
                setGuestGroups(groups);
            } else {
                const data = await getPhotos();
                setPhotos(data);
            }
            setStatus('idle');
        } catch (err) {
            console.error("Error loading photos:", err);
            setStatus('error');
            setErrorMsg(t('rsvp.errorText'));
        }
    };

    useEffect(() => {
        loadPhotos();
    }, [isAdmin]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadStatus('uploading');
        setUploadError('');
        try {
            const { uploadUrl } = await getUploadUrl(file.name, file.type);
            await uploadToS3(uploadUrl, file);
            setUploadStatus('success');
            setTimeout(() => {
                setUploadStatus('idle');
                loadPhotos();
            }, 1500);
        } catch (err) {
            setUploadStatus('error');
            setUploadError(err instanceof Error ? err.message : t('rsvp.errorText'));
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (status === 'loading') {
        return <Loader />;
    }

    return (
        <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '40px' }}>
            <main className="page-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <h1 className="hero-title" style={{ fontSize: '32px', margin: 0 }}>
                        {isAdmin ? t('admin.photosByGuest') : 'Il tuo Album'}
                    </h1>
                    {canUpload && (
                        <div>
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                                id="photo-upload-input"
                            />
                            <button
                                className="btn-primary"
                                disabled={uploadStatus === 'uploading'}
                                onClick={() => fileInputRef.current?.click()}
                                style={{ padding: '10px 16px', fontSize: 14 }}
                            >
                                {uploadStatus === 'uploading' ? t('gallery.uploading') : t('gallery.uploadBtn')}
                            </button>
                        </div>
                    )}
                </div>

                {uploadStatus === 'error' && (
                    <div className="form-error" style={{ marginBottom: 16 }}>
                        <AlertCircle size={16} /> {uploadError}
                    </div>
                )}
                {uploadStatus === 'success' && (
                    <div style={{ marginBottom: 16, color: 'var(--color-success)', fontWeight: 500 }}>
                        ✓ Foto caricata con successo!
                    </div>
                )}

                {status === 'error' && (
                    <div className="form-error" style={{ marginBottom: 20 }}>
                        <AlertCircle size={18} /> {errorMsg}
                    </div>
                )}

                <section className="section-card">
                    {/* ADMIN VIEW: grouped by guest */}
                    {isAdmin ? (
                        <>
                            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: 'var(--color-primary)' }}>
                                {t('admin.photosByGuest')}
                            </h2>
                            {guestGroups.length === 0 ? (
                                <div style={{
                                    textAlign: 'center', padding: '48px 20px',
                                    background: 'rgba(255,255,255,0.5)', borderRadius: 'var(--radius-lg)',
                                    border: '1px dashed var(--color-border)', color: 'var(--color-text-secondary)'
                                }}>
                                    <p>{t('admin.noPhotos')}</p>
                                </div>
                            ) : (
                                guestGroups.map((group) => (
                                    <AdminAccordion key={group.phone} group={group} />
                                ))
                            )}
                        </>
                    ) : (
                        /* REGULAR USER VIEW: own photos grid */
                        <>
                            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: 'var(--color-primary)' }}>
                                {t('gallery.myPhotos')}
                            </h2>
                            {photos.length === 0 ? (
                                <div style={{
                                    textAlign: 'center', padding: '48px 20px',
                                    background: 'rgba(255,255,255,0.5)', borderRadius: 'var(--radius-lg)',
                                    border: '1px dashed var(--color-border)', color: 'var(--color-text-secondary)'
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
                                            aspectRatio: '1/1', borderRadius: 'var(--radius-md)',
                                            overflow: 'hidden', position: 'relative',
                                            boxShadow: 'var(--shadow-sm)', background: '#f3f4f6'
                                        }}>
                                            <img
                                                src={photo.url}
                                                alt="Uploaded"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: photo.isOptimized ? 1 : 0.6 }}
                                                loading="lazy"
                                            />
                                            <div style={{
                                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                                padding: '4px 8px', background: 'rgba(0,0,0,0.5)',
                                                color: 'white', fontSize: '10px', display: 'flex', justifyContent: 'space-between'
                                            }}>
                                                <span>{new Date(photo.uploadedAt).toLocaleDateString()}</span>
                                                {!photo.isOptimized && <span>...</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
