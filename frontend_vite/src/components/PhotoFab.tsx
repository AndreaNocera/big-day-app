import { useRef } from 'react';
import { Camera, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { useI18nStore } from '@/store/i18nStore';

export function PhotoFab() {
    const { t } = useI18nStore();
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

    if (status === 'loading') {
        return (
            <div className="status-box fixed-full" style={{ zIndex: 1000, background: 'rgba(255,255,255,0.8)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner purple" role="status" aria-label="Caricamento..." />
            </div>
        );
    }

    return (
        <>
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
                onClick={triggerFileInput}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 100,
                    transition: 'all 0.2s ease',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <Camera size={24} />
                    <span style={{ fontSize: '10px', fontWeight: 600 }}>{t('gallery.uploadBtn').split(' ')[0]}</span>
                </div>
            </button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
            />
        </>
    );
}
