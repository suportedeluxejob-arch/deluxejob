"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import type { Locale } from "@/lib/i18n"
import { getTranslations } from "@/lib/i18n"

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  translations: ReturnType<typeof getTranslations>
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({
  children,
  defaultLocale = "pt-BR",
}: { children: React.ReactNode; defaultLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Detectar preferência do navegador ou usar localStorage
    const savedLocale = localStorage.getItem("locale") as Locale | null
    const browserLocale = navigator.language as Locale

    const newLocale = savedLocale || (browserLocale in translations ? browserLocale : defaultLocale)
    setLocaleState(newLocale)
    setMounted(true)
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem("locale", newLocale)
    document.documentElement.lang = newLocale
  }

  const translations = getTranslations(locale)

  const t = (key: string): string => {
    const keys = key.split(".")
    let value: any = translations

    for (const k of keys) {
      value = value?.[k]
    }

    return value || key
  }

  if (!mounted) return children

  return <I18nContext.Provider value={{ locale, setLocale, t, translations }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider")
  }
  return context
}
