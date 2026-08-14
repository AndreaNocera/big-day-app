import { useEffect } from 'react';
import { AlertCircle, ArchiveX, Trash2, X } from 'lucide-react';
import { useI18nStore } from '@/store/i18nStore';
import { fmt } from '@/lib/uploadConfig';
import type { MediaDeletionMode } from '@/lib/photos';

interface MediaDeleteModalProps {
    count: number;
    physicalOnly?: boolean;
    loadingMode: MediaDeletionMode | null;
    error: string;
    onCancel: () => void;
    onConfirm: (mode: MediaDeletionMode) => void;
}

export function MediaDeleteModal({
    count,
    physicalOnly = false,
    loadingMode,
    error,
    onCancel,
    onConfirm,
}: MediaDeleteModalProps) {
    const { t } = useI18nStore();
    const loading = loadingMode !== null;

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !loading) onCancel();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [loading, onCancel]);

    return (
        <div
            className="status-modal-overlay"
            onClick={() => !loading && onCancel()}
            role="presentation"
        >
            <div
                className="status-modal-box media-delete-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="media-delete-title"
            >
                <button
                    className="status-modal-close"
                    onClick={onCancel}
                    disabled={loading}
                    aria-label={t('admin.cancelDelete')}
                >
                    <X size={20} />
                </button>

                <div className="status-modal-icon media-delete-modal-icon">
                    <AlertCircle size={48} />
                </div>
                <h2 id="media-delete-title" className="status-modal-title">
                    {t(physicalOnly ? 'gallery.deleteMediaTitle' : 'admin.deleteMediaTitle')}
                </h2>
                <p className="status-modal-message">
                    {physicalOnly
                        ? t('gallery.deleteMediaQuestion')
                        : fmt(t('admin.deleteMediaQuestion'), { count })}
                </p>

                {physicalOnly ? (
                    <div className="media-delete-confirm-actions">
                        <button
                            type="button"
                            className="media-delete-confirm"
                            onClick={() => onConfirm('physical')}
                            disabled={loading}
                        >
                            <Trash2 size={18} aria-hidden="true" />
                            {loading ? t('gallery.deletingMedia') : t('gallery.deleteMediaConfirm')}
                        </button>
                        <button
                            type="button"
                            className="media-delete-cancel"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            {t('admin.cancelDelete')}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="media-delete-options">
                            <button
                                type="button"
                                className="media-delete-option logical"
                                onClick={() => onConfirm('logical')}
                                disabled={loading}
                            >
                                <ArchiveX size={22} aria-hidden="true" />
                                <span>
                                    <strong>{loadingMode === 'logical' ? t('admin.deletingMedia') : t('admin.deleteLogical')}</strong>
                                    <small>{t('admin.deleteLogicalDescription')}</small>
                                </span>
                            </button>

                            <button
                                type="button"
                                className="media-delete-option physical"
                                onClick={() => onConfirm('physical')}
                                disabled={loading}
                            >
                                <Trash2 size={22} aria-hidden="true" />
                                <span>
                                    <strong>{loadingMode === 'physical' ? t('admin.deletingMedia') : t('admin.deletePhysical')}</strong>
                                    <small>{t('admin.deletePhysicalDescription')}</small>
                                </span>
                            </button>
                        </div>

                        <button
                            type="button"
                            className="media-delete-cancel"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            {t('admin.cancelDelete')}
                        </button>
                    </>
                )}

                {error && <p className="media-delete-error">{error}</p>}

            </div>
        </div>
    );
}
