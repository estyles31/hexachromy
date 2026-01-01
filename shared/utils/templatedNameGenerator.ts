import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";

export const randomAdjective = () =>
  uniqueNamesGenerator({
    dictionaries: [adjectives],
    style: "capital",
  });

export const randomColor = () =>
  uniqueNamesGenerator({
    dictionaries: [colors],
    style: "capital",
  });

export const randomAnimal = () =>
  uniqueNamesGenerator({
    dictionaries: [animals],
    style: "capital",
  });

export const randomRomanNumneral = () =>
  uniqueNamesGenerator({
    dictionaries: [["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]],
  });

export function randomNonsenseWord(): string {
  const onset = randomFrom(NONSENSE_ONSETS);
  const vowel = randomFrom(NONSENSE_VOWELS);
  const coda = randomFrom(NONSENSE_CODAS);
  const suffix = randomFrom(NONSENSE_SUFFIXES);

  const word = `${onset}${vowel}${coda}${suffix}`;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Starting consonant clusters
export const NONSENSE_ONSETS = [
  "b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "z",
  "bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "sl", "sm", "sn", "sp", "st", "sw", "tr", "wr",
  "sk", "kr", "vr", "zl", "kl", "zr",
];

// Vowel nuclei (including doubles / diphthongs)
export const NONSENSE_VOWELS = [
  "a", "e", "i", "o", "u",
  "oo", "ee", "aa",
  "ai", "au", "ea", "ie", "oa", "ou",
  "ae", "io", "ia", "ei",
  "oi", "ui",
];

// Ending consonants / clusters
export const NONSENSE_CODAS = [
  "",
  "b", "d", "g", "k", "l", "m", "n", "p", "r", "s", "t", "x", "z",
  "sh", "ch", "th",
  "nd", "ng", "rk", "rt", "mp", "lp",
];

// Optional cute endings
export const NONSENSE_SUFFIXES = [
  "",
  "y", "ly", "er", "o", "ish", "oid",
];


export interface NameTemplate {
  base: string;
  weight?: number;  //must be an integer
  suffix?: NameTemplate[];  //optional suffixes that can be added to this template
}

export type TokenResolver = () => string;

export abstract class TemplatedNameGenerator {
  protected abstract templates: NameTemplate[];
  protected abstract tokens: Record<string, TokenResolver>;

  protected maxDepth = 20; //depth at which to end recursion (hard)
  protected maxLength = 100;  //truncate name if it goes beyond this many characters


  generate(): string {
    const root = pickWeighted(this.templates);
    return this.renderTemplate(root, 0).substring(0, this.maxLength).trim();
  }

  /* ---------------- helpers ---------------- */

  protected renderTemplate(template: NameTemplate, depth: number): string {
    if(depth >= this.maxDepth) return "";
    let result = this.resolveTokens(template.base);

    if (template.suffix && template.suffix.length > 0) {
      const chosenSuffix = pickWeighted(template.suffix);

      // Empty base is allowed and meaningful
      if (chosenSuffix.base !== "") {
        if (result.length > 0) {
          result += " ";
        }
        result += this.renderTemplate(chosenSuffix, depth + 1);
      }
    }

    return result;
  }

  protected resolveTokens(text: string): string {
    return text.replace(/\{(\w+)\}/g, (_, token) => {
      const resolver = this.tokens[token];
      if (!resolver) {
        throw new Error(`Unknown token: ${token}`);
      }
      return resolver();
    });
  }
}

/* ---------------- shared utilities ---------------- */

export function pickWeighted<T extends { weight?: number }>(
  items: readonly T[]
): T {
  const expanded = items.flatMap(item =>
    Array(item.weight ?? 1).fill(item)
  );
  return expanded[Math.floor(Math.random() * expanded.length)];
}

export function randomFrom<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}