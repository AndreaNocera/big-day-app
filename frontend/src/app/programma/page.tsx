export default function ProgrammaPage() {
    const events = [
        { time: "16:00", title: "Arrivo degli Ospiti", desc: "Vi aspettiamo per un cocktail di benvenuto" },
        { time: "16:30", title: "Cerimonia", desc: "Il momento del 'Sì'" },
        { time: "17:30", title: "Aperitivo", desc: "Brindisi e stuzzichini nel parco" },
        { time: "19:00", title: "Cena", desc: "Menu speciale creato per noi" },
        { time: "22:00", title: "Taglio della Torta", desc: "Momento dolce" },
        { time: "22:30", title: "Festa & Open Bar", desc: "Musica, balli e divertimento" },
    ];

    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-serif text-primary">Il Programma</h1>
                <p className="text-lg text-muted-foreground">La timeline della nostra giornata</p>
            </div>

            <div className="relative border-l-2 border-primary/30 pl-8 ml-4 md:ml-0 space-y-12">
                {events.map((e, idx) => (
                    <div key={idx} className="relative">
                        <div className="absolute w-4 h-4 bg-primary rounded-full -left-[41px] top-1" />
                        <h3 className="text-xl font-semibold text-foreground flex items-center gap-4">
                            <span className="text-primary font-mono text-lg">{e.time}</span>
                            {e.title}
                        </h3>
                        <p className="text-muted-foreground mt-2">{e.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
