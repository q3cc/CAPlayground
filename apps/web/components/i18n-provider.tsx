"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { LegacyI18nBridge } from "@/components/legacy-i18n-bridge"
import {
  localeCookieName,
  localeStorageKey,
  resolveLocale,
  translate,
  type Locale,
  type MessageKey,
  type TranslationValues,
} from "@/lib/i18n/config"

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, values?: TranslationValues) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale
  children: ReactNode
}) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const applyLocale = useCallback(
    (nextLocale: Locale, refresh = true) => {
      setLocaleState(nextLocale)
      document.documentElement.lang = nextLocale
      window.localStorage.setItem(localeStorageKey, nextLocale)
      document.cookie = `${localeCookieName}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`
      if (refresh) router.refresh()
    },
    [router],
  )

  useEffect(() => {
    const stored = window.localStorage.getItem(localeStorageKey)
    const preferred = resolveLocale(stored || window.navigator.language)
    document.documentElement.lang = preferred
    if (preferred !== locale) applyLocale(preferred)
  }, [applyLocale, locale])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => applyLocale(nextLocale),
      t: (key, values) => translate(locale, key, values),
    }),
    [applyLocale, locale],
  )

  return (
    <I18nContext.Provider value={value}>
      {children}
      <LegacyI18nBridge locale={locale} />
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error("useI18n must be used inside I18nProvider")
  return value
}
