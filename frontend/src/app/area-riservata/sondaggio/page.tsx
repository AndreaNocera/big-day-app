"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitSurvey } from "@/lib/auth";

const formSchema = z.object({
    favoriteSong: z.string().min(1, "Scegli una canzone per farci ballare!"),
    message: z.string().optional(),
});

export default function SondaggioPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            favoriteSong: "",
            message: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        setErrorMsg("");
        setSuccess(false);

        try {
            await submitSurvey(values);
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
                <h2 className="text-2xl font-semibold mb-2">Un piccolo sondaggio</h2>
                <p className="text-muted-foreground">Aiutaci a rendere la festa indimenticabile!</p>
            </div>

            {success && (
                <div className="p-4 bg-primary/10 text-primary rounded-md border border-primary/20">
                    Grazie! Le tue risposte sono state salvate.
                </div>
            )}

            {errorMsg && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                    {errorMsg}
                </div>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Una canzone che non può mancare alla festa?</label>
                    <Input
                        {...form.register("favoriteSong")}
                        placeholder="Es. Dancing Queen - ABBA"
                    />
                    {form.formState.errors.favoriteSong && (
                        <p className="text-sm text-destructive">{form.formState.errors.favoriteSong.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Un messaggio per gli sposi (opzionale)</label>
                    <textarea
                        {...form.register("message")}
                        placeholder="Scrivi qui..."
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                    />
                </div>

                <Button type="submit" disabled={loading} className="w-full md:w-auto">
                    {loading ? "Salvataggio..." : "Invia Risposte"}
                </Button>
            </form>
        </div>
    );
}
