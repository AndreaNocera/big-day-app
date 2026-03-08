import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useI18nStore, LANGUAGES } from '@/store/i18nStore';

export function Header() {
    const { token, guestName } = useAuthStore();
    const { language, setLanguage } = useI18nStore();
    const navigate = useNavigate();
    const [langOpen, setLangOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLang = LANGUAGES.find((l) => l.code === language);
    const initials = guestName
        ? guestName
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : '';

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setLangOpen(false);
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
                    <button
                        className="profile-btn"
                        onClick={() => navigate('/profilo')}
                        aria-label={`Profilo di ${guestName}`}
                    >
                        <div className="profile-avatar" aria-hidden="true">
                            {initials}
                        </div>
                    </button>
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
