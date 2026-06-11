import { getConfig } from "../config";
import es from "./es.json";
import en from "./en.json";

const dicts: Record<"es" | "en", Record<string, string>> = {
  es: es as Record<string, string>,
  en: en as Record<string, string>,
};

/** Traducción server-side. Client components reciben labels por props. */
export function t(key: string): string {
  const lang = getConfig().uiLanguage;
  return dicts[lang][key] ?? dicts.es[key] ?? key;
}
