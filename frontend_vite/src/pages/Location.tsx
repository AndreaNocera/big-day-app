import { Car, Train, MapPin } from 'lucide-react';
import { useI18nStore } from '@/store/i18nStore';

export default function Location() {
    const { t } = useI18nStore();

    const mapsUrl = 'https://www.google.com/maps/place/Castillo+del+Buen+Amor/@41.157122,-5.67058,17z/data=!3m1!4b1!4m9!3m8!1s0xd38d4c13011de8b:0x5aefc0f923b46c4b!5m2!4m1!1i2!8m2!3d41.157122!4d-5.67058!16s%2Fg%2F122qyhdd?entry=ttu&g_ep=EgoyMDI2MDMwOC4wIKXMDSoASAFQAw%3D%3D';

    return (
        <main className="page-content">
            <h1 className="hero-title" style={{ fontSize: '32px', marginBottom: '24px' }}>
                {t('location.title')}
            </h1>

            {/* Venue info */}
            <section className="section-card" aria-labelledby="venue-name">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <MapPin size={24} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                    <div>
                        <h2 id="venue-name" className="section-title" style={{ marginBottom: 4 }}>
                            {t('location.venueName')}
                        </h2>
                        <p className="section-text" style={{ fontSize: 14 }}>
                            {t('location.venueAddress')}
                        </p>
                    </div>
                </div>
                <p className="section-text">{t('location.venueDescription')}</p>
            </section>

            {/* Map placeholder / link */}
            <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="map-placeholder section-card"
                aria-label="Apri la location su Google Maps"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', minHeight: 160 }}
            >
                <MapPin size={36} aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 15 }}>{t('location.mapBtn')}</span>
                <span style={{ fontSize: 13, opacity: 0.7 }}>{t('location.venueAddress')}</span>
            </a>

            {/* Parking tag */}
            <div className="tag-row" style={{ marginBottom: 16 }}>
                <span className="tag">🅿️ {t('location.parking')}</span>
            </div>

            {/* How to arrive */}
            <section className="section-card" aria-labelledby="how-to-arrive-title">
                <h2 id="how-to-arrive-title" className="section-title">{t('location.howToArrive')}</h2>

                <div style={{ display: 'flex', gap: 12, marginBottom: 16, padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <Car size={22} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                    <div>
                        <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{t('location.byCarTitle')}</p>
                        <p className="section-text">{t('location.byCarText')}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                    <Train size={22} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                    <div>
                        <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{t('location.byTrainTitle')}</p>
                        <p className="section-text">{t('location.byTrainText')}</p>
                    </div>
                </div>
            </section>
        </main>
    );
}
