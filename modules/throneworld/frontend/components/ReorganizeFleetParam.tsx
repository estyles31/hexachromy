// /modules/throneworld/frontend/components/ReorganizeFleetParam.tsx
import { useState, useMemo } from "react";
import type { GameAction } from "../../../../shared/models/GameAction";
import { UNITS, type ThroneworldUnit } from "../../shared/models/Units.Throneworld";
import ThroneworldUnitCounter from "./ThroneworldUnitCounter";
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";
import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import "./ReorganizeFleetParam.css";

interface ReorganizeFleetParamProps {
  action: GameAction;
  value: any;
  onChange: (value: any) => void;
  playerId: string;
}

export function ReorganizeFleetParam({ action, value, onChange, playerId }: ReorganizeFleetParamProps) {
  const gameState = useGameStateContext() as ThroneworldGameState;

  // Get already-filled params from action
  const sourceFleetId = action.params.find((p) => p.name === "sourceFleetId")?.value as string;
  const targetEntityId = action.params.find((p) => p.name === "targetEntity")?.value as string;

  // Find the hex and entities, get all movable units
  const { isTargetPlanet, sourceUnitsMovable, targetUnitsMovable } = useMemo(() => {
    if (!sourceFleetId || !targetEntityId) {
      return { isTargetPlanet: false, sourceUnitsMovable: [], targetUnitsMovable: [] };
    }

    // Find source fleet's hex
    let hexId: string | null = null;
    for (const [hid, sys] of Object.entries(gameState.state.systems)) {
      if (sys.fleetsInSpace[playerId]?.some((f) => f.id === sourceFleetId)) {
        hexId = hid;
        break;
      }
    }

    if (!hexId) {
      return { isTargetPlanet: false, sourceUnitsMovable: [], targetUnitsMovable: [] };
    }

    const sys = gameState.state.systems[hexId];
    const srcFleet = sys.fleetsInSpace[playerId]?.find((f) => f.id === sourceFleetId);
    if (!srcFleet) {
      return { isTargetPlanet: false, sourceUnitsMovable: [], targetUnitsMovable: [] };
    }

    const isPlanet = targetEntityId === hexId;
    const isNew = targetEntityId === "new_fleet";

    // Get source units (from fleet)
    const srcUnits = [...srcFleet.spaceUnits, ...srcFleet.groundUnits];

    // Get target units
    let tgtUnits: ThroneworldUnit[] = [];
    if (isPlanet) {
      tgtUnits = sys.unitsOnPlanet[playerId] || [];
    } else if (!isNew) {
      const tgtFleet = sys.fleetsInSpace[playerId]?.find((f) => f.id === targetEntityId);
      if (tgtFleet) {
        tgtUnits = [...tgtFleet.spaceUnits, ...tgtFleet.groundUnits];
      }
    }

    // Filter both to movable units
    const filterMovable = (units: ThroneworldUnit[]) =>
      units.filter((unit) => {
        const unitDef = UNITS[unit.unitTypeId];
        if (unitDef.Static) return false;
        return true;
      });

    return {
      isTargetPlanet: isPlanet,
      sourceUnitsMovable: filterMovable(srcUnits),
      targetUnitsMovable: filterMovable(tgtUnits),
    };
  }, [gameState, sourceFleetId, targetEntityId, playerId]);

  // Initialize local state with movable units currently in target
  const [localValue, setLocalValue] = useState<string[]>(() => {
    if (value && Array.isArray(value) && value.length > 0) {
      return value;
    }
    return targetUnitsMovable.map((u) => u.id);
  });

  const playerColor = gameState.players[playerId]?.color || "gray";

  // Split all movable units into source and target columns based on localValue
  const allMovableUnits = [...sourceUnitsMovable, ...targetUnitsMovable];
  const selectedIds = new Set(localValue);
  const targetUnits = allMovableUnits.filter((u) => selectedIds.has(u.id));
  const sourceUnits = allMovableUnits.filter((u) => !selectedIds.has(u.id));

  // Calculate cargo
  const calculateCargo = (units: ThroneworldUnit[]): number => {
    const spaceUnits = units.filter((u) => UNITS[u.unitTypeId].Domain !== "Ground");
    let totalCargo = 0;
    for (const unit of spaceUnits) {
      totalCargo += UNITS[unit.unitTypeId]?.Cargo || 0;
    }
    const groundUnits = units.filter((u) => UNITS[u.unitTypeId].Domain === "Ground");
    totalCargo -= groundUnits.length;
    return totalCargo;
  };

  const sourceCargo = calculateCargo(sourceUnits);
  const targetCargo = calculateCargo(targetUnits);
  const sourceCargoValid = sourceUnits.length === 0 || sourceCargo >= 0;
  const targetCargoValid = targetUnits.length === 0 || targetCargo >= 0;

  // Toggle unit between source and target
  const toggleUnit = (unitId: string) => {
    setLocalValue((prev) => {
      const newValue = new Set(prev);
      if (newValue.has(unitId)) {
        newValue.delete(unitId);
      } else {
        newValue.add(unitId);
      }
      return Array.from(newValue);
    });
  };

  const renderUnit = (unit: ThroneworldUnit) => {
    const unitDef = UNITS[unit.unitTypeId];
    if (!unitDef) return null;

    return (
      <div
        key={unit.id}
        className="reorganize-unit"
        onClick={() => toggleUnit(unit.id)}
        title={`${unitDef.Name} - Click to move`}
      >
        <ThroneworldUnitCounter unit={unitDef} quantity={1} hasMoved={false} playerColor={playerColor} size={40} />
      </div>
    );
  };

  return (
    <div className="reorganize-fleet-param">
      <div className="reorganize-fleet-param__columns">
        <div className="reorganize-fleet-param__column">
          <div className="reorganize-fleet-param__header">
            <span>Source </span>
            <span className={`reorganize-fleet-cargo ${!sourceCargoValid ? "invalid" : ""}`}>{sourceCargo}</span>
            📦
          </div>
          <div className="reorganize-fleet-param__units">
            {sourceUnits.length === 0 ? (
              <div className="reorganize-fleet-param__empty">No units</div>
            ) : (
              sourceUnits.map(renderUnit)
            )}
          </div>
        </div>

        <div className="reorganize-fleet-param__arrow">
          <div className="reorganize-fleet-param__arrow-icon">⟷</div>
        </div>

        <div className="reorganize-fleet-param__column">
          <div className="reorganize-fleet-param__header">
            <span>Target </span>
            {!isTargetPlanet && (
              <>
                <span className={`reorganize-fleet-cargo ${!targetCargoValid ? "invalid" : ""}`}>{targetCargo}</span>
                📦
              </>
            )}
          </div>
          <div className="reorganize-fleet-param__units">
            {targetUnits.length === 0 ? (
              <div className="reorganize-fleet-param__empty">No units</div>
            ) : (
              targetUnits.map(renderUnit)
            )}
          </div>
        </div>
      </div>

      {!isTargetPlanet && (!sourceCargoValid || !targetCargoValid) && (
        <div className="reorganize-fleet-param__warning">⚠️ Negative cargo</div>
      )}

      <div className="reorganize-fleet-param__actions">
        <button
          className="reorganize-fleet-param__done"
          onClick={() => onChange(localValue)}
          disabled={!isTargetPlanet && (!sourceCargoValid || !targetCargoValid)}
        >
          Done
        </button>
      </div>
    </div>
  );
}
