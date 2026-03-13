import { useState } from 'react';
import { Plane, Heart, CreditCard, Copy, Check } from 'lucide-react';
import { useI18nStore } from '@/store/i18nStore';

export default function Honeymoon() {
    const { t } = useI18nStore();
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

    const handleCopy = (text: string, idx: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    const formatText = (text: string) => {
        if (!text) return null;
        return text.split('\n').map((line, i) => {
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
                <p key={i} className="section-text" style={{ marginBottom: line ? '12px' : '0' }}>
                    {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j} style={{ color: 'var(--color-primary)' }}>{part.slice(2, -2)}</strong>;
                        }
                        return part;
                    })}
                </p>
            );
        });
    };

    const name1 = import.meta.env.VITE_HONEYMOON_NAME_1 || "";
    const iban1 = import.meta.env.VITE_HONEYMOON_IBAN_1 || "";
    const name2 = import.meta.env.VITE_HONEYMOON_NAME_2 || "";
    const iban2 = import.meta.env.VITE_HONEYMOON_IBAN_2 || "";

    const ibans = [
        { name: name1, iban: iban1 },
        { name: name2, iban: iban2 }
    ].filter(item => item.name && item.iban);

    return (
        <main className="page-content">
            <h1 className="hero-title" style={{ fontSize: '32px', marginBottom: '24px' }}>
                {t('travel.honeymoonTitle' as any)}
            </h1>

            <section className="section-card" style={{
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(to bottom right, #ffffff, #fff5f5)',
                padding: '32px 24px'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(188, 0, 45, 0.05)',
                    zIndex: 0
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, position: 'relative', zIndex: 1 }}>
                    <Plane size={28} color="#bc002d" />
                    <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text)' }}>
                        日本
                    </h2>
                </div>

                <div style={{ position: 'relative', zIndex: 1, fontSize: '16px', lineHeight: '1.6' }}>
                    {formatText(t('travel.honeymoonText' as any))}
                </div>

                <div style={{
                    marginTop: '32px',
                    padding: '24px',
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid #eee',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    position: 'relative',
                    zIndex: 1
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <CreditCard size={20} color="var(--color-primary)" />
                        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>
                            {t('travel.giftData' as any)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {ibans.map((item, idx) => (
                            <div key={idx}>
                                <p style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 600 }}>
                                    {item.name}
                                </p>
                                <div style={{ position: 'relative' }}>
                                    <code style={{
                                        display: 'block',
                                        padding: '12px 40px 12px 12px',
                                        backgroundColor: '#f9f9f9',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: 'var(--color-text)',
                                        border: '1px solid #efefef',
                                        wordBreak: 'break-all',
                                        fontFamily: 'monospace'
                                    }}>
                                        {item.iban}
                                    </code>
                                    <button
                                        onClick={() => handleCopy(item.iban, idx)}
                                        style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            padding: '8px',
                                            cursor: 'pointer',
                                            color: copiedIdx === idx ? 'var(--color-success)' : '#aaa',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title="Copia IBAN"
                                    >
                                        {copiedIdx === idx ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: 500, fontStyle: 'italic' }}>
                            どうもありがとうございます
                        </p>
                        <Heart size={24} color="#bc002d" opacity={0.8} />
                    </div>
                </div>
            </section>
        </main>
    );
}
