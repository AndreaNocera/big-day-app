import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Download, Film, ImageIcon, Info, Play, Trash2 } from 'lucide-react';
import { useI18nStore } from '@/store/i18nStore';
import { useAuthStore } from '@/store/authStore';
import { usePhotoAccessStore } from '@/store/photoAccessStore';
import { deleteAdminMedia, deleteOwnMedia, getPhotos, getAllPhotos, getAdminMediaUrl, type MediaDeletionMode } from '@/lib/photos';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { ACCEPT_ATTR, MAX_IMAGE_SIZE_MB, MAX_VIDEO_SIZE_MB, fmt } from '@/lib/uploadConfig';
import { Loader } from '@/components/Loader';
import { MediaDeleteModal } from '@/components/MediaDeleteModal';
import { UploadConfirmModal } from '@/components/UploadConfirmModal';

interface Photo {
    PK: string;
    url?: string;
    thumbUrl?: string;
    uploadedBy: string;
    uploadedAt: string;
    isOptimized: boolean;
    mediaType?: 'image' | 'video';
    contentType?: string;
}

interface GuestGroup {
    guestName: string;
    phone: string;
    photos: Photo[];
}

const enablePhotos = import.meta.env.VITE_ENABLE_PHOTOS === 'true';
const THUMBNAIL_POLL_INTERVAL_MS = 5000;
const MAX_THUMBNAIL_POLL_ATTEMPTS = 5;

