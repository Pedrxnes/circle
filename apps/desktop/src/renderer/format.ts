import { strings } from "../shared/i18n";
import type { Language, MetricKey } from "../shared/types";

export function localeFor(language: Language): string {
  return language === "pt-BR" ? "pt-BR" : "en-US";
}

export function metricLabel(key: MetricKey, language: Language): string {
  const text = strings(language);
  return key === "session" ? text.session : key === "week" ? text.week : text.weekOpus;
}

export function metricHint(key: MetricKey, language: Language): string {
  const text = strings(language);
  return key === "session" ? text.sessionHint : text.weekHint;
}

/** "resets in 2 h 15 min" while close, an absolute date once further out. */
export function formatReset(resetsAt: string | null, language: Language): string {
  if (!resetsAt) return "";
  const target = Date.parse(resetsAt);
  if (!Number.isFinite(target)) return "";
  const text = strings(language);
  const seconds = (target - Date.now()) / 1000;
  if (seconds <= 0) return "";
  if (seconds < 86_400) {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const span = hours > 0 ? (minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`) : `${Math.max(1, minutes)} min`;
    return `${text.resetsIn} ${span}`;
  }
  const formatted = new Date(target).toLocaleDateString(localeFor(language), { weekday: "short", month: "short", day: "numeric" });
  return `${text.resetsOn} ${formatted}`;
}

/** "runs out in 2 h 15 min" while close, an absolute date once further out. */
export function formatExhaustion(etaIso: string | null, language: Language): string {
  if (!etaIso) return "";
  const target = Date.parse(etaIso);
  if (!Number.isFinite(target)) return "";
  const text = strings(language);
  const seconds = (target - Date.now()) / 1000;
  if (seconds <= 60) return text.exhaustsNow;
  if (seconds < 86_400) {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const span = hours > 0 ? (minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`) : `${Math.max(1, minutes)} min`;
    return `${text.exhaustsIn} ${span}`;
  }
  const formatted = new Date(target).toLocaleDateString(localeFor(language), { weekday: "short", month: "short", day: "numeric" });
  return `${text.exhaustsOn} ${formatted}`;
}

export function formatUpdated(updatedAt: string | null, language: Language): string {
  const text = strings(language);
  if (!updatedAt) return `${text.updated} ${text.never}`;
  const time = new Date(updatedAt).toLocaleTimeString(localeFor(language), { hour: "2-digit", minute: "2-digit" });
  return `${text.updated} ${time}`;
}
