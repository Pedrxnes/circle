import type { JSX } from "react";
import type { HistorySample } from "../shared/types";

const WIDTH = 640;
const HEIGHT = 120;
const PADDING = 6;

function path(samples: HistorySample[], pick: (sample: HistorySample) => number, span: { from: number; to: number }): string {
  const range = Math.max(1, span.to - span.from);
  return samples
    .map((sample, index) => {
      const x = PADDING + ((Date.parse(sample.at) - span.from) / range) * (WIDTH - PADDING * 2);
      const y = HEIGHT - PADDING - (pick(sample) / 100) * (HEIGHT - PADDING * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

interface SparklineProps {
  samples: HistorySample[];
  accent: string;
  sessionLabel: string;
  weekLabel: string;
}

/** Two overlaid traces of the last week of readings: session and weekly usage. */
export function Sparkline({ samples, accent, sessionLabel, weekLabel }: SparklineProps): JSX.Element {
  const sorted = [...samples].sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = { from: Date.parse(first!.at), to: Date.parse(last!.at) };

  return (
    <>
      <div className="legend">
        <span><i style={{ background: accent }} />{sessionLabel}</span>
        <span><i className="legend-week" />{weekLabel}</span>
      </div>
      <svg className="sparkline" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img">
        {[25, 50, 75].map((line) => (
        <line
          key={line}
          x1={PADDING}
          x2={WIDTH - PADDING}
          y1={HEIGHT - PADDING - (line / 100) * (HEIGHT - PADDING * 2)}
          y2={HEIGHT - PADDING - (line / 100) * (HEIGHT - PADDING * 2)}
          stroke="currentColor"
          strokeOpacity={0.08}
          strokeWidth={1}
        />
      ))}
      <path d={path(sorted, (sample) => sample.week, span)} fill="none" stroke="currentColor" strokeOpacity={0.38} strokeWidth={2} strokeLinejoin="round" />
      <path d={path(sorted, (sample) => sample.session, span)} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" />
      </svg>
    </>
  );
}
