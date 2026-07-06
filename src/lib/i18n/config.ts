export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const RTL_LOCALES: Locale[] = ["ar"];
export const isRtl = (locale: Locale) => RTL_LOCALES.includes(locale);

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};
