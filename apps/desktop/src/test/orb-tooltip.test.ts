import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * The orb window is click-through and never focused, so a native tooltip drawn
 * for a `title` attribute (or an SVG `<title>`) never receives the mouse-out or
 * activation change that dismisses it: it stays on screen above the orb, where
 * it reads as a stray title bar, until the window itself is destroyed. Nothing
 * rendered into that window may carry one — `aria-label` names it instead.
 */
const ORB_WINDOW_COMPONENTS = ["orb.tsx", "Ring.tsx"];

for (const name of ORB_WINDOW_COMPONENTS) {
  test(`${name} renders no native tooltip`, () => {
    const source = readFileSync(join(__dirname, "..", "..", "src", "renderer", name), "utf8");
    assert.ok(!/\stitle\s*=/.test(source), `${name} must not set a title attribute`);
    assert.ok(!/<title[\s>]/.test(source), `${name} must not render a <title> element`);
  });
}
