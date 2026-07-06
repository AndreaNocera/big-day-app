import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { usePhotoAccessStore } from '@/store/photoAccessStore';
import { useI18nStore } from '@/store/i18nStore';
import { verifyPhotoAccess } from '@/lib/auth';
import { Loader } from '@/components/Loader';

/**
 * Landing del link speciale foto: /photos-on?c=<codice>
 * Valida il codice sul backend, lo salva su localStorage e reindirizza:
 * - utente gia' loggato -> Home (vedra' il tasto Carica Foto)
 * - utente non loggato  -> pagina di accesso (login o registrazione ospite)
 */
export default function PhotosOn() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { token, _hasHydrated } = useAuthStore();
    const { setPhotoCode } = usePhotoAccessStore();
    const { t } = useI18nStore();

    const [status, setStatus] = useState<'loading' | 'error'>('loading');
    const validating = useRef(false);

    const code = searchParams.get('c');

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!code) {
            setStatus('error');
            return;
        }
        if (validating.current) return;
        validating.current = true;

        verifyPhotoAccess(code)
            .then(() => {
                setPhotoCode(code);
                navigate(token ? '/' : '/accedi?redirect=/', { replace: true });
            })
            .catch(() => setStatus('error'));
    }, [code, token, _hasHydrated, navigate, setPhotoCode]);

    if (status === 'loading') {
        return <Loader message={t('photosOn.validating')} />;
    }

    return (
        <div className="status-box">
            <div className="status-icon-circle error" aria-hidden="true">✕</div>
            <h2 className="status-title">{t('photosOn.invalidTitle')}</h2>
            <p className="status-text">{t('photosOn.invalidText')}</p>
            <Link to="/" className="btn-primary mt-6">{t('photosOn.backHome')}</Link>
        </div>
    );
}
