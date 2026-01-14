import selection from "./hexachromy.icomoon.json";

export type GlyphDef = { unicode?: string; icon?: string; codepoint?: string };
const ICON_CODEPOINTS = loadIconCodepoints();

function loadIconCodepoints(): Record<string, string> {
  const map: Record<string, string> = {};

  const data = selection as any;

  for (const icon of data.glyphs) {
    const name = icon.extras.name;
    const code = icon.extras?.codePoint ?? icon.code; // fallback, depending on export version

    if (name && typeof code === "number") {
      map[name] = String.fromCharCode(code);
    }
  }

  return map;
}

export function getCodepointForIcon(iconName: string): string | undefined {
  return ICON_CODEPOINTS[iconName];
}
