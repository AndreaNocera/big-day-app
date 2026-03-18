import { Bed, Car, Train, Bus, Info, ExternalLink } from 'lucide-react';
import { useI18nStore } from '@/store/i18nStore';

export default function Travel() {
    const { t } = useI18nStore();

    const formatText = (text: string) => {
        return text.split('\n').map((line, i) => {
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
                <p key={i} className="section-text" style={{ marginBottom: line ? '12px' : '0' }}>
                    {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j} style={{ color: 'var(--color-text)' }}>{part.slice(2, -2)}</strong>;
                        }
                        return part;
                    })}
                </p>
            );
        });
    };

    return (
        <main className="page-content">
            <h1 className="hero-title" style={{ fontSize: '32px', marginBottom: '24px' }}>
                {t('travel.title' as any)}
            </h1>

            {/* Alojamiento */}
            <h2 className="section-title" style={{ color: 'white', marginBottom: '16px', textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                {t('travel.accommodationTitle' as any)}
            </h2>

            <section className="section-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Bed size={24} color="var(--color-primary)" />
                    <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('travel.castleTitle' as any)}</h3>
                </div>
                {formatText(t('travel.castleText' as any))}
            </section>

            <section className="section-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Bed size={24} color="var(--color-primary)" />
                    <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('travel.cityAccommodationTitle' as any)}</h3>
                </div>
                {formatText(t('travel.cityAccommodationText' as any))}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                    <a
                        href={t('travel.cityAccommodationUrl' as any)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            padding: '10px 24px',
                            textDecoration: 'none',
                            width: 'fit-content'
                        }}
                    >
                        <ExternalLink size={18} />
                        {t('travel.cityAccommodationLink' as any)}
                    </a>
                </div>
            </section>

            {/* Trasporto */}
            <h2 className="section-title" style={{ color: 'white', marginTop: '32px', marginBottom: '16px', textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                {t('travel.transportTitle' as any)}
            </h2>

            <section className="section-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Car size={24} color="var(--color-primary)" />
                    <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('travel.transportTitle' as any)}</h3>
                </div>
                {formatText(t('travel.transportIntro' as any))}

                <div style={{ marginTop: '24px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>{t('travel.howToReachCity' as any)}</h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Car size={18} style={{ flexShrink: 0, marginTop: 4 }} />
                            {formatText(t('travel.byCar' as any))}
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Train size={18} style={{ flexShrink: 0, marginTop: 4 }} />
                            <div style={{ flex: 1 }}>
                                {formatText(t('travel.byTrain' as any))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <a
                                href={t('travel.renfeUrl' as any)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '14px',
                                    padding: '10px 24px',
                                    textDecoration: 'none',
                                    width: 'fit-content'
                                }}
                            >
                                <ExternalLink size={18} />
                                Renfe
                            </a>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Bus size={18} style={{ flexShrink: 0, marginTop: 4 }} />
                            <div style={{ flex: 1 }}>
                                {formatText(t('travel.byBus' as any))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <a
                                href={t('travel.monbusUrl' as any)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '14px',
                                    padding: '10px 24px',
                                    textDecoration: 'none',
                                    width: 'fit-content'
                                }}
                            >
                                <ExternalLink size={18} />
                                Monbus
                            </a>
                        </div>
                    </div>
                </div>
            </section>


            {/* Dudas */}
            <section className="section-card" style={{ backgroundColor: 'var(--color-primary-light)', borderColor: 'var(--color-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={24} color="var(--color-primary)" />
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-primary-text)' }}>{t('travel.questionsTitle' as any)}</h3>
                </div>
                {formatText(t('travel.questionsText' as any))}
            </section>
        </main>
    );
}
