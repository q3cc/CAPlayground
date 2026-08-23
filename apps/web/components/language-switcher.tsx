"use client"

import { Check, Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/components/i18n-provider"
import { locales, translate } from "@/lib/i18n/config"

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "sm" : "icon"}
          className={compact ? "gap-2" : "rounded-full h-9 w-9 p-0"}
          aria-label={t("locale.switch")}
        >
          <Languages className="h-5 w-5" />
          {compact && <span>{translate(locale, "locale.name")}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("locale.switch")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locales.map((option) => (
          <DropdownMenuItem key={option} onClick={() => setLocale(option)} className="justify-between">
            {translate(option, "locale.name")}
            {option === locale && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
