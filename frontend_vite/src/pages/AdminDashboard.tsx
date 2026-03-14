import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, XCircle, HelpCircle, BedDouble, Bus, Utensils, Mail, TrendingUp, Baby, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useI18nStore } from '@/store/i18nStore';
import { getAllRsvps } from '@/lib/auth';
import { Loader } from '@/components/Loader';

interface RsvpRecord {
    PK: string;
    guestName: string;
    phoneNumber: string;
    attending?: boolean;
    guests?: Array<{ name: string; isChild: boolean }>;
    dietaryRestrictions?: string;
    sleepAtCastle?: boolean;
    busInterested?: boolean;
    email?: string;
    submittedAt?: string;
}

interface Stats {
    total: number;
    totalResponses: number;
    attending: number;
    notAttending: number;
    noResponse: number;
    adults: number;
    children: number;
    sleepAtCastle: number;
    busInterested: number;
    dietaryList: string[];
    emailCount: number;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.85)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            boxShadow: 'var(--shadow-sm)',
            border: `2px solid ${color}20`,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            transition: 'transform 0.2s',
        }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
            <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: `${color}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color,
                flexShrink: 0
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, fontWeight: 500 }}>{label}</div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const { isAdmin } = useAuthStore();
    const { t } = useI18nStore();
    const navigate = useNavigate();
    const [rsvps, setRsvps] = useState<RsvpRecord[]>([]);
    const [totalInvites, setTotalInvites] = useState(0);
    const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
    const [dietaryOpen, setDietaryOpen] = useState(false);

    useEffect(() => {
        if (!isAdmin) {
            navigate('/', { replace: true });
            return;
        }
        const load = async () => {
            try {
                const data = await getAllRsvps();
                setRsvps(data.rsvps || []);
                setTotalInvites(data.totalInvites || 0);
                setStatus('idle');
            } catch {
                setStatus('error');
            }
        };
        load();
    }, [isAdmin, navigate]);

    if (status === 'loading') return <Loader />;

    const stats: Stats = rsvps.reduce<Stats>((acc, r) => {
        acc.totalResponses++;
        if (r.attending === true) {
            acc.attending++;
            (r.guests || []).forEach(g => {
                if (g.isChild) acc.children++;
                else acc.adults++;
            });
            // Count the main guest too
            acc.adults++;
        } else if (r.attending === false) {
            acc.notAttending++;
        }
        if (r.sleepAtCastle === true) acc.sleepAtCastle++;
        if (r.busInterested === true) acc.busInterested++;
        if (r.dietaryRestrictions && r.dietaryRestrictions.trim()) acc.dietaryList.push(`${r.guestName}: ${r.dietaryRestrictions.trim()}`);
        if (r.email) acc.emailCount++;
        return acc;
    }, {
        total: totalInvites,
        totalResponses: 0,
        attending: 0,
        notAttending: 0,
        noResponse: Math.max(0, totalInvites - rsvps.length),
        adults: 0,
        children: 0,
        sleepAtCastle: 0,
        busInterested: 0,
        dietaryList: [],
        emailCount: 0
    });

    const sectionStyle: React.CSSProperties = {
        marginBottom: 32,
    };

    const sectionTitle: React.CSSProperties = {
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--color-primary)',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        gap: 8
    };

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 16,
    };

    return (
        <main className="page-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={20} color="white" />
                </div>
                <h1 className="hero-title" style={{ fontSize: '28px', margin: 0 }}>
                    {t('admin.dashboard')}
                </h1>
            </div>

            {status === 'error' && (
                <div className="form-error" style={{ marginBottom: 24 }}>
                    Errore nel caricamento dei dati.
                </div>
            )}

            {/* RSVP Overview */}
            <div style={sectionStyle}>
                <div style={sectionTitle}>
                    <Users size={16} /> Risposte generali
                </div>
                <div style={gridStyle}>
                    <StatCard icon={<Users size={22} />} label={t('admin.totalGuests')} value={stats.total} color="#7c47e8" />
                    <StatCard icon={<CheckCircle size={22} />} label={t('admin.attending')} value={stats.attending} color="#22c55e" />
                    <StatCard icon={<XCircle size={22} />} label={t('admin.notAttending')} value={stats.notAttending} color="#ef4444" />
                    <StatCard icon={<HelpCircle size={22} />} label={t('admin.noResponse')} value={stats.noResponse} color="#f59e0b" />
                </div>
            </div>

            {/* Guests breakdown */}
            <div style={sectionStyle}>
                <div style={sectionTitle}>
                    <Users size={16} /> Ospiti
                </div>
                <div style={gridStyle}>
                    <StatCard icon={<Users size={22} />} label={t('admin.adults')} value={stats.adults} color="#3b82f6" />
                    <StatCard icon={<Baby size={22} />} label={t('admin.children')} value={stats.children} color="#ec4899" />
                </div>
            </div>

            {/* Logistics */}
            <div style={sectionStyle}>
                <div style={sectionTitle}>
                    <BedDouble size={16} /> Logistica
                </div>
                <div style={gridStyle}>
                    <StatCard icon={<BedDouble size={22} />} label={t('admin.sleepAtCastle')} value={stats.sleepAtCastle} color="#8b5cf6" />
                    <StatCard icon={<Bus size={22} />} label={t('admin.busInterest')} value={stats.busInterested} color="#06b6d4" />
                    <StatCard icon={<Mail size={22} />} label={t('admin.emailsCollected')} value={stats.emailCount} color="#10b981" />
                </div>
            </div>

            {/* Dietary restrictions */}
            <div style={sectionStyle}>
                <div style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Utensils size={16} /> {t('admin.dietaryRestrictions')} ({stats.dietaryList.length})
                    </div>
                    <button 
                        onClick={() => setDietaryOpen(!dietaryOpen)}
                        style={{
                            background: 'rgba(124, 71, 232, 0.08)',
                            border: '1px solid var(--color-primary)',
                            color: 'var(--color-primary)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: 'none',
                            letterSpacing: 'normal'
                        }}
                    >
                        <span>{dietaryOpen ? t('admin.collapse') : t('admin.expand')}</span>
                        <ChevronDown
                            size={14}
                            style={{
                                transform: dietaryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s ease'
                            }}
                        />
                    </button>
                </div>

                {dietaryOpen && (
                    <div style={{ marginTop: 12 }}>
                        {stats.dietaryList.length === 0 ? (
                            <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', padding: '12px 0' }}>
                                {t('admin.noData')}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {stats.dietaryList.map((item, i) => (
                                    <div key={i} style={{
                                        background: 'rgba(255,255,255,0.8)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '10px 14px',
                                        fontSize: 14,
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text-primary)'
                                    }}>
                                        <Utensils size={13} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--color-primary)' }} />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Full RSVP list */}
            <div style={sectionStyle}>
                <div style={sectionTitle}>
                    <CheckCircle size={16} /> Elenco completo ({rsvps.length})
                </div>
                <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: 'var(--color-primary)', color: 'white' }}>
                                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Nome</th>
                                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>Partecipa</th>
                                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>+Ospiti</th>
                                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>Castello</th>
                                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>Bus</th>
                                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Inviato</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rsvps.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                        {t('admin.noData')}
                                    </td>
                                </tr>
                            ) : rsvps.map((r, i) => (
                                <tr key={r.PK} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(124,71,232,0.02)' }}>
                                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{r.guestName}</td>
                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                        {r.attending === true ? '✅' : r.attending === false ? '❌' : '—'}
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                        {r.attending === true ? (r.guests?.length || 0) : '—'}
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                        {r.sleepAtCastle === true ? '✅' : r.sleepAtCastle === false ? '❌' : '—'}
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                        {r.busInterested === true ? '✅' : r.busInterested === false ? '❌' : '—'}
                                    </td>
                                    <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>
                                        {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}
