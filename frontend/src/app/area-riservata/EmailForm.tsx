"use client";

import { useState } from "react";
import { submitEmail } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function EmailForm() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus("loading");
        try {
            await submitEmail(email);
            setStatus("success");
        } catch (error) {
            console.error(error);
            setStatus("error");
        }
    };

    if (status === "success") {
        return (
            <div className="text-sm text-primary font-medium p-3 rounded-md bg-primary/10 border border-primary/20">
                Email salvata con successo. Grazie!
            </div>
        );
    }

    return (
        <div className="relative">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-sm">
                <input
                    type="email"
                    required
                    placeholder="la.tua@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button type="submit" disabled={status === "loading"} className="whitespace-nowrap">
                    {status === "loading" ? "Salvataggio..." : "Salva Email"}
                </Button>
            </form>
            {status === "error" && <p className="text-xs text-destructive mt-1">Errore durante il salvataggio</p>}
        </div>
    );
}
