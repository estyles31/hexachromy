import type { ThroneworldGameState } from "../../shared/models/GameState.Throneworld";
import type { HoveredInfo } from "../models/HoveredInfo";
import type InspectContext from "../../../../shared/models/InspectContext";
import "./ThroneworldInfoPanel.css";
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";
import { UNITS } from "../../shared/models/UnitTypes.ThroneWorld";
import ThroneworldUnitCounter from "./ThroneworldUnitCounter";
import type { ThroneworldUnit } from "../../shared/models/Unit.Throneworld";
import type { ThroneworldUnitType } from "../../shared/models/UnitTypes.ThroneWorld";
import { SystemMarker } from "./SystemMarker";
import { neutralColor } from "./ThroneworldBoard";

export default function ThroneworldInfoPanel({
  inspected,
}: {
  inspected: InspectContext<HoveredInfo> | null;
}) {
  if (!inspected?.data) return null;

  const gameState = useGameStateContext() as ThroneworldGameState;
  const data = inspected.data;

  if (data.kind === "unit") return <UnitInfo data={data} gameState={gameState} />;
  if (data.kind === "system") return <SystemInfo data={data} gameState={gameState} />;

  if (data.kind === "fleet") {
    const units = [...data.groundUnits, ...data.spaceUnits];
    if (units.length == 1) {
      const unit = units[0];
      return <UnitInfo gameState={gameState}
        data={{ kind: "unit", unitId: unit.id, unitDef: UNITS[unit.unitTypeId], hexId: data.hexId, unit, quantity: 1 }} />
    }

    return <FleetInfo data={data} gameState={gameState} />;
  }

  return null;
}

// ========== HELPERS ==========

function groupUnits(units: ThroneworldUnit[]) {
  const groups = new Map<string, { unitDef: ThroneworldUnitType, units: ThroneworldUnit[], hasMoved: boolean }>();
  for (const unit of units) {
    const key = `${unit.unitTypeId}-${unit.hasMoved}`;
    if (!groups.has(key)) {
      groups.set(key, { unitDef: UNITS[unit.unitTypeId], units: [], hasMoved: unit.hasMoved });
    }
    groups.get(key)!.units.push(unit);
  }
  return Array.from(groups.values());
}

function getSpecialAbilities(unitDef: ThroneworldUnitType): string[] {
  const abilities: string[] = [];
  if (unitDef.Explore) abilities.push("Explore");
  if (unitDef.Static) abilities.push("Static");
  if (unitDef.Command) abilities.push("Command");
  if (unitDef.FirstFire) abilities.push("First Fire");
  if (unitDef.FirstDefend) abilities.push("First Defend");
  if (unitDef.DropAttack) abilities.push("Drop Attack");
  if (unitDef.NonCombat) abilities.push("Non-Combat");
  if (unitDef.Absorb && unitDef.Absorb > 0) abilities.push(`Absorb ${unitDef.Absorb}`);
  if (unitDef.DefenseBonus) {
    for (const [, unitBonuses] of Object.entries(unitDef.DefenseBonus)) {
      for (const [unitId, bonus] of Object.entries(unitBonuses)) {
        const bonusUnit = UNITS[unitId];
        if (bonusUnit) abilities.push(`+${bonus} Def with ${bonusUnit.Symbol}`);
      }
    }
  }
  return abilities;
}

// ========== REUSABLE COMPONENTS ==========

type UnitCounterProps = {
  unitDef: ThroneworldUnitType;
  quantity: number;
  hasMoved: boolean;
  playerColor: string;
  size?: number;
  compact?: boolean;
}

