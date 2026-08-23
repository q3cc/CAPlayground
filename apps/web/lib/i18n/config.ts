import { en, type MessageKey } from "./messages/en"
import { zhCN } from "./messages/zh-CN"

export const locales = ["en", "zh-CN"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"
export const localeCookieName = "caplayground-locale"
export const localeStorageKey = "caplayground-locale"

const messages: Record<Locale, Record<MessageKey, string>> = {
  en,
  "zh-CN": zhCN,
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale)
}

export function resolveLocale(value: string | null | undefined): Locale {
  if (isLocale(value)) return value
  if (value?.toLowerCase().startsWith("zh")) return "zh-CN"
  return defaultLocale
}

export type TranslationValues = Record<string, string | number>

export function translate(locale: Locale, key: MessageKey, values?: TranslationValues) {
  const template = messages[locale][key] ?? en[key]
  if (!values) return template

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name]
    return value === undefined ? match : String(value)
  })
}

export type { MessageKey }
