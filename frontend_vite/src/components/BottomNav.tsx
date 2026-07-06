import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, HelpCircle, Image, ArrowLeft, Car, Gift } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePhotoAccessStore } from '@/store/photoAccessStore';
import { useI18nStore } from '@/store/i18nStore';

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { token, isAdmin } = useAuthStore();
    const { photoCode } = usePhotoAccessStore();
    const { t } = useI18nStore();

    const isHome = location.pathname === '/';
    // Kill-switch globale + gate: admin o codice foto dal link speciale
    const photosEnabled = import.meta.env.VITE_ENABLE_PHOTOS === 'true';
    const canUsePhotos = isAdmin || (photosEnabled && !!photoCode);

    return (
        <div className="bottom-nav-bar">
            {isHome ? (
                <div className="bottom-nav-content home-nav">
                    <Link to="/location" className="bottom-nav-item">
                        <MapPin size={24} />
                        <span>{t('nav.location' as any)}</span>
                    </Link>
                    <Link to="/viaggio" className="bottom-nav-item">
                        <Car size={24} />
                        <span>{t('travel.title' as any)}</span>
                    </Link>
                    <Link to="/regalo" className="bottom-nav-item">
                        <Gift size={24} />
                        <span>{t('travel.honeymoonButton' as any)}</span>
                    </Link>
                    <Link to="/faq" className="bottom-nav-item">
                        <HelpCircle size={24} />
                        <span>{t('nav.faq' as any)}</span>
                    </Link>
                    {token && canUsePhotos && (
                        <Link to="/foto" className="bottom-nav-item">
                            <Image size={24} />
                            <span>{t('home.cardGallery')}</span>
                        </Link>
                    )}
                </div>
            ) : (
                <div className="bottom-nav-content inner-nav">
                    <button 
                        onClick={() => {
                            if (window.history.state && window.history.state.idx > 0) {
                                navigate(-1);
                            } else {
                                navigate('/');
                            }
                        }} 
                        className="bottom-nav-back"
                    >
                        <ArrowLeft size={24} />
                        <span>{t('nav.back' as any)}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
