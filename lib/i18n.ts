const translations = {
  "pt-BR": require("@/public/locales/pt-BR.json"),
  "en-US": require("@/public/locales/en-US.json"),
  "es-ES": require("@/public/locales/es-ES.json"),
} as const

export type Locale = keyof typeof translations

const defaultLocale: Locale = "pt-BR"

export function getTranslations(locale: Locale) {
  return translations[locale] || translations[defaultLocale]
}

export function getNestedTranslation(obj: any, path: string) {
  return path.split(".").reduce((acc, part) => acc?.[part], obj)
}
