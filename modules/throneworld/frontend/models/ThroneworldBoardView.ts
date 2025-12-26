// /modules/throneworld/frontend/models/ThroneworldBoardView.ts
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type { ThroneworldBoardGeometry } from "../../shared/models/BoardGeometry.ThroneWorld";
import type { ThroneworldPublicSystemState, ThroneworldSystemDetails } from "../../shared/models/Systems.ThroneWorld";
import type { WorldType } from "../../shared/models/BoardLayout.ThroneWorld";
import type { Fleet } from "../../shared/models/Fleets.Throneworld";
import type { ThroneworldUnit } from "../../shared/models/Unit.Throneworld";

export interface ThroneworldBoardView {
    systems: RenderableSystem[];
}

export interface RenderableSystem {
    hexId: string;
    worldType: WorldType;
    owner?: string;

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

    groundUnits: Record<string, ThroneworldUnit[]>;
    fleets: Record<string, Fleet[]>;
    playerColors: Record<string, string>;
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
    // console.log("🔍 Building board view - playerViews:", game.playerViews);

    const systems: RenderableSystem[] = [];

    const playerView = game.playerViews ? Object.entries(game.playerViews).find(
                        ([key]) => key !== "neutral")?.[1] : undefined;

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
                playerView: playerView?.systems[hexId],
                playerColors,
            })
        );
    }

    return { systems };
}

interface BuildRenderableSystemParams {
    hexId: string;
    worldType: WorldType;
    position: {
        x: number;
        y: number;
        hexRadius: number;
    };

    publicSystem: ThroneworldPublicSystemState;

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

    const isRevealed = publicSystem.revealed || worldType === "Homeworld";
    const hasPrivateView = Boolean(playerView);
    const canHoverReveal = isRevealed || hasPrivateView;

    const resolvedDetails: ThroneworldSystemDetails =
        publicSystem.details
        ?? playerView 
        ?? {
            systemId: hexId,
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
        owner: publicSystem.details?.owner,

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

        fleets: publicSystem.fleetsInSpace,
        groundUnits: publicSystem.unitsOnPlanet,
        playerColors: playerColors,
    };
}