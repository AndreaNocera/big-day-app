import { MapPin, Heart, Utensils, Music, Camera, Clock } from 'lucide-react';
import { useI18nStore } from '@/store/i18nStore';
import { it } from '@/locales/it';
import { en } from '@/locales/en';
import { es } from '@/locales/es';
import { fr } from '@/locales/fr';

const LOCALES = { it, en, es, fr };
const ICONS = [Heart, Camera, Utensils, Music, Clock];

export default function Location() {
    const { t, language } = useI18nStore();

    const mapsUrl = 'https://www.google.com/maps/place/Castillo+del+Buen+Amor/@41.157122,-5.67058,17z/data=!3m1!4b1!4m9!3m8!1s0xd38d4c13011de8b:0x5aefc0f923b46c4b!5m2!4m1!1i2!8m2!3d41.157122!4d-5.67058!16s%2Fg%2F122qyhdd?entry=ttu&g_ep=EgoyMDI2MDMwOC4wIKXMDSoASAFQAw%3D%3D';

    return (
        <main className="page-content">
            <h1 className="hero-title" style={{ fontSize: '32px', marginBottom: '24px' }}>
                {t('location.title')}
            </h1>

            {/* Venue info & Map */}
            <section className="section-card" aria-labelledby="venue-name" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '24px 24px 12px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                        <MapPin size={28} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                        <div>
                            <h2 id="venue-name" className="section-title" style={{ marginBottom: 4 }}>
                                {t('location.venueName')}
                            </h2>
                            <p className="section-text" style={{ fontSize: 14, textAlign: 'justify' }}>
                                {t('location.venueAddress')}
                            </p>
                        </div>
                    </div>
                    <p className="section-text" style={{ marginBottom: 16 }}>{t('location.venueDescription')}</p>
                </div>

                {/* Castillo */}
                <div style={{ borderTop: '1px solid var(--color-border)', backgroundColor: '#f9f9f9', padding: '8px' }}>
                    <img
                        src="/photos/castillo.webp"
                        alt={t('location.venueName')}
                        style={{ width: '100%', display: 'block', objectFit: 'cover', height: 'auto', borderRadius: 4 }}
                    />
                </div>
            </section>

            {/* How to arrive */}
            <section className="section-card" aria-labelledby="how-to-arrive-title" style={{ marginBottom: '24px' }}>
                <h2 id="how-to-arrive-title" className="section-title" style={{ marginBottom: 16 }}>
                    {t('location.howToArrive')}
                </h2>

                <p className="section-text" style={{ marginBottom: 20, fontWeight: 500 }}>
                    {t('location.howToArriveIntro')}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                    {[1, 2, 3].map((step) => (
                        <div key={step} style={{ display: 'flex', gap: 12 }}>
                            <div style={{
                                backgroundColor: 'var(--color-primary)',
                                color: 'white',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 14,
                                fontWeight: 'bold',
                                flexShrink: 0
                            }}>
                                {step}
                            </div>
                            <p className="section-text" style={{ fontSize: 15 }}>
                                {t(`location.howToArriveStep${step}` as any)}
                            </p>
                        </div>
                    ))}
                </div>

                <div style={{ padding: '12px 16px', backgroundColor: '#fff8f8', borderRadius: 8, borderLeft: '4px solid var(--color-primary)', marginBottom: 16 }}>
                    <p className="section-text" style={{ fontSize: 14, fontStyle: 'italic', color: '#666' }}>
                        {t('location.howToArriveWarning')}
                    </p>
                </div>

                <p className="section-text" style={{ fontSize: 15 }}>
                    {t('location.howToArriveGps')}
                </p>
            </section>

            {/* Mappa section with integrated button */}
            <div className="section-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '32px', position: 'relative' }}>
                <img
                    src="/photos/mappa_matrimonio.webp"
                    alt="Mappa del matrimonio"
                    style={{ width: '100%', display: 'block', objectFit: 'cover', height: 'auto' }}
                />
                
                {/* Discrete Floating Button */}
                <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Apri la location su Google Maps"
                    style={{ 
                        position: 'absolute', 
                        bottom: '16px', 
                        left: '50%', 
                        transform: 'translateX(-50%)',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8, 
                        textDecoration: 'none', 
                        padding: '10px 20px', 
                        backgroundColor: 'var(--color-primary)', 
                        color: 'white',
                        borderRadius: '30px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
                        fontSize: '14px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        zIndex: 10
                    }}
                >
                    <MapPin size={18} aria-hidden="true" color="white" />
                    <span>{t('location.mapBtn')}</span>
                </a>
            </div>

            {/* Program section merged here */}
            <div style={{ marginTop: '40px', marginBottom: '16px' }}>
                <h2 className="hero-title" style={{ fontSize: '32px', textAlign: 'center' }}>
                    {t('program.title')}
                </h2>
                <p className="section-text" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.9)', marginBottom: '24px' }}>
                    {t('program.intro')}
                </p>
            </div>

            <section className="section-card" style={{ padding: '24px 16px' }}>
                <div className="timeline" role="list" aria-label="Programma della giornata">
                    {LOCALES[language].program.events.map((event: any, i: number) => {
                        const Icon = ICONS[i % ICONS.length];
                        return (
                            <div className="timeline-item" key={i} role="listitem">
                                <div className="timeline-dot" aria-hidden="true" style={{ backgroundColor: 'white', border: '2px solid var(--color-primary)', color: 'var(--color-primary)' }}>
                                    <Icon size={18} />
                                </div>
                                <div className="timeline-content">
                                    <span className="timeline-time" style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '13px' }}>{event.time}</span>
                                    <h3 className="timeline-title" style={{ fontSize: '18px', marginBottom: '4px' }}>{event.label}</h3>
                                    {event.desc && <p className="section-text" style={{ fontSize: '14px', lineHeight: '1.5' }}>{event.desc}</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed var(--color-border)', textAlign: 'center' }}>
                    <p className="section-text" style={{ fontSize: '13px', fontStyle: 'italic', opacity: 0.8 }}>
                        {t('program.approxNotice')}
                    </p>
                </div>
            </section>
        </main>
    );
}
