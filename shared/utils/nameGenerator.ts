import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
  Config,
} from "unique-names-generator";

export type NameGenerator = (options?: NameOptions) => string;

export type NamePreset =
  | "default"
  | "short"
  | "playful";

export interface NameOptions {
  preset?: NamePreset;

  dictionaries?: Config["dictionaries"];
  separator?: string;
  style?: Config["style"];

  extra?: string;
  suffix?: string;
}

const PRESETS: Record<NamePreset, Config> = {
  default: {
    // adjective + "noun-ish"
    dictionaries: [adjectives, animals],
    separator: " ",
    style: "capital",
  },

  short: {
    dictionaries: [adjectives],
    separator: " ",
    style: "capital",
  },

  playful: {
    dictionaries: [adjectives, colors, animals],
    separator: " ",
    style: "capital",
  },
};

export const generateName: NameGenerator = (options: NameOptions = {}) => {
  const preset = options.preset ?? "default";
  const baseConfig = PRESETS[preset];

  const base = uniqueNamesGenerator({
    ...baseConfig,
    dictionaries: options.dictionaries ?? baseConfig.dictionaries,
    separator: options.separator ?? baseConfig.separator,
    style: options.style ?? baseConfig.style,
  });

  return formatName(base, options.extra, options.suffix);
};

export function formatName(
  base: string,
  extra?: string,
  suffix?: string
): string {
  let result = base;

  if (extra) result += ` ${extra}`;
  if (suffix) result += ` ${suffix}`;

  return result;
}
