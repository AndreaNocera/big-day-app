import { useI18nStore } from '@/store/i18nStore';

interface LoaderProps {
    message?: string;
}

export function Loader({ message }: LoaderProps) {
    const { t } = useI18nStore();

    return (
        <div className="status-modal-overlay" style={{ zIndex: 2000 }}>
            <div className="status-modal-box" style={{ padding: '40px' }}>
                <div className="status-modal-icon">
                    <div className="spinner purple" style={{ width: 44, height: 44 }} />
                </div>
                <p className="status-modal-message" style={{ marginTop: '16px', fontWeight: 600 }}>
                    {message || t('auth.loading')}
                </p>
            </div>
        </div>
    );
}
