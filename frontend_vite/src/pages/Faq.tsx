import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BackBar } from '@/components/BackBar';
import { useI18nStore } from '@/store/i18nStore';
import { it } from '@/locales/it';
import { en } from '@/locales/en';
import { es } from '@/locales/es';
import { fr } from '@/locales/fr';

interface FaqItem {
    q: string;
    a: string;
}

const LOCALES = { it, en, es, fr };

export default function Faq() {
    const { t, language } = useI18nStore();
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const items: FaqItem[] = LOCALES[language].faq.items;

    return (
        <>
            <BackBar title={t('faq.title')} />
            <main className="page-content">
                <div className="section-card">
                    {items.map((item, i) => (
                        <div className="faq-item" key={i}>
                            <button
                                className={`faq-q${openIndex === i ? ' open' : ''}`}
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                aria-expanded={openIndex === i}
                                aria-controls={`faq-a-${i}`}
                                id={`faq-q-${i}`}
                            >
                                <span>{item.q}</span>
                                <ChevronDown
                                    size={20}
                                    className={`faq-chevron${openIndex === i ? ' open' : ''}`}
                                    aria-hidden="true"
                                />
                            </button>
                            {openIndex === i && (
                                <div
                                    id={`faq-a-${i}`}
                                    className="faq-a"
                                    role="region"
                                    aria-labelledby={`faq-q-${i}`}
                                >
                                    {item.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </>
    );
}
