"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18nStore } from "@/store/i18nStore";

export default function Home() {
  const { t } = useI18nStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background to-muted/50">
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 px-4 py-20">
        <h1 className="text-5xl md:text-7xl font-serif font-light tracking-tight text-primary">
          {t("home.heroTitle")}
        </h1>
        <p className="text-xl md:text-2xl font-light text-muted-foreground max-w-[600px]">
          {t("home.subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-8">
          <Link href="/location/">
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base">
              {t("home.whereWhen")}
            </Button>
          </Link>
          <Link href="/auth/">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-lg hover:shadow-primary/25 transition-all">
              {t("home.rsvpBtn")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
