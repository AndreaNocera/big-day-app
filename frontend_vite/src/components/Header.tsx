import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, ChevronDown, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useI18nStore, LANGUAGES } from '@/store/i18nStore';

export function Header() {
    const { token, guestName, logout } = useAuthStore();
    const { language, setLanguage, t } = useI18nStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [langOpen, setLangOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    const currentLang = LANGUAGES.find((l) => l.code === language);
    const initials = guestName
        ? guestName
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : '';

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setLangOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="header" role="banner">
            {/* Logo */}
            <Link to="/" className="header-logo" aria-label="Torna alla home">
                A &amp; E
            </Link>

            <div className="header-right">
                {/* Language Switch */}
                <div className="lang-dropdown-wrapper" ref={dropdownRef}>
                    <button
                        className="lang-trigger"
                        onClick={() => setLangOpen((o) => !o)}
                        aria-haspopup="listbox"
                        aria-expanded={langOpen}
                        aria-label="Seleziona lingua"
                    >
                        {/* <Globe size={16} aria-hidden="true" /> */}
                        <span>{currentLang?.flag}</span>
                        <span>{currentLang?.code.toUpperCase()}</span>
                        <ChevronDown size={14} aria-hidden="true" />
                    </button>

                    {langOpen && (
                        <div className="lang-dropdown" role="listbox" aria-label="Lingue disponibili">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    className={`lang-option${language === lang.code ? ' active' : ''}`}
                                    role="option"
                                    aria-selected={language === lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code);
                                        setLangOpen(false);
                                    }}
                                >
                                    <span aria-hidden="true">{lang.flag}</span>
                                    <span>{lang.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Profile / Auth button */}
                {token ? (
                    <div className="profile-dropdown-wrapper" ref={profileRef}>
                        <button
                            className="profile-avatar"
                            aria-haspopup="true"
                            aria-expanded={profileOpen}
                            onClick={() => setProfileOpen((o) => !o)}
                            aria-label="Apri menu profilo"
                        >
                            {initials}
                        </button>

                        {profileOpen && (
                            <div className="profile-dropdown">
                                <div className="profile-dropdown-header">
                                    <span className="profile-dropdown-name">{guestName}</span>
                                </div>
                                <div className="profile-dropdown-actions">
                                    <button
                                        className="profile-action-btn"
                                        onClick={() => {
                                            setProfileOpen(false);
                                            if (location.pathname !== '/rsvp') {
                                                navigate('/rsvp');
                                            }
                                        }}
                                    >
                                        <User size={16} aria-hidden="true" />
                                        <span>{t('profile.myRsvp')}</span>
                                    </button>
                                    <button
                                        className="profile-action-btn logout"
                                        onClick={() => {
                                            logout();
                                            setProfileOpen(false);
                                            navigate('/', { replace: true });
                                        }}
                                        aria-label={t('profile.logout')}
                                    >
                                        <LogOut size={16} aria-hidden="true" />
                                        <span>{t('profile.logout') || 'Logout'}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        className="profile-btn"
                        onClick={() => navigate('/accedi')}
                        aria-label="Accedi all'area riservata"
                    >
                        <User size={20} aria-hidden="true" />
                        <span>Accedi</span>
                    </button>
                )}
            </div>
        </header>
    );
}