function UnitCounter({ unitDef, quantity, hasMoved, playerColor, size = 32, compact = true }: UnitCounterProps) {
  const abilities = getSpecialAbilities(unitDef);
  const labels = compact
    ? { attack: "A", defense: "D", hp: "hp", cargo: "C" }
    : { attack: "Attack: ", defense: "Defense: ", hp: " HP", cargo: "Cargo: " };

  return (
    <>
      <div className={compact ? "unit-item" : "info-section"}>
        <div className={compact ? "" : "centered"}>
          <ThroneworldUnitCounter unit={unitDef} quantity={quantity} size={size} hasMoved={hasMoved} playerColor={playerColor} />
        </div>

        {compact && <div className="unit-name compact">{quantity}× {unitDef.Name}</div>}
        {!compact && <div className="info-subtitle">Stats</div>}
          <div className={compact ? "stats-grid compact" : "stats-grid"}>
          {!unitDef.NonCombat && <div>{labels.attack}{unitDef.Attack}</div>}
          {!unitDef.NonCombat && <div>{labels.defense}{unitDef.Defense}</div>}
          <div>{unitDef.HP}{labels.hp}</div>
          <div>{(unitDef.Cargo ?? 0) !== 0 && <>{labels.cargo}{unitDef.Cargo! > 0 ? "+" : ""}{unitDef.Cargo}</>}</div>
        </div>

        {abilities.length > 0 && (
          <div className={compact ? "abilities" : "abilities-list"}>
            {compact
              ? abilities.join(", ")
              : abilities.map((ability, idx) => <div key={idx} className="ability-tag">{ability}</div>)
            }
          </div>
        )}
      </div>
    </>
  );
}

function UnitsGrid({
  units,
  playerColor,
  size = 32,
}: {
  units: ThroneworldUnit[],
  playerColor: string,
  size?: number
}) {
  const groups = groupUnits(units);
  return (
    <div className="unit-grid">
      {groups.map((group, idx) => (
        <UnitCounter
          key={idx}
          unitDef={group.unitDef}
          quantity={group.units.length}
          hasMoved={group.hasMoved}
          playerColor={playerColor}
          size={size}
        />
      ))}
    </div>
  );
}

// ========== TOP-LEVEL PANELS ==========

function UnitInfo({ data, gameState }: { data: Extract<HoveredInfo, { kind: "unit" }>, gameState: ThroneworldGameState }) {
  const owner = data.unit.owner || "neutral";
  const playerColor = gameState.players[owner]?.color || "#666";
  const playerName = gameState.players[owner]?.displayName || owner;

  return (
    <div className="throneworld-info">
      <div className="info-title">{data.unitDef.Name} {data.quantity > 1 && <>(×{data.quantity})</>}</div>
      <div className="info-meta">{playerName} • {data.hexId} • {data.unit.hasMoved ? "Moved" : "Ready"}</div>

      <UnitCounter unitDef={data.unitDef} quantity={data.quantity} hasMoved={data.unit.hasMoved}
        playerColor={playerColor} size={48} compact={false} />
    </div>
  );
}

function FleetContents({ spaceUnits, groundUnits, playerColor, compact = false }:
  { spaceUnits: ThroneworldUnit[], groundUnits: ThroneworldUnit[], playerColor: string, compact?: boolean }) {
  if (compact) {
    // Combine all units into one grid
    const allUnits = [...spaceUnits, ...groundUnits];
    if (allUnits.length === 0) return null;
    return <UnitsGrid units={allUnits} playerColor={playerColor} />;
  }

  // Detailed: separate space and ground
  return (
    <>
      {spaceUnits.length > 0 && (
        <div className="info-section">
          <div className="info-subtitle">Space Units ({spaceUnits.length})</div>
          <UnitsGrid units={spaceUnits} playerColor={playerColor} />
        </div>
      )}
      {groundUnits.length > 0 && (
        <div className="info-section">
          <div className="info-subtitle">Ground Units ({groundUnits.length})</div>
          <UnitsGrid units={groundUnits} playerColor={playerColor} />
        </div>
      )}
    </>
  );
}

