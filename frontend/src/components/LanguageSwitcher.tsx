"use client"

import * as React from "react"
import { Check, Globe } from "lucide-react"
import { useI18nStore, Language } from "@/store/i18nStore"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const languages: { code: Language; label: string; flag: string }[] = [
    { code: "it", label: "Italiano", flag: "🇮🇹" },
    { code: "es", label: "Español", flag: "🇪🇸" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
]

export function LanguageSwitcher() {
    const { language, setLanguage } = useI18nStore()
    const currentLang = languages.find((l) => l.code === language) || languages[0]

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Globe className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline-block">{currentLang.label} {currentLang.flag}</span>
                    <span className="sm:hidden">{currentLang.flag}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className="flex items-center justify-between"
                    >
                        <span>{lang.flag} {lang.label}</span>
                        {language === lang.code && <Check className="h-4 w-4 text-primary ml-2" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
