export interface PlayerCountSpec {
    //required - is the default if you define a range
    value: number;

    //optional range
    min?: number;
    max?: number;
}

export interface ScenarioSettings {
    // Fixed values
    fixed?: Record<string, unknown>;

    // Allowed values (subset of option choices)
    allowed?: Record<string, unknown[]>;

    // Hidden options (even if defined globally)
    hidden?: string[];
}

// shared/models/ScenarioDefinition.ts
export interface ScenarioDefinition {
    id: string;
    label: string;
    description?: string;

    // Player constraints
    playerCount: PlayerCountSpec;

    // Scenario-controlled settings
    settings?: ScenarioSettings;

    // Option behavior
    locksOptions?: string[];     // option ids locked by this scenario
    hidesOptions?: string[];     // option ids hidden by this scenario
}

export function formatPlayerCount(spec: PlayerCountSpec): string {
    const min = spec.min ?? spec.value;
    const max = spec.max ?? spec.value;

    if(min == max)
        return `${spec.value} players`;

    return `${spec.min}-${spec.max} players`;
}



