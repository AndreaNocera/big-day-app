import { Link } from 'react-router-dom';
import { MapPin, Calendar, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useI18nStore } from '@/store/i18nStore';

export default function Home() {
    const { t } = useI18nStore();
    const { token, rsvpCompleted } = useAuthStore();

    return (
        <main>
            {/* Hero */}
            <section className="hero-section" aria-labelledby="hero-title">
                <h1 id="hero-title" className="hero-title">{t('home.heroTitle')}</h1>
                <p className="hero-date">{t('home.date')}</p>
                <p className="hero-location">{t('home.location')}</p>
            </section>

            {/* Navigation Cards */}
            <nav className="nav-grid" aria-label="Sezioni del sito">
                <Link
                    to="/location"
                    className="nav-card"
                    aria-label="Vai alla sezione Location"
                >
                    <MapPin size={32} className="nav-card-icon" aria-hidden="true" />
                    <span className="nav-card-title">{t('home.cardLocation')}</span>
                    <span className="nav-card-subtitle">{t('home.cardLocationSub')}</span>
                </Link>

                <Link
                    to="/programma"
                    className="nav-card"
                    aria-label="Vai al programma della giornata"
                >
                    <Calendar size={32} className="nav-card-icon" aria-hidden="true" />
                    <span className="nav-card-title">{t('home.cardProgram')}</span>
                    <span className="nav-card-subtitle">{t('home.cardProgramSub')}</span>
                </Link>

                <Link
                    to="/faq"
                    className="nav-card full-width"
                    aria-label="Vai alle domande frequenti"
                >
                    <HelpCircle size={32} className="nav-card-icon" aria-hidden="true" />
                    <span className="nav-card-title">{t('home.cardFaq')}</span>
                    <span className="nav-card-subtitle">{t('home.cardFaqSub')}</span>
                </Link>
            </nav>

            {/* RSVP Button */}
            <div className="rsvp-section">
                {token && rsvpCompleted ? (
                    <div
                        className="btn-primary success"
                        role="status"
                        aria-live="polite"
                    >
                        <CheckCircle2 size={22} aria-hidden="true" />
                        {t('home.rsvpDone')}
                    </div>
                ) : (
                    <Link
                        to={token ? '/rsvp' : '/accedi'}
                        className="btn-primary"
                        aria-label="Conferma la tua presenza al matrimonio"
                    >
                        {t('home.rsvpBtn')}
                    </Link>
                )}
            </div>
        </main>
    );
}
