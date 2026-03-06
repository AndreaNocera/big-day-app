"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useI18nStore } from "@/store/i18nStore";
import { verifyMagicLink } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useLoadingStore } from "@/store/loadingStore";

function AuthPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setAuth, token } = useAuthStore();
    const { t } = useI18nStore();
    const { setLoading } = useLoadingStore();

    const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    // Form state
    const [countryCode, setCountryCode] = useState("+39");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [accessCode, setAccessCode] = useState("");

    const urlToken = searchParams.get("token");
    const rawPhone = searchParams.get("phone") || searchParams.get("phoneNumber");
    const urlPhone = rawPhone ? rawPhone.replace(/\s+/g, '+') : null;
    const urlEmail = searchParams.get("email"); // Fallback for old links

    useEffect(() => {
        const handleVerification = async (tokenStr: string, ph: string, em?: string | null) => {
            setStatus("loading");
            setLoading(true);
            try {
                // Pass as object based on the new verifyMagicLink interface
                const payload = { token: tokenStr, phoneNumber: ph, email: em || undefined };
                const data = await verifyMagicLink(payload);
                setAuth(data.jwt, data.guestName);
                setStatus("success");
                setTimeout(() => router.push("/area-riservata/rsvp"), 1500);
            } catch (err: unknown) {
                setStatus("error");
                if (err instanceof Error) {
                    setErrorMsg(err.message || t("auth.errorInvalid"));
                } else {
                    setErrorMsg(t("auth.errorInvalid"));
                }
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            router.push("/area-riservata/rsvp");
        } else if (urlToken && (urlPhone || urlEmail)) {
            handleVerification(urlToken, urlPhone || "", urlEmail);
        }
    }, [urlToken, urlPhone, urlEmail, token, router, setAuth, t, setLoading]);

    const handleManualLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setLoading(true);
        setErrorMsg("");
        try {
            const formattedPhone = `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;
            const data = await verifyMagicLink({ phoneNumber: formattedPhone, accessCode });
            setAuth(data.jwt, data.guestName);
            setStatus("success");
            setTimeout(() => router.push("/area-riservata/rsvp"), 1500);
        } catch (err: unknown) {
            setStatus("error");
            if (err instanceof Error) {
                setErrorMsg(err.message || t("auth.errorInvalid"));
            } else {
                setErrorMsg(t("auth.errorInvalid"));
            }
        } finally {
            setLoading(false);
        }
    };

    if (status === ("loading" as string)) {
        return null; // The global LoadingOverlay handles this state
    }

    if (status === "success") {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                <h2 className="text-2xl font-semibold text-primary">{t("auth.success")}</h2>
                <p className="text-muted-foreground">{t("auth.redirecting")}</p>
            </div>
        );
    }

    if (status === "error" && (urlToken || urlEmail)) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center px-4">
                <h2 className="text-2xl font-semibold text-destructive">{t("auth.errorTitle")}</h2>
                <p className="text-muted-foreground">{errorMsg}</p>
                <p className="text-sm mt-4">{t("auth.errorCheck")}</p>
                <Button onClick={() => router.push("/auth")} variant="outline" className="mt-8">{t("auth.errorTryManual")}</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-8">
            <h1 className="text-3xl font-serif text-primary mb-4">{t("auth.title")}</h1>
            <p className="text-muted-foreground max-w-md mb-8">
                {t("auth.subtitle")}
            </p>

            <form onSubmit={handleManualLogin} className="w-full max-w-sm space-y-4 md:shadow-lg md:p-8 md:rounded-xl md:border md:bg-card">
                {status === "error" && !urlToken && (
                    <div className="p-3 mb-4 text-sm text-destructive bg-destructive/10 rounded-md">
                        {errorMsg}
                    </div>
                )}

                <div className="space-y-2 text-left">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {t("auth.phoneLabel")}
                    </label>
                    <div className="flex space-x-2">
                        <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="flex h-10 w-[100px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="+39">🇮🇹 +39</option>
                            <option value="+34">🇪🇸 +34</option>
                            <option value="+33">🇫🇷 +33</option>
                            <option value="+44">🇬🇧 +44</option>
                            <option value="+54">🇦🇷 +54</option>
                        </select>
                        <input
                            type="tel"
                            required
                            placeholder="333 123 4567"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </div>

                <div className="space-y-2 text-left">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {t("auth.pinLabel")}
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        required
                        placeholder="1234"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-center tracking-widest text-lg"
                    />
                </div>

                <Button type="submit" className="w-full mt-6" disabled={status === ("loading" as string)}>
                    {status === ("loading" as string) ? t("auth.loading") : t("auth.loginBtn")}
                </Button>
            </form>
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-[50vh]">Loading...</div>}>
            <AuthPageContent />
        </Suspense>
    );
}
