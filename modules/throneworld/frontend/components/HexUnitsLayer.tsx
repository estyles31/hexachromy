// /modules/throneworld/frontend/components/HexUnitsLayer.tsx
import type { JSX } from "react/jsx-runtime";
import type { ThroneworldUnit } from "../../shared/models/Unit.Throneworld";
import { UNITS, type UnitId } from "../../shared/models/UnitTypes.ThroneWorld";
import type { RenderableSystem } from "../models/ThroneworldBoardView";
import UnitCounter from "./ThroneworldUnitCounter";
import type { Fleet } from "../../shared/models/Fleets.Throneworld";

interface UnitGroup {
    unitTypeId: UnitId;
    hasMoved: boolean;
    units: ThroneworldUnit[];
    count: number;
    playerColor: string;
}

interface Props {
    system: RenderableSystem;
    hexCenter: { x: number; y: number };
    hexRadius: number;
    playerColors: Record<string, string>;
    debugSlots?: boolean;
}

interface Slot {
    x: number;
    y: number;
}

interface RenderFleet extends Fleet {
    playerColor: string;
}


function groupUnitsForDisplay(units: ThroneworldUnit[], playerColor: string): UnitGroup[] {
    const groups = new Map<string, ThroneworldUnit[]>();

    for (const unit of units) {
        const key = `${unit.unitTypeId}-${unit.hasMoved}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(unit);
    }

    return Array.from(groups.values()).map((groupUnits) => ({
        unitTypeId: groupUnits[0].unitTypeId,
        hasMoved: groupUnits[0].hasMoved,
        units: groupUnits,
        count: groupUnits.length,
        playerColor: playerColor,
    }));
}

// Define fleet slots (top-right corner area)
function getFleetSlots(hexRadius: number, counterSize: number) {
    // const rightX = hexRadius;
    const upperRightX = hexRadius / 2;
    const topY = -hexRadius * 0.86;

    return {
        // Enemy fleets
        enemySlots: [
            { x: upperRightX - 1.5 * counterSize - 3, 
              y: topY },
            { x: upperRightX - 2.5 * counterSize - 6, 
              y: topY  },
        ],

        // Friendly fleets
        friendlySlots: [
            { x: upperRightX - counterSize - 3, 
              y: topY + counterSize + 2 },
            { x: upperRightX - 2 * counterSize - 6, 
              y: topY + counterSize + 2  },
            { x: upperRightX, 
              y: topY + counterSize + 2 },
            { x: upperRightX - 0.5 * counterSize, 
              y: topY  },
        ],
    };
}

// Define ground slots (bottom-right area)
function getGroundSlots(hexRadius: number, counterSize: number) {
    const rightX = hexRadius;
    const lowerRightX = hexRadius / 2;
    const bottomY = hexRadius * 0.86 - counterSize - 2;

    return {
        // Friendly ground
        friendlySlots: [
            { x: lowerRightX - 1.5 * counterSize - 3,
              y: bottomY },
            { x: lowerRightX - 0.5 * counterSize,
              y: bottomY },
            { x: rightX - 2 * counterSize - 3,
              y: bottomY - counterSize - 1 },
            { x: rightX - counterSize,
              y: bottomY - counterSize - 1 },
        ],

        // Enemy ground
        enemySlots: [
            { x: rightX - 3 * counterSize - 6,
              y: bottomY - counterSize - 1 },
        ],
    };
}


// Overflow stack offsets
function fleetStackOffset(stackIndex: number) {
    // fleets stack down + right
    return {
        x: stackIndex * 3,
        y: stackIndex * 3,
    };
}

function groundStackOffset(stackIndex: number) {
    // ground units stack up + right
    return {
        x: stackIndex * 3,
        y: -stackIndex * 3,
    };
}

export default function HexUnitsLayer({
    system,
    hexCenter,
    hexRadius,
    playerColors,
    debugSlots = false
}: Props) {
    const counterSize = 32;
    const ownerId = system.owner ?? null; // adjust if your prop is ownerId instead

    if(system.fleets && ownerId && (system.fleets[ownerId].length > 0)) {
        console.log("Fleets - " + JSON.stringify(system.fleets) );
    }

    // ----- GROUND UNITS: Split into friendly/enemy based on owner -----
    const friendlyGroundGroups: UnitGroup[] = [];
    const enemyGroundGroups: UnitGroup[] = [];

    const unitsByPlayer = system.groundUnits ?? {}; // Record<string, ThroneworldUnit[]>

    for (const [playerId, units] of Object.entries(unitsByPlayer)) {
        if (!units || units.length === 0) continue;
        const groups = groupUnitsForDisplay(units, playerColors[playerId] ?? "#666");
        if (playerId === ownerId) {
            friendlyGroundGroups.push(...groups);
        } else {
            enemyGroundGroups.push(...groups);
        }
    }

    // ----- FLEETS: Split into friendly/enemy based on owner -----
    const friendlyFleets: RenderFleet[] = [];
    const enemyFleets: RenderFleet[] = [];

    const fleetsByPlayer = system.fleets ?? {}; // Record<string, Fleet[]>

    for (const [playerId, fleets] of Object.entries(fleetsByPlayer)) {
        if (!fleets || fleets.length === 0) continue;
        for (const fleet of fleets) {
            if (playerId === ownerId) {
                friendlyFleets.push({ ...fleet, playerColor: playerColors[fleet.owner ?? 'neutral']});
            } else {
                enemyFleets.push({ ...fleet, playerColor: playerColors[fleet.owner ?? 'neutral']});
            }
        }
    }

    // ----- Get slots -----
    const { enemySlots: enemyFleetSlots, friendlySlots: friendlyFleetSlots } =
        getFleetSlots(hexRadius, counterSize);
    const { enemySlots: enemyGroundSlots, friendlySlots: friendlyGroundSlots } =
        getGroundSlots(hexRadius, counterSize);

    // ----- Render helpers -----

    function renderGroundGroups(groups: UnitGroup[], slots: Slot[]) {
        const elements: JSX.Element[] = [];

        groups.forEach((group, index) => {
            const slot = slots[index % slots.length];
            const stackIndex = Math.floor(index / slots.length);
            const { x: dx, y: dy } = groundStackOffset(stackIndex);

            const unitDef = UNITS[group.unitTypeId];
            if (!unitDef) return;

            elements.push(
                <g
                    key={`ground-${group.unitTypeId}-${group.hasMoved}-${index}`}
                    transform={`translate(${slot.x + dx}, ${slot.y + dy})`}
                >
                    <UnitCounter
                        unit={unitDef}
                        quantity={group.count}
                        size={counterSize}
                        hasMoved={group.hasMoved}
                        playerColor={group.playerColor}
                    />
                </g>
            );
        });

        return elements;
    }

    function renderFleets(fleets: RenderFleet[], slots: Slot[]) {
        const elements: JSX.Element[] = [];

        fleets.forEach((fleet, index) => {
            const slot = slots[index % slots.length];
            const stackIndex = Math.floor(index / slots.length);
            const { x: dx, y: dy } = fleetStackOffset(stackIndex);

            const firstSpaceUnit = fleet.spaceUnits?.[0];
            if (!firstSpaceUnit) return;
            const unitDef = UNITS[firstSpaceUnit.unitTypeId as UnitId];
            if (!unitDef) return;

            elements.push(
                <g
                    key={`fleet-${index}`}
                    transform={`translate(${slot.x + dx}, ${slot.y + dy})`}
                >
                    <UnitCounter
                        unit={unitDef}
                        quantity={fleet.spaceUnits.length}
                        size={counterSize}
                        hasMoved={false} // TODO: support fleet movement state
                        playerColor={fleet.playerColor}
                    />
                </g>
            );
        });

        return elements;
    }

    function renderDebugSlots(
        slots: Slot[],
        color: string,
        labelPrefix: string
    ) {
        return slots.map((slot, i) => (
            <g key={`debug-${labelPrefix}-${i}`}>
                <circle
                    cx={slot.x}
                    cy={slot.y}
                    r={8}
                    fill={color}
                    opacity={0.35}
                    stroke="black"
                    strokeWidth={1}
                />
                <text
                    x={slot.x}
                    y={slot.y}
                    fontSize={12}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fill="black"
                >
                    {labelPrefix}{i}
                </text>
            </g>
        ));
    }

    // ----- Render into hex -----
    return (
        <g transform={`translate(${hexCenter.x}, ${hexCenter.y})`}>
            {debugSlots && (
                <>
                    {/* Fleet debug markers */}
                    {renderDebugSlots(enemyFleetSlots, "red", "EF")}
                    {renderDebugSlots(friendlyFleetSlots, "blue", "FF")}

                    {/* Ground debug markers */}
                    {renderDebugSlots(enemyGroundSlots, "orange", "EG")}
                    {renderDebugSlots(friendlyGroundSlots, "green", "FG")}
                </>
            )}

            {/* Fleets: enemy (top row), friendly (row below) */}
            {renderFleets(enemyFleets, enemyFleetSlots)}
            {renderFleets(friendlyFleets, friendlyFleetSlots)}

            {/* Ground units: enemy (bottom row), friendly (two rows above) */}
            {renderGroundGroups(enemyGroundGroups, enemyGroundSlots)}
            {renderGroundGroups(friendlyGroundGroups, friendlyGroundSlots)}
        </g>
    );
}
