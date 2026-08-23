import { cookies, headers } from "next/headers"
import {
  localeCookieName,
  resolveLocale,
  translate,
  type MessageKey,
  type TranslationValues,
} from "./config"

export async function getServerLocale() {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(localeCookieName)?.value
  if (cookieLocale) return resolveLocale(cookieLocale)

  const headerStore = await headers()
  return resolveLocale(headerStore.get("accept-language"))
}

export async function getServerI18n() {
  const locale = await getServerLocale()
  return {
    locale,
    t: (key: MessageKey, values?: TranslationValues) => translate(locale, key, values),
  }
}
