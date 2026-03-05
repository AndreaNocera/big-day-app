"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitRsvp } from "@/lib/auth";

export default function RsvpPage() {
    const [attending, setAttending] = useState(true);
    const [plusOne, setPlusOne] = useState(false);
    const [dietaryRestrictions, setDietaryRestrictions] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");
        setSuccess(false);

        const effectivePlusOne = attending ? plusOne : false;

        try {
            await submitRsvp(attending, effectivePlusOne, dietaryRestrictions);
            setSuccess(true);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setErrorMsg(err.message || "Errore durante il salvataggio");
            } else {
                setErrorMsg("Errore durante il salvataggio");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold mb-2">Conferma la tua presenza</h2>
                <p className="text-muted-foreground">Facci sapere se ci sarai per aiutarci con l&apos;organizzazione.</p>
            </div>

            {success && (
                <div className="p-4 bg-primary/10 text-primary rounded-md border border-primary/20">
                    🎉 Grazie! Il tuo RSVP è stato inviato correttamente. Vai al prossimo passo: Sondaggio!
                </div>
            )}

            {errorMsg && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-md hover:bg-muted/50 transition-colors">
                        <input
                            type="radio"
                            name="attending"
                            checked={attending === true}
                            onChange={() => setAttending(true)}
                            className="w-4 h-4 text-primary"
                        />
                        <span className="font-medium">Sì, parteciperò con gioia!</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-md hover:bg-muted/50 transition-colors">
                        <input
                            type="radio"
                            name="attending"
                            checked={attending === false}
                            onChange={() => {
                                setAttending(false);
                                setPlusOne(false);
                            }}
                            className="w-4 h-4 text-primary"
                        />
                        <span className="font-medium">Purtroppo non potrò esserci</span>
                    </label>
                </div>

                {attending && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={plusOne}
                                onChange={(e) => setPlusOne(e.target.checked)}
                                className="w-4 h-4 rounded text-primary focus:ring-primary"
                            />
                            <span className="font-medium text-sm">Porterò un +1</span>
                        </label>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Intolleranze, allergie o preferenze dietetiche?</label>
                            <Input
                                value={dietaryRestrictions}
                                onChange={(e) => setDietaryRestrictions(e.target.value)}
                                placeholder="Es. Celiaco, Vegetariano, Nessuna..."
                            />
                        </div>
                    </div>
                )}

                <Button type="submit" disabled={loading} className="w-full md:w-auto">
                    {loading ? "Salvataggio..." : "Conferma RSVP"}
                </Button>
            </form>
        </div>
    );
}
