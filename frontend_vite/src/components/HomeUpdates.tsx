import {
    BedDouble,
    Building2,
    Bus,
    CalendarPlus,
    ChevronDown,
    Clock3,
    Coffee,
    ExternalLink,
    LogIn,
    LogOut,
    MapPin,
} from 'lucide-react';
import { useI18nStore } from '@/store/i18nStore';

function toUtcCalendarTimestamp(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function toLocalCalendarTimestamp(value: string) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return '';
    const [, year, month, day, hour, minute, second = '00'] = match;
    return `${year}${month}${day}T${hour}${minute}${second}`;
}

function escapeCalendarText(value: string) {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}

function buildGoogleCalendarUrl({
    title,
    start,
    end,
    description,
    location,
    timeZone,
}: {
    title: string;
    start: string;
    end: string;
    description: string;
    location: string;
    timeZone: string;
}) {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates: `${toLocalCalendarTimestamp(start)}/${toLocalCalendarTimestamp(end)}`,
        details: description,
        location,
        ctz: timeZone,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function DetailRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="home-update-row">
            <span className="home-update-row-icon" aria-hidden="true">{icon}</span>
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

function BusStopLink() {
    const { t } = useI18nStore();

    return (
        <div className="home-update-map-row">
            <MapPin size={20} aria-hidden="true" />
            <span>
                <small>{t('home.updatesPickupPoint')}</small>
                <strong>{t('home.updatesPickupLocation')}</strong>
            </span>
            <a
                href={t('home.updatesBusStopUrl')}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t('home.updatesOpenMap')}: ${t('home.updatesPickupLocation')}`}
            >
                {t('home.updatesOpenMap')}
                <ExternalLink size={14} aria-hidden="true" />
            </a>
        </div>
    );
}

export function HomeUpdates() {
    const { t } = useI18nStore();
    const eventTitle = t('home.updatesCalendarEventTitle');
    const eventStart = t('home.updatesCalendarStartIso');
    const eventEnd = t('home.updatesCalendarEndIso');
    const eventDescription = t('home.updatesCalendarEventDescription');
    const eventLocation = t('home.updatesCalendarEventLocation');
    const eventTimeZone = t('home.updatesCalendarTimeZone');
    const googleCalendarUrl = buildGoogleCalendarUrl({
        title: eventTitle,
        start: eventStart,
        end: eventEnd,
        description: eventDescription,
        location: eventLocation,
        timeZone: eventTimeZone,
    });

    const downloadCalendarEvent = () => {
        const calendar = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Big Day App//Event//IT',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:${escapeCalendarText(eventTitle)}`,
            `X-WR-TIMEZONE:${escapeCalendarText(eventTimeZone)}`,
            'BEGIN:VTIMEZONE',
            `TZID:${escapeCalendarText(eventTimeZone)}`,
            `X-LIC-LOCATION:${escapeCalendarText(eventTimeZone)}`,
            'BEGIN:DAYLIGHT',
            'TZOFFSETFROM:+0100',
            'TZOFFSETTO:+0200',
            'TZNAME:CEST',
            'DTSTART:19700329T020000',
            'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
            'END:DAYLIGHT',
            'BEGIN:STANDARD',
            'TZOFFSETFROM:+0200',
            'TZOFFSETTO:+0100',
            'TZNAME:CET',
            'DTSTART:19701025T030000',
            'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
            'END:STANDARD',
            'END:VTIMEZONE',
            'BEGIN:VEVENT',
            'UID:wedding-event@big-day-app',
            `DTSTAMP:${toUtcCalendarTimestamp(new Date().toISOString())}`,
            `LAST-MODIFIED:${toUtcCalendarTimestamp(new Date().toISOString())}`,
            'SEQUENCE:1',
            `DTSTART;TZID=${eventTimeZone}:${toLocalCalendarTimestamp(eventStart)}`,
            `DTEND;TZID=${eventTimeZone}:${toLocalCalendarTimestamp(eventEnd)}`,
            `SUMMARY:${escapeCalendarText(eventTitle)}`,
            `LOCATION:${escapeCalendarText(eventLocation)}`,
            `DESCRIPTION:${escapeCalendarText(eventDescription)}`,
            'STATUS:CONFIRMED',
            'TRANSP:OPAQUE',
            'END:VEVENT',
            'END:VCALENDAR',
        ].join('\r\n');
        const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'evento.ics';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
        <section className="home-updates" aria-labelledby="home-updates-title">
            <header className="home-updates-heading">
                <span className="home-updates-date">{t('home.updatesDate')}</span>
                <h2 id="home-updates-title">{t('home.updatesTitle')}</h2>
            </header>

            <div className="home-ceremony-highlight">
                <span className="home-ceremony-icon" aria-hidden="true">
                    <Clock3 size={28} />
                </span>
                <span>{t('home.updatesCeremonyLabel')}</span>
                <strong>{t('home.updatesCeremonyTime')}</strong>
                <details className="home-calendar-menu">
                    <summary>
                        <CalendarPlus size={17} aria-hidden="true" />
                        {t('home.updatesAddToCalendar')}
                        <ChevronDown size={15} className="home-calendar-chevron" aria-hidden="true" />
                    </summary>
                    <div className="home-calendar-options">
                        <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
                            {t('home.updatesGoogleCalendar')}
                            <CalendarPlus size={14} aria-hidden="true" />
                        </a>
                        <button type="button" onClick={downloadCalendarEvent}>
                            {t('home.updatesDeviceCalendar')}
                            <CalendarPlus size={14} aria-hidden="true" />
                        </button>
                    </div>
                </details>
            </div>

            <article className="home-update-card castle">
                <details className="home-update-accordion">
                    <summary className="home-update-card-heading">
                        <span className="home-update-card-icon" aria-hidden="true"><BedDouble size={25} /></span>
                        <h3>{t('home.updatesCastleTitle')}</h3>
                        <span className="home-update-card-toggle">
                            <span className="home-update-card-toggle-closed">{t('home.updatesShowDetails')}</span>
                            <span className="home-update-card-toggle-open">{t('home.updatesHideDetails')}</span>
                            <ChevronDown size={18} aria-hidden="true" />
                        </span>
                    </summary>

                    <div className="home-update-card-body">
                        <dl className="home-update-details">
                            <DetailRow icon={<LogIn size={18} />} label={t('home.updatesCheckIn')} value={t('home.updatesCheckInValue')} />
                            <DetailRow icon={<Coffee size={18} />} label={t('home.updatesBreakfast')} value={t('home.updatesBreakfastValue')} />
                            <DetailRow icon={<LogOut size={18} />} label={t('home.updatesCheckOut')} value={t('home.updatesCheckOutValue')} />
                        </dl>

                        <div className="home-update-bus-section">
                            <h4><Bus size={19} aria-hidden="true" /> {t('home.updatesBuses')}</h4>
                            <dl className="home-update-details compact">
                                <DetailRow icon={<LogIn size={17} />} label={t('home.updatesOutbound')} value={t('home.updatesCastleOutbound')} />
                            </dl>
                            <BusStopLink />
                            <dl className="home-update-details compact">
                                <DetailRow icon={<LogOut size={17} />} label={t('home.updatesReturn')} value={t('home.updatesCastleReturn')} />
                            </dl>
                        </div>
                    </div>
                </details>
            </article>

            <article className="home-update-card city">
                <details className="home-update-accordion">
                    <summary className="home-update-card-heading">
                        <span className="home-update-card-icon" aria-hidden="true"><Building2 size={24} /></span>
                        <h3>{t('home.updatesCityTitle')}</h3>
                        <span className="home-update-card-toggle">
                            <span className="home-update-card-toggle-closed">{t('home.updatesShowDetails')}</span>
                            <span className="home-update-card-toggle-open">{t('home.updatesHideDetails')}</span>
                            <ChevronDown size={18} aria-hidden="true" />
                        </span>
                    </summary>

                    <div className="home-update-card-body">
                        <div className="home-update-bus-section city-bus">
                            <h4><Bus size={19} aria-hidden="true" /> {t('home.updatesBuses')}</h4>
                            <dl className="home-update-details compact">
                                <DetailRow icon={<LogIn size={17} />} label={t('home.updatesOutbound')} value={t('home.updatesCityOutbound')} />
                            </dl>
                            <BusStopLink />
                            <dl className="home-update-details compact">
                                <DetailRow icon={<LogOut size={17} />} label={t('home.updatesReturn')} value={t('home.updatesCityReturn')} />
                                <DetailRow icon={<MapPin size={17} />} label={t('home.updatesReturnPoint')} value={t('home.updatesCastleParking')} />
                            </dl>
                        </div>
                    </div>
                </details>
            </article>
        </section>
    );
}
