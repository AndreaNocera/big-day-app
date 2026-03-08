import { Music, Utensils, Heart, Cake, Star } from 'lucide-react';
import { BackBar } from '@/components/BackBar';
import { useI18nStore } from '@/store/i18nStore';
import { it } from '@/locales/it';
import { en } from '@/locales/en';
import { es } from '@/locales/es';
import { fr } from '@/locales/fr';

interface ProgramEvent {
    time: string;
    label: string;
    desc: string;
}

const LOCALES = { it, en, es, fr };
const ICONS = [Heart, Music, Utensils, Cake, Star];

export default function Programma() {
    const { t, language } = useI18nStore();
    const events: ProgramEvent[] = LOCALES[language].program.events;

    return (
        <>
            <BackBar title={t('program.title')} />
            <main className="page-content">
                <p className="section-text mb-4">{t('program.intro')}</p>

                <div className="timeline" role="list" aria-label="Programma della giornata">
                    {events.map((event, i) => {
                        const Icon = ICONS[i % ICONS.length];
                        return (
                            <div className="timeline-item" key={i} role="listitem">
                                <div className="timeline-dot" aria-hidden="true">
                                    <Icon size={18} />
                                </div>
                                <div className="timeline-content">
                                    <div className="timeline-time">{event.time}</div>
                                    <div className="timeline-label">{event.label}</div>
                                    <div className="timeline-desc">{event.desc}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </>
    );
}
