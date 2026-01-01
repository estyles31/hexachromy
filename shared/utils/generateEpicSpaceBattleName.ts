import { TemplatedNameGenerator, randomFrom, randomColor, randomAnimal, randomRomanNumneral, type NameTemplate, randomNonsenseWord } from "./templatedNameGenerator";

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
  "Juno",
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
  "Starpoint",
  "Triton",
  "Umbra",
  "Valis",
  "Vallhalla",
  "Vega",
  "Vortex",
  "Zenith",
];

const EPIC_ADJECTIVES = [
  "Ashen",
  "Atrophied",
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
  "First",
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
  "Oppulent",
  "Penultimate",
  "Radiant",
  "Resplendent",
  "Second",
  "Shattered",
  "Silent",
  "Third",
  "Third-to-Last",
  "Vermillion",
  "Voided",
];



/* ---------------------------------------------
 * Generator
 * --------------------------------------------- */

const ε: NameTemplate = { base: "" };
const ofNameSuffix = { base: "of {EpicName}", suffix: [ ε, { base: "{Roman}", weight: 3}] };

const epicTemplate: NameTemplate = {
  base: "{EpicName} {EpicNoun}",
  suffix: [
    { ...ε, weight: 2 },
    { base: "{Roman}"},
    ofNameSuffix,
  ]
}

const epicAdjTemplate: NameTemplate = {
  base: "{EpicAdjective} {EpicNoun}",
  suffix: [
    { ...ε, weight: 2 },
    { base: "{Roman}"},
    ofNameSuffix,
  ]
}

const colorTemplate: NameTemplate = {
  base: "{Color} {EpicNoun}",
  suffix: [
    ε,
    ofNameSuffix,
  ]
}

const animalTemplate: NameTemplate = {
  base: "{Color} {Animal}",
  suffix: [
   ε,
    { base: "{EpicNoun}"},
    ofNameSuffix,
  ]
}

const epicAnimalTemplate: NameTemplate = {
  base: "{EpicAdjective} {Animal}",
  suffix: [
    ε,
    { base: "{EpicNoun}"},
    ofNameSuffix,
  ]
}

const nonSenseChain: NameTemplate = { 
  base: "{Nonsense}",
  suffix: [
    { ...ofNameSuffix, weight: 3 },
  ]
}

nonSenseChain.suffix!.push(nonSenseChain);

const nonsenseTemplate: NameTemplate = {
  base: "{Nonsense}",
  suffix: [
    nonSenseChain,
    { base: "{EpicNoun}", suffix: [ε, ofNameSuffix] },
    { base: "{Animal}", suffix: [ε, ofNameSuffix] },
  ]
}


const TEMPLATES: NameTemplate[] = [
  { ...epicTemplate, weight: 2 },
  { ...epicAdjTemplate, weight: 2},
  { base: "The", suffix: [epicTemplate, epicAdjTemplate, colorTemplate] },
  { base: "The", suffix: [animalTemplate, epicAnimalTemplate]},
  { base: "The", suffix: [nonsenseTemplate]},
  { base: "{EpicNoun} on {EpicName}", suffix: [{ base: "" }, { base: "{Roman}", weight: 3 },] }
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
    Nonsense: randomNonsenseWord,
    Roman:randomRomanNumneral,
  };
}