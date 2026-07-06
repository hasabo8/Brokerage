import { DEFAULT_LOCALE, type Locale } from "./config";

/** A translatable value stored as jsonb {"en":..,"ar":..}. */
export type Localized = Partial<Record<Locale, string>>;

/**
 * Pick the best available string for a locale, falling back gracefully so the
 * UI never renders blank when only one language was entered.
 */
export function pick(
  value: Localized | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (!value) return "";
  return value[locale] || value.en || value.ar || "";
}

/** UI string dictionary. Small, hand-maintained; expand as the app grows. */
export const t = {
  en: {
    appName: "Brokerage",
    dashboard: "Dashboard",
    properties: "Properties",
    addProperty: "Add property",
    search: "Search",
    searchPlaceholder: "e.g. 2-bedroom under 3M in Maadi with a garden",
    price: "Price",
    bedrooms: "Bedrooms",
    city: "City",
    signIn: "Sign in",
    signUp: "Sign up",
    signOut: "Sign out",
    email: "Email",
    password: "Password",
    noResults: "No properties found.",
    save: "Save",
  },
  ar: {
    appName: "نظام الوساطة الذكي",
    dashboard: "لوحة التحكم",
    properties: "العقارات",
    addProperty: "إضافة عقار",
    search: "بحث",
    searchPlaceholder: "مثال: شقة غرفتين أقل من 3 مليون في المعادي بحديقة",
    price: "السعر",
    bedrooms: "غرف النوم",
    city: "المدينة",
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    signOut: "تسجيل الخروج",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    noResults: "لا توجد عقارات.",
    save: "حفظ",
  },
} as const;

export type Dict = (typeof t)["en"];
export const dict = (locale: Locale): Dict => t[locale] ?? t.en;
