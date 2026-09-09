// Renders the product icon from the same rasteriser the tray uses, so the
// installer, taskbar and tray always show the same mark. Run after `tsc`.
const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { renderAppIcon } = require("../dist/shared/orb-icon.js");

const target = join(__dirname, "..", "resources");
mkdirSync(target, { recursive: true });
writeFileSync(join(target, "icon.png"), renderAppIcon(512));
console.log("Wrote resources/icon.png");
