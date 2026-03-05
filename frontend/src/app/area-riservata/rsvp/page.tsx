"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitRsvp } from "@/lib/auth";

const formSchema = z.object({
    attending: z.boolean(),
    plusOne: z.boolean(),
    dietaryRestrictions: z.string().optional(),
});

export default function RsvpPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            attending: true,
            plusOne: false,
            dietaryRestrictions: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        setErrorMsg("");
        setSuccess(false);

        try {
            await submitRsvp(values.attending, values.plusOne, values.dietaryRestrictions || "");
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
                    Grazie! Il tuo RSVP è stato inviato correttamente. Vai al prossimo passo: Sondaggio!
                </div>
            )}

            {errorMsg && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                    {errorMsg}
                </div>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-md hover:bg-muted/50 transition-colors">
                        <input type="radio" {...form.register("attending")} value="true" className="w-4 h-4 text-primary" defaultChecked />
                        <span className="font-medium">Sì, parteciperò con gioia!</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-md hover:bg-muted/50 transition-colors">
                        <input type="radio" {...form.register("attending")} value="false" className="w-4 h-4 text-primary" />
                        <span className="font-medium">Purtroppo non potrò esserci</span>
                    </label>
                </div>

                {form.watch("attending")?.toString() === "true" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" {...form.register("plusOne")} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                            <span className="font-medium text-sm">Porterò un +1</span>
                        </label>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Intolleranze, allergie o preferenze dietetiche?</label>
                            <Input
                                {...form.register("dietaryRestrictions")}
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
