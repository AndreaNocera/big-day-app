import { useEffect } from 'react';
import { Film, Images, Upload, X } from 'lucide-react';
import { useI18nStore } from '@/store/i18nStore';
import type { UploadConfirmation } from '@/hooks/usePhotoUpload';

interface UploadConfirmModalProps {
    confirmation: UploadConfirmation;
    onCancel: () => void;
    onConfirm: () => void;
}

export function UploadConfirmModal({
    confirmation,
    onCancel,
    onConfirm,
}: UploadConfirmModalProps) {
    const { t } = useI18nStore();

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onCancel]);

    return (
        <div className="status-modal-overlay" onClick={onCancel} role="presentation">
            <div
                className="status-modal-box upload-confirm-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="upload-confirm-title"
            >
                <button
                    type="button"
                    className="status-modal-close"
                    onClick={onCancel}
                    aria-label={t('gallery.uploadCancel')}
                >
                    <X size={20} />
                </button>

                <div className="status-modal-icon upload-confirm-modal-icon">
                    <Upload size={46} />
                </div>
                <h2 id="upload-confirm-title" className="status-modal-title">
                    {t('gallery.uploadConfirmTitle')}
                </h2>
                <p className="status-modal-message">{t('gallery.uploadConfirmIntro')}</p>

                <div className="upload-confirm-counts">
                    {confirmation.photos > 0 && (
                        <div className="upload-confirm-count">
                            <Images size={22} aria-hidden="true" />
                            <span>{t('gallery.photosSelected')}</span>
                            <strong>{confirmation.photos}</strong>
                        </div>
                    )}
                    {confirmation.videos > 0 && (
                        <div className="upload-confirm-count">
                            <Film size={22} aria-hidden="true" />
                            <span>{t('gallery.videosSelected')}</span>
                            <strong>{confirmation.videos}</strong>
                        </div>
                    )}
                </div>

                {confirmation.notes.length > 0 && (
                    <div className="upload-confirm-notes">
                        {confirmation.notes.map((note) => <p key={note}>{note}</p>)}
                    </div>
                )}

                <div className="upload-confirm-actions">
                    <button type="button" className="upload-confirm-cancel" onClick={onCancel}>
                        {t('gallery.uploadCancel')}
                    </button>
                    <button type="button" className="upload-confirm-submit" onClick={onConfirm}>
                        <Upload size={17} aria-hidden="true" />
                        {t('gallery.uploadConfirmProceed')}
                    </button>
                </div>
            </div>
        </div>
    );
}
