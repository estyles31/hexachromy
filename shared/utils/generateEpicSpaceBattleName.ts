import { TemplatedNameGenerator, randomFrom, randomColor, randomAnimal, randomRomanNumneral, type NameTemplate } from "../models/templatedNameGenerator";

/* ---------------------------------------------
 * Word pools
 * --------------------------------------------- */

const EPIC_NOUNS = [
  "Accord",
  "Ambush",
  "Armada",
  "Ascendancy",
  "Assault",
  "Attack",
  "Avalanche",
  "Bastion",
  "Battle",
  "Cataclysm",
  "Collapse",
  "Conflict",
  "Conquest",
  "Conspiracy",
  "Conundrum",
  "Continuum",
  "Crisis",
  "Dominion",
  "Defense",
  "Eclipse",
  "Empire",
  "Epidemic",
  "Expanse",
  "Explosion",
  "Frontier",
  "Horizon",
  "Incident",
  "Inquisition",
  "Insurrection",
  "Invasion",
  "Mandate",
  "Normalization",
  "Pact",
  "Protocol",
  "Rebellion",
  "Reckoning",
  "Schism",
  "Siege",
  "Singularity",
  "Skirmish",
  "Starfall",
  "Treaty",
  "Uprising",
  "War",
];

const EPIC_NAMES = [
  "Ascension",
  "Astra",
  "Atlas",
  "Aurelion",
  "Axiom",
  "Babylon",
  "Caelum",
  "Cyrene",
  "Deep Space",
  "Empyrean",
  "Eon",
  "Erebus",
  "Fiolli",
  "Gemini",
  "Halcyon",
  "Helios",
  "Hyperion",
  "Kepler",
  "Kobayashi",
  "Kronos",
  "Jupiter",
  "Nocturne",
  "Nova",
  "Nyx",
  "Orion",
  "Ouroboros",
  "Parallax",
  "Prism",
  "Romulus",
  "Seraph",
  "Solara",
  "Somnambulus",
  "Triton",
  "Umbra",
  "Valis",
  "Vega",
  "Vortex",
  "Zenith",
];

const EPIC_ADJECTIVES = [
  "Ashen",
  "Broken",
  "Burning",
  "Celestial",
  "Corrupted",
  "Crimson",
  "Correllian",
  "Darwinian",
  "Eternal",
  "Exalted",
  "Fallen",
  "Forgotten",
  "Fractured",
  "Galactic",
  "Golden",
  "Hidden",
  "Imperial",
  "Instinctive",
  "Iron",
  "Ironic",
  "Last",
  "Obsidian",
  "Penultimate",
  "Radiant",
  "Resplendent",
  "Shattered",
  "Silent",
  "Third-to-Last",
  "Vermillion",
  "Voided",
];



/* ---------------------------------------------
 * Generator
 * --------------------------------------------- */

const ofNameSuffix = { base: "of {EpicName}", suffix: [ { base: "" }, { base: "{Roman}"}] };

const epicTemplate: NameTemplate = {
  base: "{EpicName} {EpicNoun}",
  suffix: [
    { base: "", weight: 2 },
    { base: "{Roman}"},
    ofNameSuffix,
  ]
}

const epicAdjTemplate: NameTemplate = {
  base: "{EpicAdjective} {EpicNoun}",
  suffix: [
    { base: "", weight: 2 },
    { base: "{Roman}"},
    ofNameSuffix,
  ]
}

const colorTemplate: NameTemplate = {
  base: "{Color} {EpicNoun}",
  suffix: [
    { base: "" },
    ofNameSuffix,
  ]
}

const animalTemplate: NameTemplate = {
  base: "{Color} {Animal}",
  suffix: [
    { base: "" },
    { base: "{EpicNoun}"},
    ofNameSuffix,
  ]
}

const epicAnimalTemplate: NameTemplate = {
  base: "{EpicAdjective} {Animal}",
  suffix: [
    { base: "" },
    { base: "{EpicNoun}"},
    ofNameSuffix,
  ]
}


const TEMPLATES: NameTemplate[] = [
    epicTemplate,
    epicAdjTemplate,
    { base: "The", suffix: [epicTemplate, epicAdjTemplate, colorTemplate], weight: 2 },
    { base: "The", suffix: [animalTemplate, epicAnimalTemplate] },
];

/* ---------------------------------------------
 * Generator
 * --------------------------------------------- */

export class EpicSpaceBattleNameGenerator
  extends TemplatedNameGenerator
{
  protected templates = TEMPLATES;

  protected tokens = {
    Color: randomColor,
    Animal: randomAnimal,
    EpicAdjective: () => randomFrom(EPIC_ADJECTIVES),
    EpicNoun: () => randomFrom(EPIC_NOUNS),
    EpicName: () => randomFrom(EPIC_NAMES),
    Roman:randomRomanNumneral,
  };
}