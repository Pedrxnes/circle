import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { HistoryStore, burnRatePerHour, projectExhaustion, prune, samplesSinceLastReset } from "../main/history";
import { HISTORY_MAX_SAMPLES } from "../shared/types";

const now = new Date("2026-09-09T12:00:00Z"); // a Wednesday

test("prune drops samples older than the retention window", () => {
  const kept = prune([
    { at: "2026-01-01T12:00:00Z", session: 10, week: 10 },
    { at: "2026-09-08T12:00:00Z", session: 20, week: 30 }
  ], now);
  assert.deepEqual(kept.map((sample) => sample.session), [20]);
});

test("prune clamps stored percentages", () => {
  const kept = prune([{ at: "2026-09-09T11:00:00Z", session: 140, week: -5 }], now);
  assert.deepEqual(kept, [{ at: "2026-09-09T11:00:00Z", session: 100, week: 0 }]);
});

test("prune caps the log so the file cannot grow without bound", () => {
  const samples = Array.from({ length: HISTORY_MAX_SAMPLES + 50 }, (_unused, index) => ({
    at: new Date(now.getTime() - index * 1000).toISOString(),
    session: 1,
    week: 1
  }));
  assert.equal(prune(samples, now).length, HISTORY_MAX_SAMPLES);
});

test("samplesSinceLastReset cuts off before a window rollover", () => {
  const samples = [
    { at: "2026-09-09T08:00:00Z", session: 80, week: 10 },
    { at: "2026-09-09T09:00:00Z", session: 95, week: 12 },
    { at: "2026-09-09T10:00:00Z", session: 5, week: 14 }, // session reset here
    { at: "2026-09-09T11:00:00Z", session: 20, week: 16 }
  ];
  const run = samplesSinceLastReset(samples, "session");
  assert.deepEqual(run.map((sample) => sample.session), [5, 20]);
});

test("burnRatePerHour reads percent-per-hour off a steady climb", () => {
  const samples = [
    { at: "2026-09-09T08:00:00Z", session: 10, week: 0 },
    { at: "2026-09-09T09:00:00Z", session: 20, week: 0 },
    { at: "2026-09-09T10:00:00Z", session: 30, week: 0 }
  ];
  assert.equal(burnRatePerHour(samples, "session"), 10);
});

test("burnRatePerHour returns null when there is too little data to trust a slope", () => {
  assert.equal(burnRatePerHour([{ at: "2026-09-09T08:00:00Z", session: 10, week: 0 }], "session"), null);
});

test("burnRatePerHour can read a negative slope; projectExhaustion then reports no exhaustion", () => {
  const declining = [
    { at: "2026-09-09T08:00:00Z", session: 10, week: 0 },
    { at: "2026-09-09T09:00:00Z", session: 10, week: 0 },
    { at: "2026-09-09T10:00:00Z", session: 9.5, week: 0 }
  ];
  const rate = burnRatePerHour(declining, "session");
  assert.ok(rate !== null && rate < 0);
  assert.equal(projectExhaustion(rate, 9.5, now), null);
});

test("projectExhaustion extrapolates to 100% at the current rate", () => {
  const eta = projectExhaustion(10, 50, now); // 10%/h, 50% left to go => 5h
  assert.equal(eta, new Date(now.getTime() + 5 * 3_600_000).toISOString());
});

test("projectExhaustion is null without a positive rate, and immediate once already at the cap", () => {
  assert.equal(projectExhaustion(null, 50, now), null);
  assert.equal(projectExhaustion(-2, 50, now), null);
  assert.equal(projectExhaustion(5, 100, now), now.toISOString());
});

test("summary scopes samples to the browsed calendar week and reports whether older data exists", () => {
  const store = new HistoryStore(tempDir());
  store.record({ state: "ok", windows: [{ key: "session", percent: 10, resetsAt: null }, { key: "week", percent: 20, resetsAt: null }], accountEmail: null, updatedAt: null, error: null, sourceLabel: null }, new Date("2026-09-01T12:00:00Z")); // last week (Tue)
  store.record({ state: "ok", windows: [{ key: "session", percent: 30, resetsAt: null }, { key: "week", percent: 40, resetsAt: null }], accountEmail: null, updatedAt: null, error: null, sourceLabel: null }, now); // this week (Wed)

  const current = store.summary("week", 0, now);
  assert.deepEqual(current.samples.map((s) => s.session), [30]);
  assert.equal(current.hasOlder, true);
  assert.equal(current.hasNewer, false);

  const previous = store.summary("week", 1, now);
  assert.deepEqual(previous.samples.map((s) => s.session), [10]);
  assert.equal(previous.hasNewer, true);
});

test("summary scopes samples to the browsed calendar month", () => {
  const store = new HistoryStore(tempDir());
  store.record({ state: "ok", windows: [{ key: "session", percent: 5, resetsAt: null }, { key: "week", percent: 5, resetsAt: null }], accountEmail: null, updatedAt: null, error: null, sourceLabel: null }, new Date("2026-08-15T12:00:00Z"));
  store.record({ state: "ok", windows: [{ key: "session", percent: 50, resetsAt: null }, { key: "week", percent: 50, resetsAt: null }], accountEmail: null, updatedAt: null, error: null, sourceLabel: null }, now);

  const thisMonth = store.summary("month", 0, now);
  assert.deepEqual(thisMonth.samples.map((s) => s.session), [50]);

  const lastMonth = store.summary("month", 1, now);
  assert.deepEqual(lastMonth.samples.map((s) => s.session), [5]);
});

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "circle-history-test-"));
}
