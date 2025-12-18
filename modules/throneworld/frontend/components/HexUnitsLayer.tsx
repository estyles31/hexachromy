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
  isCommandBunker: boolean;
}

interface Props {
  hexId: string;
  system: RenderableSystem;
  hexCenter: { x: number; y: number };
  hexRadius: number;
  playerColors: Record<string, string>;
  debugSlots?: boolean;
  onFleetClick: (fleetId: string, hexId: string) => void;
  onUnitClick: (unitId: string, hexId: string) => void;
  selectableGamePieces: Set<string>;
  selectedFleetId: string | null;
  selectedUnitId: string | null;
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

  return Array.from(groups.values()).map((groupUnits) => {
    const unitDef = UNITS[groupUnits[0].unitTypeId];
    return {
      unitTypeId: groupUnits[0].unitTypeId,
      hasMoved: groupUnits[0].hasMoved,
      units: groupUnits,
      count: groupUnits.length,
      playerColor,
      isCommandBunker: unitDef?.Command === true,
    };
  });
}

function getFleetSlots(hexRadius: number, counterSize: number) {
  const upperRightX = hexRadius / 2;
  const topY = -hexRadius * 0.86;

  return {
    enemySlots: [
      { x: upperRightX - 1.5 * counterSize - 3, y: topY },
      { x: upperRightX - 2.5 * counterSize - 6, y: topY },
    ],
    friendlySlots: [
      { x: upperRightX - counterSize - 3, y: topY + counterSize + 2 },
      { x: upperRightX - 2 * counterSize - 6, y: topY + counterSize + 2 },
      { x: upperRightX, y: topY + counterSize + 2 },
      { x: upperRightX - 0.5 * counterSize, y: topY },
    ],
  };
}

function getGroundSlots(hexRadius: number, counterSize: number) {
  const rightX = hexRadius;
  const lowerRightX = hexRadius / 2;
  const bottomY = hexRadius * 0.86 - counterSize - 2;

  return {
    friendlySlots: [
      { x: lowerRightX - 1.5 * counterSize - 3, y: bottomY },
      { x: lowerRightX - 0.5 * counterSize, y: bottomY },
      { x: rightX - 2 * counterSize - 3, y: bottomY - counterSize - 1 },
      { x: rightX - counterSize, y: bottomY - counterSize - 1 },
    ],
    enemySlots: [
      { x: rightX - 3 * counterSize - 6, y: bottomY - counterSize - 1 },
    ],
  };
}

function fleetStackOffset(stackIndex: number) {
  return { x: stackIndex * 3, y: stackIndex * 3 };
}

function groundStackOffset(stackIndex: number) {
  return { x: stackIndex * 3, y: -stackIndex * 3 };
}

