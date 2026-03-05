import Map from "@/components/Map";

export default function LocationPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-serif text-primary">Location</h1>
                <p className="text-lg text-muted-foreground">Dove celebreremo il nostro amore</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Villa dei Sogni</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        La cerimonia e il ricevimento si terranno presso la splendida Villa dei Sogni,
                        immersa nel verde e circondata da un parco secolare.
                    </p>
                    <div className="space-y-2 text-sm">
                        <p className="font-medium text-foreground">Indirizzo:</p>
                        <p className="text-muted-foreground">Via Romantica 123, 00100 Roma (RM)</p>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p className="font-medium text-foreground">Parcheggio:</p>
                        <p className="text-muted-foreground">Disponibile ampio parcheggio gratuito interno alla villa.</p>
                    </div>
                </div>

                <div className="rounded-lg overflow-hidden shadow-lg h-[400px]">
                    {/* Defaulting to a central position in Italy for demo */}
                    <Map lng={12.4964} lat={41.9028} zoom={13} />
                </div>
            </div>
        </div>
    );
}
