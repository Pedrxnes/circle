import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { HISTORY_MAX_SAMPLES, HISTORY_RETENTION_DAYS, clampPercent } from "../shared/types";
import type { HistorySample, HistorySummary, Usage } from "../shared/types";

/** Keeps a rolling local log of usage readings so Settings can plot a trend. */
export class HistoryStore {
  private readonly path: string;
  private samples: HistorySample[] | null = null;

  constructor(userDataPath: string) {
    this.path = join(userDataPath, "history.json");
  }

  private load(): HistorySample[] {
    if (this.samples) return this.samples;
    try {
      const parsed = JSON.parse(readFileSync(this.path, "utf8")) as unknown;
      this.samples = Array.isArray(parsed) ? parsed.filter(isSample) : [];
    } catch {
      this.samples = [];
    }
    return this.samples;
  }

  record(usage: Usage, now = new Date()): void {
    if (usage.state !== "ok") return;
    const session = usage.windows.find((window) => window.key === "session")?.percent ?? 0;
    const week = usage.windows.find((window) => window.key === "week")?.percent ?? 0;
    const samples = prune([...this.load(), { at: now.toISOString(), session, week }], now);
    this.samples = samples;
    try {
      mkdirSync(dirname(this.path), { recursive: true });
      const temporary = `${this.path}.tmp`;
      writeFileSync(temporary, JSON.stringify(samples), { mode: 0o600 });
      renameSync(temporary, this.path);
    } catch {
      // History is a convenience; losing a write must never break a refresh.
    }
  }

  summary(now = new Date()): HistorySummary {
    const samples = prune(this.load(), now);
    const week = samples.filter((sample) => Date.parse(sample.at) >= now.getTime() - 7 * 86_400_000);
    return {
      samples: week,
      peakSession: week.reduce((peak, sample) => Math.max(peak, sample.session), 0),
      peakWeek: week.reduce((peak, sample) => Math.max(peak, sample.week), 0)
    };
  }
}

function isSample(value: unknown): value is HistorySample {
  if (typeof value !== "object" || value === null) return false;
  const raw = value as Record<string, unknown>;
  return typeof raw.at === "string" && Number.isFinite(Date.parse(raw.at))
    && typeof raw.session === "number" && typeof raw.week === "number";
}

export function prune(samples: HistorySample[], now: Date): HistorySample[] {
  const cutoff = now.getTime() - HISTORY_RETENTION_DAYS * 86_400_000;
  return samples
    .filter((sample) => Date.parse(sample.at) >= cutoff)
    .map((sample) => ({ at: sample.at, session: clampPercent(sample.session), week: clampPercent(sample.week) }))
    .slice(-HISTORY_MAX_SAMPLES);
}
