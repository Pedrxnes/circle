import assert from "node:assert/strict";
import test from "node:test";
import { prune } from "../main/history";
import { HISTORY_MAX_SAMPLES } from "../shared/types";

const now = new Date("2026-09-09T12:00:00Z");

test("prune drops samples older than the retention window", () => {
  const kept = prune([
    { at: "2026-08-01T12:00:00Z", session: 10, week: 10 },
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
