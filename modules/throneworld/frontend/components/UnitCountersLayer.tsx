import { useCallback } from "react";
import { motion, type Easing } from "framer-motion";

import type { ThroneworldBoardView, RenderableSystem } from "../models/ThroneworldBoardView";
import type { ThroneworldUnit } from "../../shared/models/Unit.Throneworld";
import { UNITS, type UnitTypeId } from "../../shared/models/UnitTypes.ThroneWorld";
import UnitCounter from "./ThroneworldUnitCounter";
import { useSelection } from "../../../../shared-frontend/contexts/SelectionContext";
import { fleetHasMoved, type Fleet } from "../../shared/models/Fleets.Throneworld";

/* ---------- types ---------- */

interface UnitGroup {
  unitTypeId: UnitTypeId;
  hasMoved: boolean;
  units: ThroneworldUnit[];
  count: number;
  playerId: string;
  playerColor: string;
}

type CounterSpec = {
  id: string;
  worldX: number;
  worldY: number;
  unitDef: (typeof UNITS)[UnitTypeId];
  quantity: number;
  hasMoved: boolean;
  playerColor: string;
  selectedScale: number;
  fleet?: Fleet; // For fleet hover data
  unit?: ThroneworldUnit; // For unit hover data
  hexId: string;
};

/* ---------- grouping ---------- */

