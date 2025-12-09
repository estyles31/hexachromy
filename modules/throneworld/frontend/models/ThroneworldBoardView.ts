// /modules/throneworld/frontend/models/ThroneworldBoardView.ts
import type { ThroneworldGameState, ThroneworldSystemDetails } from "../../shared/models/GameState.Throneworld";
import type { ThroneworldBoardGeometry } from "../../shared/models/BoardGeometry.ThroneWorld";

export interface ThroneworldBoardView {
    systems: RenderableSystem[];
}

export interface RenderableSystem {
    hexId: string;
    worldType: string;

    position: {
        x: number;
        y: number;
        hexRadius: number;
    };

    marker: {
        system: ThroneworldSystemDetails;
        revealed: boolean;
        hideUnits: boolean;
        ownerColor?: string;
        scannerColors: string[];
    };

    hover: {
        allowed: boolean;
        system: ThroneworldSystemDetails;
        revealed: boolean;
    };
}

interface BuildBoardViewParams {
    game: ThroneworldGameState;
    boardGeometry: ThroneworldBoardGeometry;
    playerColors: Record<string, string>;
}

export function buildThroneworldBoardView(
    params: BuildBoardViewParams
): ThroneworldBoardView {
    const { game, boardGeometry, playerColors } = params;

    // DEBUG: Log the entire playerView structure
    console.log("🔍 Building board view - playerView:", game.playerView);

    const systems: RenderableSystem[] = [];

    for (const [hexId, publicSystem] of Object.entries(game.state.systems)) {
        const hex = boardGeometry.hexes[hexId];
        if (!hex) continue;

        systems.push(
            buildRenderableSystem({
                hexId,
                worldType: hex.worldType,
                position: {
                    x: hex.x,
                    y: hex.y,
                    hexRadius: boardGeometry.hexRadius,
                },
                publicSystem,
                playerView: game.playerView?.systems[hexId],
                playerColors,
            })
        );
    }

    return { systems };
}

interface BuildRenderableSystemParams {
    hexId: string;
    worldType: string;
    position: {
        x: number;
        y: number;
        hexRadius: number;
    };

    publicSystem: {
        revealed: boolean;
        details?: ThroneworldSystemDetails;
        scannedBy?: string[];
    };

    playerView?: ThroneworldSystemDetails;
    playerColors: Record<string, string>;
}

function buildRenderableSystem(
    params: BuildRenderableSystemParams
): RenderableSystem {
    const {
        hexId,
        worldType,
        position,
        publicSystem,
        playerView,
        playerColors,
    } = params;

    // DEBUG: Log each system's view data
    // console.log(`🔍 System ${hexId}:`, {
    //     revealed: publicSystem.revealed,
    //     hasPlayerView: Boolean(playerView),
    //     playerView,
    //     scannedBy: publicSystem.scannedBy,
    // });

    const isRevealed = publicSystem.revealed || worldType === "homeworld";
    const hasPrivateView = Boolean(playerView);
    const canHoverReveal = isRevealed || hasPrivateView;

    const resolvedDetails: ThroneworldSystemDetails =
        publicSystem.details ??
        playerView ??
        {
            systemId: hexId,
            owner: null,
            dev: 0,
            spaceTech: 0,
            groundTech: 0,
            spaceUnits: {},
            groundUnits: {},
        };

    const owner =
        resolvedDetails.owner && resolvedDetails.owner !== "neutral"
            ? resolvedDetails.owner
            : null;

    const ownerColor = owner ? playerColors[owner] : undefined;

    const scannerColors =
        !isRevealed && publicSystem.scannedBy
            ? publicSystem.scannedBy
                .map(p => playerColors[p])
                .filter(Boolean)
            : [];

    const hideUnits = Boolean(owner);

    // console.log(`🔍 System ${hexId} hover config:`, {
    //     allowed: canHoverReveal,
    //     revealed: isRevealed || hasPrivateView,
    //     resolvedDev: resolvedDetails.dev,
    // });

    return {
        hexId,
        worldType,
        position,

        marker: {
            system: resolvedDetails,
            revealed: isRevealed,
            hideUnits,
            ownerColor,
            scannerColors,
        },

        hover: {
            allowed: canHoverReveal,
            system: resolvedDetails,
            revealed: isRevealed || hasPrivateView,
        },
    };
}