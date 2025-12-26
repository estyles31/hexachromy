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
    dictionaries: [["I","II","III","IV","V","VI","VII","VIII","IX","X", "XI", "XII"]],
  });


export interface NameTemplate {
  base: string;
  weight?: number;  //must be an integer
  suffix?: NameTemplate[];  //optional suffixes that can be added to this template
}

export type TokenResolver = () => string;

export abstract class TemplatedNameGenerator {
  protected abstract templates: NameTemplate[];
  protected abstract tokens: Record<string, TokenResolver>;

  generate(): string {
    const root = pickWeighted(this.templates);
    return this.renderTemplate(root).trim();
  }

  /* ---------------- helpers ---------------- */

  protected renderTemplate(template: NameTemplate): string {
    let result = this.resolveTokens(template.base);

    if (template.suffix && template.suffix.length > 0) {
      const chosenSuffix = pickWeighted(template.suffix);

      // Empty base is allowed and meaningful
      if (chosenSuffix.base !== "") {
        if (result.length > 0) {
          result += " ";
        }
        result += this.renderTemplate(chosenSuffix);
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