function groupUnits(
  units: ThroneworldUnit[],
  playerId: string,
  playerColor: string
): UnitGroup[] {
  const map = new Map<string, ThroneworldUnit[]>();

  for (const u of units) {
    const key = `${u.unitTypeId}-${u.hasMoved}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(u);
  }

  return Array.from(map.values()).map((group) => ({
    unitTypeId: group[0].unitTypeId,
    hasMoved: group[0].hasMoved,
    units: group,
    count: group.length,
    playerId,
    playerColor,
  }));
}

/* ---------- slots ---------- */

function getFleetSlots(hexRadius: number, size: number) {
  const upperRightX = hexRadius / 2;
  const topY = -hexRadius * 0.86;

  return {
    enemy: [
      { x: upperRightX - 1.5 * size - 3, y: topY },
      { x: upperRightX - 2.5 * size - 6, y: topY },
    ],
    friendly: [
      { x: upperRightX - size - 3, y: topY + size + 2 },
      { x: upperRightX - 2 * size - 6, y: topY + size + 2 },
      { x: upperRightX, y: topY + size + 2 },
      { x: upperRightX - 0.5 * size, y: topY },
    ],
  };
}

function getGroundSlots(hexRadius: number, size: number) {
  const rightX = hexRadius;
  const lowerRightX = hexRadius / 2;
  const bottomY = hexRadius * 0.86 - size - 2;

  return {
    friendly: [
      { x: lowerRightX - 1.5 * size - 3, y: bottomY },
      { x: lowerRightX - 0.5 * size, y: bottomY },
      { x: rightX - 2 * size - 3, y: bottomY - size - 1 },
      { x: rightX - size, y: bottomY - size - 1 },
    ],
    enemy: [{ x: rightX - 3 * size - 6, y: bottomY - size - 1 }],
  };
}

function fleetStackOffset(i: number) {
  return { x: i * 3, y: i * 6 };
}

function groundStackOffset(i: number) {
  return { x: i * 3, y: -i * 6 };
}

/* ---------- animation ---------- */

const MOVE_TRANSITION = {
  x: { duration: 0.35, ease: "easeInOut" as Easing },
  y: { duration: 0.35, ease: "easeInOut" as Easing },
};

const PULSE_TRANSITION = {
  duration: 1.4,
  repeat: Infinity,
  ease: "easeInOut" as Easing,
};

/* ---------- component ---------- */

interface Props {
  boardView: ThroneworldBoardView;
  onInspect?: (context: any) => void;
}

export default function UnitCountersLayer({ boardView, onInspect }: Props) {
  const { select, selectableGamePieces, filledParams } = useSelection();
  const counterSize = 32;

  const handleClick = useCallback(
    (id: string) => {
      if (selectableGamePieces.has(id)) select(id);
    },
    [selectableGamePieces, select]
  );

  const handleHover = useCallback(
    (spec: CounterSpec | null) => {
      if (!onInspect) return;
      
      if (!spec) {
        onInspect(null);
        return;
      }

      if (spec.fleet) {
        // Fleet hover
        onInspect({
          id: spec.fleet.id,
          kind: "fleet",
          title: `Fleet ${spec.fleet.id.slice(-8)}`,
          data: {
            kind: "fleet",
            fleetId: spec.fleet.id,
            hexId: spec.hexId,
            owner: spec.fleet.owner,
            spaceUnits: spec.fleet.spaceUnits,
            groundUnits: spec.fleet.groundUnits,
          }
        });
      } else if (spec.unit) {
        // Unit hover
        onInspect({
          id: spec.unit.id,
          kind: "unit",
          title: spec.unitDef.Name,
          data: {
            kind: "unit",
            unitId: spec.unit.id,
            hexId: spec.hexId,
            unit: spec.unit,
            quantity: spec.quantity,
            unitDef: spec.unitDef,
          }
        });
      }
    },
    [onInspect]
  );

  /* ---------- build specs ---------- */

  function buildSpecs(sys: RenderableSystem): CounterSpec[] {
    const specs: CounterSpec[] = [];
    const { x: hx, y: hy, hexRadius } = sys.position;
    const ownerId = sys.owner ?? null;

    /* fleets */

    const fleetSlots = getFleetSlots(hexRadius, counterSize);

    for (const [playerId, fleets] of Object.entries(sys.fleets ?? {})) {
      const side = playerId === ownerId ? "friendly" : "enemy";

      fleets.forEach((fleet, i) => {
        const totalUnits = (fleet.spaceUnits?.length || 0) + (fleet.groundUnits?.length || 0);
        
        // Use ✨ for multi-unit fleets, actual unit symbol for single-unit
        let unitDef;
        if (totalUnits > 1) {
          // Multi-unit fleet - use sparkles
          unitDef = UNITS["fleet"];
        } else {
          // Single unit - show actual unit
          const first = fleet.spaceUnits?.[0] || fleet.groundUnits?.[0];
          if (!first) return;
          unitDef = UNITS[first.unitTypeId as UnitTypeId];
          if (!unitDef) return;
        }

        const slot = fleetSlots[side][i % fleetSlots[side].length];
        const stack = Math.floor(i / fleetSlots[side].length);
        const { x: dx, y: dy } = fleetStackOffset(stack);

        specs.push({
          id: fleet.id,
          worldX: hx + slot.x + dx,
          worldY: hy + slot.y + dy,
          unitDef,
          quantity: totalUnits,
          hasMoved: fleetHasMoved(fleet),
          playerColor: sys.playerColors[fleet.owner ?? "neutral"],
          selectedScale: 1.1,
          fleet,
          hexId: sys.hexId,
        });
      });
    }

    /* ground units */

    const groundSlots = getGroundSlots(hexRadius, counterSize);

    for (const [playerId, units] of Object.entries(sys.groundUnits ?? {})) {
      const side = playerId === ownerId ? "friendly" : "enemy";
      const groups = groupUnits(units, playerId, sys.playerColors[playerId] ?? "#666");

      groups.forEach((group, i) => {
        const unitDef = UNITS[group.unitTypeId];
        if (!unitDef) return;

        const slot = groundSlots[side][i % groundSlots[side].length];
        const stack = Math.floor(i / groundSlots[side].length);
        const { x: dx, y: dy } = groundStackOffset(stack);

        specs.push({
          id: group.units[0].id,
          worldX: hx + slot.x + dx,
          worldY: hy + slot.y + dy,
          unitDef,
          quantity: group.count,
          hasMoved: group.hasMoved,
          playerColor: group.playerColor,
          selectedScale: 1.06,
          unit: group.units[0],
          hexId: sys.hexId,
        });
      });
    }

    return specs;
  }

  /* ---------- render ---------- */

  return (
    <g className="unit-counters-layer">
      {boardView.systems.flatMap((sys) =>
        buildSpecs(sys).map((spec) => {
          const isSelectable = selectableGamePieces.has(spec.id);
          const isSelected = Object.values(filledParams).includes(spec.id);

          return (
            <motion.g
              key={spec.id}
              initial={false}
              animate={{
                x: spec.worldX,
                y: spec.worldY,
                scale: isSelected ? spec.selectedScale : 1,
                opacity: isSelectable && !isSelected ? [1, 0.75, 1] : 1,
              }}
              transition={{
                ...MOVE_TRANSITION,
                opacity: isSelectable && !isSelected ? PULSE_TRANSITION : { duration: 0.15 },
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleClick(spec.id);
              }}
              onMouseEnter={() => handleHover(spec)}
              onMouseLeave={() => handleHover(null)}
              style={{ cursor: isSelectable ? "pointer" : undefined }}
            >
              <UnitCounter
                unit={spec.unitDef}
                quantity={spec.quantity}
                size={counterSize}
                hasMoved={spec.hasMoved}
                playerColor={spec.playerColor}
                highlighted={isSelectable}
                selected={isSelected}
              />
            </motion.g>
          );
        })
      )}
    </g>
  );
}