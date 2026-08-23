"use client"

import { useLayoutEffect } from "react"
import type { Locale } from "@/lib/i18n/config"
import { legacyEn, legacyZhCN } from "@/lib/i18n/legacy-translations"

const translatedAttributes = ["aria-label", "placeholder", "title", "alt"] as const
const ignoredElements = new Set(["CODE", "PRE", "SCRIPT", "STYLE", "TEXTAREA"])

function translateValue(value: string, locale: Locale) {
  const leading = value.match(/^\s*/)?.[0] ?? ""
  const trailing = value.match(/\s*$/)?.[0] ?? ""
  const core = value.slice(leading.length, value.length - trailing.length)
  if (!core) return value
  const catalog = locale === "zh-CN" ? legacyZhCN : legacyEn
  const normalized = core.replace(/\s+/g, " ")
  return catalog[normalized] ? `${leading}${catalog[normalized]}${trailing}` : value
}

function translateNode(node: Node, locale: Locale) {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement
    if (!parent || ignoredElements.has(parent.tagName) || parent.closest("[contenteditable='true']")) return
    const next = translateValue(node.nodeValue ?? "", locale)
    if (next !== node.nodeValue) node.nodeValue = next
    return
  }

  if (!(node instanceof Element)) return
  if (ignoredElements.has(node.tagName) || node.closest("[contenteditable='true']")) return
  for (const attribute of translatedAttributes) {
    const current = node.getAttribute(attribute)
    if (!current) continue
    const next = translateValue(current, locale)
    if (next !== current) node.setAttribute(attribute, next)
  }
  for (const child of node.childNodes) translateNode(child, locale)
}

export function LegacyI18nBridge({ locale }: { locale: Locale }) {
  useLayoutEffect(() => {
    translateNode(document.documentElement, locale)
    document.title = translateValue(document.title, locale)
    const observer = new MutationObserver((mutations) => {
      observer.disconnect()
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateNode(mutation.target, locale)
        if (mutation.type === "attributes") translateNode(mutation.target, locale)
        for (const node of mutation.addedNodes) translateNode(node, locale)
      }
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: [...translatedAttributes],
      })
    })
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatedAttributes],
    })
    return () => observer.disconnect()
  }, [locale])

  return null
}