function AdminMediaTile({ photo, onDelete }: { photo: Photo; onDelete: (photo: Photo) => void }) {
    const { t } = useI18nStore();
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState<'play' | 'download' | null>(null);
    const [mediaError, setMediaError] = useState(false);
    const isVideo = photo.mediaType === 'video';
    const thumbSrc = photo.thumbUrl || photo.url;

    const requestOriginal = async (disposition: 'inline' | 'attachment') => {
        try {
            setMediaError(false);
            setLoadingAction(disposition === 'inline' ? 'play' : 'download');
            const { url } = await getAdminMediaUrl(photo.PK, disposition);

            if (disposition === 'inline') {
                setVideoUrl(url);
            } else {
                const link = document.createElement('a');
                link.href = url;
                link.click();
            }
        } catch (error) {
            console.error('Admin media URL error:', error);
            setMediaError(true);
        } finally {
            setLoadingAction(null);
        }
    };

    return (
        <div style={{
            aspectRatio: '1/1',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            position: 'relative',
            display: 'block',
            boxShadow: 'var(--shadow-sm)',
            background: '#f3f4f6',
        }}>
            {isVideo ? (
                videoUrl ? (
                    <video
                        src={videoUrl}
                        controls
                        autoPlay
                        playsInline
                        preload="metadata"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 8,
                        color: 'var(--color-primary)',
                        background: 'linear-gradient(145deg, #f4effa, #e8ddf3)',
                    }}>
                        <Film size={34} aria-hidden="true" />
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{t('gallery.videoPlaceholder')}</span>
                        <div className="admin-video-actions">
                            <button
                                type="button"
                                onClick={() => requestOriginal('inline')}
                                disabled={loadingAction !== null}
                                className="admin-video-action"
                            >
                                <Play size={13} fill="currentColor" aria-hidden="true" />
                                {loadingAction === 'play' ? t('gallery.preparingVideo') : t('gallery.playVideo')}
                            </button>
                            <button
                                type="button"
                                onClick={() => requestOriginal('attachment')}
                                disabled={loadingAction !== null}
                                className="admin-video-action icon-only"
                                title={t('admin.downloadPhoto')}
                                aria-label={t('admin.downloadPhoto')}
                            >
                                <Download size={16} aria-hidden="true" />
                            </button>
                        </div>
                        {mediaError && (
                            <span style={{ color: 'var(--color-error)', fontSize: 9, textAlign: 'center', padding: '0 6px' }}>
                                {t('gallery.videoLoadError')}
                            </span>
                        )}
                    </div>
                )
            ) : thumbSrc ? (
                <img
                    src={thumbSrc}
                    alt="Foto ospite"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: photo.isOptimized ? 1 : 0.6 }}
                    loading="lazy"
                />
            ) : (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 8,
                    color: 'var(--color-text-secondary)',
                    background: 'linear-gradient(145deg, #f8f8f8, #eeeeee)',
                }}>
                    <ImageIcon size={30} aria-hidden="true" />
                    <span style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', padding: '0 8px' }}>
                        {t('gallery.thumbnailProcessing')}
                    </span>
                </div>
            )}

            {!isVideo && thumbSrc && (
                <button
                    type="button"
                    onClick={() => requestOriginal('attachment')}
                    disabled={loadingAction !== null}
                    className="admin-media-download-overlay"
                    title={t('admin.downloadPhoto')}
                    aria-label={t('admin.downloadPhoto')}
                >
                    <Download size={20} aria-hidden="true" />
                </button>
            )}

            {isVideo && videoUrl && (
                <button
                    type="button"
                    onClick={() => requestOriginal('attachment')}
                    disabled={loadingAction !== null}
                    className="admin-media-download-overlay"
                    title={t('admin.downloadPhoto')}
                    aria-label={t('admin.downloadPhoto')}
                >
                    <Download size={20} aria-hidden="true" />
                </button>
            )}

            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ color: 'white', fontSize: 9 }}>{new Date(photo.uploadedAt).toLocaleDateString('it-IT')}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        type="button"
                        onClick={() => onDelete(photo)}
                        title={t('admin.deleteMedia')}
                        aria-label={t('admin.deleteMedia')}
                        style={{ display: 'flex', color: '#fecaca', border: 0, padding: 0, background: 'none', cursor: 'pointer' }}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function AdminAccordion({
    group,
    onDeleteMedia,
    onDeleteGroup,
}: {
    group: GuestGroup;
    onDeleteMedia: (photo: Photo) => void;
    onDeleteGroup: (group: GuestGroup) => void;
}) {
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
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <button
                    onClick={() => setOpen(o => !o)}
                    style={{
                        flex: 1,
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
                            ({group.photos.length})
                        </span>
                    </span>
                    {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                <button
                    type="button"
                    onClick={() => onDeleteGroup(group)}
                    disabled={group.photos.length === 0}
                    title={t('admin.deleteAllMedia')}
                    aria-label={t('admin.deleteAllMedia')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        margin: '8px 10px 8px 0', padding: '0 10px',
                        border: '1px solid rgba(220, 38, 38, 0.2)', borderRadius: 10,
                        background: 'rgba(254, 242, 242, 0.8)', color: '#b91c1c',
                        cursor: group.photos.length ? 'pointer' : 'not-allowed',
                        fontSize: 11, fontWeight: 600,
                    }}
                >
                    <Trash2 size={13} aria-hidden="true" />
                    <span>{t('admin.deleteAllMedia')}</span>
                </button>
            </div>

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
                            {group.photos.map((photo) => (
                                <AdminMediaTile key={photo.PK} photo={photo} onDelete={onDeleteMedia} />
                            ))}
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
    const { photoCode } = usePhotoAccessStore();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [guestGroups, setGuestGroups] = useState<GuestGroup[]>([]);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [thumbnailPollAttempts, setThumbnailPollAttempts] = useState(0);
    const [thumbnailWarning, setThumbnailWarning] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ photoIds: string[] } | null>(null);
    const [deleteLoadingMode, setDeleteLoadingMode] = useState<MediaDeletionMode | null>(null);
    const [deleteError, setDeleteError] = useState('');

    // Upload: admin sempre; gli altri con kill-switch attivo + codice foto valido
    const canUpload = isAdmin || (enablePhotos && !!photoCode);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadPhotos = useCallback(async (background = false) => {
        try {
            if (!background) setStatus('loading');
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
    }, [isAdmin, t]);

    const refreshAfterUpload = useCallback(() => {
        setThumbnailPollAttempts(0);
        setThumbnailWarning(false);
        void loadPhotos(true);
    }, [loadPhotos]);

    // Stesso hook di upload usato in Home: multi-file, validazione, progresso
    const {
        uploadPhotos,
        confirmUpload,
        cancelUpload,
        uploadConfirmation,
        status: uploadStatus,
        progress,
        message: uploadMessage,
    } = usePhotoUpload(refreshAfterUpload);

    useEffect(() => {
        setThumbnailPollAttempts(0);
        setThumbnailWarning(false);
        void loadPhotos();
    }, [loadPhotos]);

    const pendingThumbnailCount = isAdmin
        ? guestGroups.reduce(
            (count, group) => count + group.photos.filter(
                photo => photo.mediaType !== 'video' && !photo.thumbUrl && !photo.url
            ).length,
            0
        )
        : photos.filter(photo => photo.mediaType !== 'video' && !photo.url).length;

    useEffect(() => {
        if (pendingThumbnailCount === 0) {
            setThumbnailWarning(false);
            return;
        }

        if (thumbnailPollAttempts >= MAX_THUMBNAIL_POLL_ATTEMPTS) {
            setThumbnailWarning(true);
            return;
        }

        const timer = window.setTimeout(() => {
            void loadPhotos(true).finally(() => {
                setThumbnailPollAttempts(attempts => attempts + 1);
            });
        }, THUMBNAIL_POLL_INTERVAL_MS);

        return () => window.clearTimeout(timer);
    }, [loadPhotos, pendingThumbnailCount, thumbnailPollAttempts]);

    const openDeleteMedia = useCallback((photo: Photo) => {
        setDeleteError('');
        setDeleteTarget({ photoIds: [photo.PK] });
    }, []);

    const openDeleteGroup = useCallback((group: GuestGroup) => {
        setDeleteError('');
        setDeleteTarget({ photoIds: group.photos.map(photo => photo.PK) });
    }, []);

    const closeDeleteModal = useCallback(() => {
        if (deleteLoadingMode) return;
        setDeleteError('');
        setDeleteTarget(null);
    }, [deleteLoadingMode]);

    const confirmDelete = useCallback(async (mode: MediaDeletionMode) => {
        if (!deleteTarget || deleteLoadingMode) return;
        try {
            setDeleteLoadingMode(mode);
            setDeleteError('');
            if (isAdmin) {
                await deleteAdminMedia(deleteTarget.photoIds, mode);
            } else {
                if (mode !== 'physical' || deleteTarget.photoIds.length !== 1) return;
                await deleteOwnMedia(deleteTarget.photoIds[0]);
            }
            setDeleteTarget(null);
            setThumbnailPollAttempts(0);
            setThumbnailWarning(false);
            await loadPhotos(true);
        } catch (error) {
            console.error('Media deletion error:', error);
            setDeleteError(error instanceof Error
                ? error.message
                : t(isAdmin ? 'admin.deleteMediaError' : 'gallery.deleteMediaError'));
        } finally {
            setDeleteLoadingMode(null);
        }
    }, [deleteLoadingMode, deleteTarget, isAdmin, loadPhotos, t]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            uploadPhotos(files);
        }
        // Reset per poter riselezionare gli stessi file
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (status === 'loading') {
        return <Loader />;
    }

    return (
        <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '40px' }}>
            {uploadStatus === 'loading' && (
                <Loader message={`${t('gallery.uploading')} ${progress.done}/${progress.total}`} />
            )}
            <main className="page-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <h1 className="hero-title" style={{ fontSize: '32px', margin: 0 }}>
                        {isAdmin ? t('admin.photosByGuest') : t('gallery.title')}
                    </h1>
                    {canUpload && (
                        <div>
                            <input
                                type="file"
                                accept={ACCEPT_ATTR}
                                multiple
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                                id="photo-upload-input"
                            />
                            <button
                                className="btn-primary"
                                disabled={uploadStatus === 'loading'}
                                onClick={() => fileInputRef.current?.click()}
                                style={{ padding: '10px 16px', fontSize: 14 }}
                            >
                                {uploadStatus === 'loading'
                                    ? `${t('gallery.uploading')} ${progress.done}/${progress.total}`
                                    : t('gallery.uploadBtn')}
                            </button>
                            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '6px 0 0', textAlign: 'right', maxWidth: 160 }}>
                                {fmt(t('gallery.uploadHint'), {
                                    imageMb: MAX_IMAGE_SIZE_MB,
                                    videoMb: MAX_VIDEO_SIZE_MB,
                                })}
                            </p>
                        </div>
                    )}
                </div>

                {!isAdmin && (
                    <div
                        role="note"
                        style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            marginBottom: 20, padding: '12px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(95, 45, 120, 0.2)',
                            background: 'rgba(244, 239, 250, 0.85)',
                            color: 'var(--color-text-primary)', fontSize: 14,
                        }}
                    >
                        <Info size={18} style={{ flexShrink: 0, marginTop: 1, color: 'var(--color-primary)' }} aria-hidden="true" />
                        <span>{t('gallery.downloadNotice')}</span>
                    </div>
                )}

                {uploadStatus === 'error' && (
                    <div className="form-error" style={{ marginBottom: 16 }}>
                        <AlertCircle size={16} /> {uploadMessage}
                    </div>
                )}
                {uploadStatus === 'success' && (
                    <div style={{ marginBottom: 16, color: 'var(--color-success)', fontWeight: 500 }}>
                        ✓ {uploadMessage}
                    </div>
                )}

                {status === 'error' && (
                    <div className="form-error" style={{ marginBottom: 20 }}>
                        <AlertCircle size={18} /> {errorMsg}
                    </div>
                )}

                {thumbnailWarning && (
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        marginBottom: 20, padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #f0b44d',
                        background: '#fff8e8', color: '#7a4b00',
                        fontSize: 14,
                    }}>
                        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{t('gallery.thumbnailWarning')}</span>
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
                                    <AdminAccordion
                                        key={group.phone}
                                        group={group}
                                        onDeleteMedia={openDeleteMedia}
                                        onDeleteGroup={openDeleteGroup}
                                    />
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
                                            {photo.mediaType === 'video' ? (
                                                <div style={{
                                                    width: '100%', height: '100%',
                                                    display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center', gap: 8,
                                                    color: 'var(--color-primary)',
                                                    background: 'linear-gradient(145deg, #f4effa, #e8ddf3)',
                                                }}>
                                                    <Film size={38} aria-hidden="true" />
                                                    <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', padding: '0 8px' }}>
                                                        {t('gallery.videoPlaceholder')}
                                                    </span>
                                                </div>
                                            ) : photo.url ? (
                                                <img
                                                    src={photo.url}
                                                    alt="Uploaded"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: photo.isOptimized ? 1 : 0.6 }}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div style={{
                                                    width: '100%', height: '100%',
                                                    display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center', gap: 8,
                                                    color: 'var(--color-text-secondary)',
                                                    background: 'linear-gradient(145deg, #f8f8f8, #eeeeee)',
                                                }}>
                                                    <ImageIcon size={34} aria-hidden="true" />
                                                    <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', padding: '0 10px' }}>
                                                        {t('gallery.thumbnailProcessing')}
                                                    </span>
                                                </div>
                                            )}
                                            <div style={{
                                                position: 'absolute', top: 0, left: 0, right: 0,
                                                padding: '4px 8px', background: 'rgba(0,0,0,0.5)',
                                                color: 'white', fontSize: '10px', display: 'flex',
                                                justifyContent: 'space-between', alignItems: 'center'
                                            }}>
                                                <span>{new Date(photo.uploadedAt).toLocaleDateString()}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {photo.mediaType !== 'video' && !photo.isOptimized && <span>...</span>}
                                                    <button
                                                        type="button"
                                                        onClick={() => openDeleteMedia(photo)}
                                                        title={t('gallery.deleteMedia')}
                                                        aria-label={t('gallery.deleteMedia')}
                                                        style={{
                                                            display: 'flex', color: '#fecaca', border: 0,
                                                            padding: 0, background: 'none', cursor: 'pointer',
                                                        }}
                                                    >
                                                        <Trash2 size={14} aria-hidden="true" />
                                                    </button>
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </section>
            </main>
            {deleteTarget && (
                <MediaDeleteModal
                    count={deleteTarget.photoIds.length}
                    physicalOnly={!isAdmin}
                    loadingMode={deleteLoadingMode}
                    error={deleteError}
                    onCancel={closeDeleteModal}
                    onConfirm={confirmDelete}
                />
            )}
            {uploadConfirmation && (
                <UploadConfirmModal
                    confirmation={uploadConfirmation}
                    onCancel={cancelUpload}
                    onConfirm={() => void confirmUpload()}
                />
            )}
        </div>
    );
}