export default function HexUnitsLayer({
  hexId,
  system,
  hexCenter,
  hexRadius,
  playerColors,
  debugSlots = false,
  onFleetClick,
  onUnitClick,
  selectableGamePieces,
  selectedFleetId,
  selectedUnitId,
}: Props) {
  const counterSize = 32;
  const ownerId = system.owner ?? null;

  // Group ground units
  const friendlyGroundGroups: UnitGroup[] = [];
  const enemyGroundGroups: UnitGroup[] = [];
  const unitsByPlayer = system.groundUnits ?? {};

  for (const [playerId, units] of Object.entries(unitsByPlayer)) {
    if (!units || units.length === 0) continue;
    const groups = groupUnitsForDisplay(units, playerColors[playerId] ?? "#666");
    if (playerId === ownerId) {
      friendlyGroundGroups.push(...groups);
    } else {
      enemyGroundGroups.push(...groups);
    }
  }

  // Group fleets
  const friendlyFleets: RenderFleet[] = [];
  const enemyFleets: RenderFleet[] = [];
  const fleetsByPlayer = system.fleets ?? {};

  for (const [playerId, fleets] of Object.entries(fleetsByPlayer)) {
    if (!fleets || fleets.length === 0) continue;
    for (const fleet of fleets) {
      const renderFleet = { ...fleet, playerColor: playerColors[fleet.owner ?? "neutral"] };
      if (playerId === ownerId) {
        friendlyFleets.push(renderFleet);
      } else {
        enemyFleets.push(renderFleet);
      }
    }
  }

  const { enemySlots: enemyFleetSlots, friendlySlots: friendlyFleetSlots } =
    getFleetSlots(hexRadius, counterSize);
  const { enemySlots: enemyGroundSlots, friendlySlots: friendlyGroundSlots } =
    getGroundSlots(hexRadius, counterSize);

  function renderGroundGroups(groups: UnitGroup[], slots: Slot[]) {
    const elements: JSX.Element[] = [];

    groups.forEach((group, index) => {
      const slot = slots[index % slots.length];
      const stackIndex = Math.floor(index / slots.length);
      const { x: dx, y: dy } = groundStackOffset(stackIndex);

      const unitDef = UNITS[group.unitTypeId];
      if (!unitDef) return;

      // Pick any unit from this group (they're fungible within the group)
      const representativeUnit = group.units[0];
      const unitId = representativeUnit.unitId;

      // Check if any unit in this group is selectable
      const isSelectable = selectableGamePieces.has(unitId);
      const isSelected = selectedUnitId === unitId;

      elements.push(
        <g
          key={`ground-${group.unitTypeId}-${group.hasMoved}-${index}`}
          transform={`translate(${slot.x + dx}, ${slot.y + dy})`}
          onClick={isSelectable ? (e) => {
            e.stopPropagation();
            onUnitClick(unitId);
          } : undefined}
          style={{ cursor: isSelectable ? "pointer" : undefined }}
        >
          <UnitCounter
            unit={unitDef}
            quantity={group.count}
            size={counterSize}
            hasMoved={group.hasMoved}
            playerColor={group.playerColor}
            highlighted={isSelectable}
            selected={isSelected}
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

      const isSelectable = selectableGamePieces.has(fleet.fleetId);
      const isSelected = selectedFleetId === fleet.fleetId;

      elements.push(
        <g
          key={`fleet-${fleet.fleetId}`}
          transform={`translate(${slot.x + dx}, ${slot.y + dy})`}
          onClick={isSelectable ? (e) => {
            e.stopPropagation();
            onFleetClick(fleet.fleetId, hexId);
          } : undefined}
          style={{ cursor: isSelectable ? "pointer" : undefined }}
        >
          <UnitCounter
            unit={unitDef}
            quantity={fleet.spaceUnits.length}
            size={counterSize}
            hasMoved={false}
            playerColor={fleet.playerColor}
            highlighted={isSelectable}
            selected={isSelected}
          />
        </g>
      );
    });

    return elements;
  }

  function renderDebugSlots(slots: Slot[], color: string, labelPrefix: string) {
    return slots.map((slot, i) => (
      <g key={`debug-${labelPrefix}-${i}`}>
        <circle cx={slot.x} cy={slot.y} r={8} fill={color} opacity={0.35} stroke="black" strokeWidth={1} />
        <text x={slot.x} y={slot.y} fontSize={12} textAnchor="middle" alignmentBaseline="middle" fill="black">
          {labelPrefix}{i}
        </text>
      </g>
    ));
  }

  return (
    <g transform={`translate(${hexCenter.x}, ${hexCenter.y})`}>
      {debugSlots && (
        <>
          {renderDebugSlots(enemyFleetSlots, "red", "EF")}
          {renderDebugSlots(friendlyFleetSlots, "blue", "FF")}
          {renderDebugSlots(enemyGroundSlots, "orange", "EG")}
          {renderDebugSlots(friendlyGroundSlots, "green", "FG")}
        </>
      )}

      {renderFleets(enemyFleets, enemyFleetSlots)}
      {renderFleets(friendlyFleets, friendlyFleetSlots)}
      {renderGroundGroups(enemyGroundGroups, enemyGroundSlots)}
      {renderGroundGroups(friendlyGroundGroups, friendlyGroundSlots)}
    </g>
  );
}