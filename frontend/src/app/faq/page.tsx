export default function FaqPage() {
    const faqs = [
        { q: "C'è un dress code?", a: "Abito elegante ma comodo. Consigliamo scarpe comode per il parco!" },
        { q: "I bambini sono invitati?", a: "Sì! Ci sarà anche un servizio di animazione dedicato." },
        { q: "Entro quando devo confermare la presenza?", a: "Ti chiediamo gentilmente di confermare entro il 12 Agosto tramite l'Area Riservata." },
        { q: "Dove posso parcheggiare?", a: "La villa dispone di un ampio parcheggio gratuito riservato agli ospiti." },
    ];

    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-serif text-primary">FAQ</h1>
                <p className="text-lg text-muted-foreground">Domande e risposte frequenti</p>
            </div>

            <div className="space-y-6">
                {faqs.map((faq, i) => (
                    <div key={i} className="p-6 bg-card border rounded-lg shadow-sm">
                        <h3 className="text-lg font-medium mb-2">{faq.q}</h3>
                        <p className="text-muted-foreground">{faq.a}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