function FleetInfo({ data, gameState }: { data: Extract<HoveredInfo, { kind: "fleet" }>, gameState: ThroneworldGameState }) {
  const playerColor = gameState.players[data.owner]?.color || "#666";
  const playerName = gameState.players[data.owner]?.displayName || data.owner;
  const totalUnits = data.spaceUnits.length + data.groundUnits.length;
  const unitDef = totalUnits > 1 ? UNITS["fleet"] : UNITS[data.spaceUnits[0]?.unitTypeId];

  return (
    <div className="throneworld-info">
      <div className="info-title">Fleet {data.fleetId.slice(-8)}</div>
      <div className="info-meta">{playerName} • {data.hexId}</div>
      <ThroneworldUnitCounter unit={unitDef} quantity={totalUnits} size={48} hasMoved={false} playerColor={playerColor} />
      <FleetContents key={data.fleetId} spaceUnits={data.spaceUnits} groundUnits={data.groundUnits} playerColor={playerColor} compact={false} />
    </div>
  );
}

function SystemInfo({ data, gameState }: { data: Extract<HoveredInfo, { kind: "system" }>, gameState: ThroneworldGameState }) {
  const hexId = data.hexId;
  const systemData = gameState.state.systems[hexId];
  const systemDetails = data.details ?? systemData?.details;

  if (!systemData) {
    return (
      <div className="throneworld-info">
        <div className="info-title">System {hexId}</div>
        <div className="info-value">Unknown system</div>
      </div>
    );
  }

  const ownerName = systemDetails?.owner ? (gameState.players[systemDetails.owner]?.displayName || systemDetails.owner) : "Unclaimed";
  const ownerColor = systemDetails?.owner ? gameState.players[systemDetails.owner]?.color : undefined;
  const allFleets = Object.values(systemData.fleetsInSpace || {}).flat();

  return (
    <div className="throneworld-info">
      <div className="info-title">System {hexId}</div>
      <div className="info-meta">{data.revealed ? `${ownerName} • Dev ${systemDetails?.dev || 0}` : "Unrevealed"}</div>

      <div className="info-section">
        <div className="centered">
          <SystemMarker
            system={systemDetails || { dev: 0, spaceTech: 0, groundTech: 0, spaceUnits: {}, groundUnits: {} }}
            worldType={systemData.worldType} revealed={data.canPeek}
            size={64} ownerColor={ownerColor} />
        </div>
      </div>

      {/* Fleets */}
      {allFleets.length > 0 && (
        <div className="info-section">
          <div className="info-subtitle">Fleets ({allFleets.length})</div>
          <div className="unit-grid">
            {allFleets.map(fleet => (
              <FleetContents key={fleet.id} compact={true} spaceUnits={fleet.spaceUnits} groundUnits={fleet.groundUnits} playerColor={gameState.players[fleet.owner]?.color || "#666"} />
            ))}
          </div>
        </div>
      )}

      {/* Unrevealed: show neutral spawn units */}
      {!data.revealed && systemDetails && (
        <div className="info-section">
          <div className="info-subtitle">Neutral Units</div>
          <div className="unit-grid">
            {[...Object.entries(systemDetails.spaceUnits || {}), ...Object.entries(systemDetails.groundUnits || {})].map(([unitTypeId, count]) => (
              <UnitCounter key={unitTypeId} unitDef={UNITS[unitTypeId]} quantity={count ?? 0} hasMoved={false} playerColor={neutralColor} />
            ))}
          </div>
        </div>
      )}

      {/* Revealed: show ground units */}
      {data.revealed && Object.keys(systemData.unitsOnPlanet || {}).length > 0 && (
        <div className="info-section">
          <div className="info-subtitle">Ground Units</div>
          {Object.entries(systemData.unitsOnPlanet || {}).map(([playerId, units]) => (
            <UnitsGrid key={playerId} units={units} playerColor={gameState.players[playerId]?.color || "#666"} size={24} />
          ))}
        </div>
      )}
    </div>
  );
}