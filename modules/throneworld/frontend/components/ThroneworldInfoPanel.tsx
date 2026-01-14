import type { ThroneworldGameState, ThroneworldPlayerState } from "../../shared/models/GameState.Throneworld";
import type { HoveredFleetInfo, HoveredInfo, HoveredSystemInfo, HoveredUnitInfo } from "../models/HoveredInfo";
import type InspectContext from "../../../../shared-frontend/InspectContext";
import "./ThroneworldInfoPanel.css";
import { useGameStateContext } from "../../../../shared-frontend/contexts/GameStateContext";
import {
  STAT_GLYPHS,
  UNITS,
  type ThroneworldUnit,
  type ThroneworldUnitType,
} from "../../shared/models/Units.Throneworld";
import ThroneworldUnitCounter from "./ThroneworldUnitCounter";
import { SystemMarker } from "./SystemMarker";
import { neutralColor } from "./ThroneworldBoard";
import type { ThroneworldPublicSystemState } from "../../shared/models/Systems.Throneworld";
import { Factions } from "../../shared/models/Factions.Throneworld";
import { Glyph } from "../../../../shared-frontend/glyphs/Glyph";

//helper glyph components

function AttIcon() {
  return <Glyph glyph={STAT_GLYPHS.Attack} host="html" mode="font" color="#ff0" />;
}

function DefIcon() {
  return <Glyph glyph={STAT_GLYPHS.Defense} host="html" mode="font" color="#99f" />;
}

function HpIcon() {
  return <Glyph glyph={STAT_GLYPHS.HP} host="html" mode="font" color="#f7a" />;
}

function CgoIcon() {
  return <Glyph glyph={STAT_GLYPHS.Cargo} host="html" mode="font" color="#c85" />;
}

function CostIcon() {
  return <Glyph glyph={STAT_GLYPHS.Cost} host="html" mode="font" color="#fb5" />;
}

/* ============================================================
 * Root dispatcher
 * ============================================================ */

export default function ThroneworldInfoPanel({ inspected }: { inspected: InspectContext<HoveredInfo> | null }) {
  if (!inspected?.data) return null;

  const gameState = useGameStateContext() as ThroneworldGameState;
  const data = inspected.data;

  if (data.kind === "unit") return <UnitInfo data={data} gameState={gameState} />;
  if (data.kind === "system") return <SystemInfo data={data} gameState={gameState} />;

  if (data.kind === "fleet") {
    const units = [...data.spaceUnits, ...data.groundUnits];
    if (units.length === 1) {
      const unit = units[0];
      return (
        <UnitInfo
          gameState={gameState}
          data={{
            kind: "unit",
            unitId: unit.id,
            unitDef: UNITS[unit.unitTypeId],
            hexId: data.hexId,
            unit,
            quantity: 1,
          }}
        />
      );
    }
    return <FleetInfo data={data} gameState={gameState} />;
  }

  return null;
}

/* ============================================================
 * Helpers
 * ============================================================ */

function groupUnits(units: ThroneworldUnit[]) {
  const groups = new Map<string, { unitDef: ThroneworldUnitType; units: ThroneworldUnit[]; hasMoved: boolean }>();

  for (const unit of units) {
    const key = `${unit.unitTypeId}-${unit.hasMoved}`;
    if (!groups.has(key)) {
      groups.set(key, {
        unitDef: UNITS[unit.unitTypeId],
        units: [],
        hasMoved: unit.hasMoved,
      });
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
        if (bonusUnit) abilities.push(`+${bonus} Def with ${bonusUnit.Glyph.unicode}`);
      }
    }
  }

  return abilities;
}

/* ============================================================
 * Combat + cargo math
 * ============================================================ */

type CombatTotals = {
  attack: number;
  defense: number;
  hp: number;
};

function sumCombatStats(units: ThroneworldUnit[]): CombatTotals {
  let attack = 0;
  let defense = 0;
  let hp = 0;

  for (const u of units) {
    const def = UNITS[u.unitTypeId];
    attack += def.Attack ?? 0;
    defense += def.Defense ?? 0;
    hp += def.NonCombat ? 0 : (def.HP ?? 0);
  }

  return { attack, defense, hp };
}

function sumCargo(units: ThroneworldUnit[]): number {
  let cargo = 0;
  for (const u of units) cargo += UNITS[u.unitTypeId].Cargo ?? 0;
  return cargo;
}

/* ============================================================
 * Reusable totals UI (row + section)
 * - Lets us hide Attack for neutral rows
 * - Lets us tweak spacing in one place
 * ============================================================ */

function TotalsRowLine({
  label,
  totals,
  compactLabel = false,
  hideAttack = false,
  className = "",
}: {
  label: string;
  totals: CombatTotals;
  compactLabel?: boolean;
  hideAttack?: boolean;
  className?: string;
}) {
  return (
    <div className={`totals-row ${className}`.trim()}>
      <span className="totals-label">{compactLabel ? label : `${label}:`}</span>
      {!hideAttack && (
        <span>
          <AttIcon />
          {totals.attack}
        </span>
      )}
      <span>
        <DefIcon />
        {totals.defense}
      </span>
      <span>
        <HpIcon />
        {totals.hp}
      </span>
    </div>
  );
}

type TotalsSectionRow = {
  key: string;
  label: string;
  totals: CombatTotals;
  hideAttack?: boolean;
};

function TotalsSection({
  title,
  rows,
  indentRows = false,
  compactLabel = false,
}: {
  title?: string;
  rows: TotalsSectionRow[];
  indentRows?: boolean;
  compactLabel?: boolean;
}) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="totals-section">
      {title && <div className="info-subtitle totals-section-title">{title}</div>}
      <div className={`totals-rows ${indentRows ? "totals-rows--indented" : ""}`.trim()}>
        {rows.map((r) => (
          <TotalsRowLine
            key={r.key}
            label={r.label}
            totals={r.totals}
            compactLabel={compactLabel}
            hideAttack={!!r.hideAttack}
            className={indentRows ? "player" : ""}
          />
        ))}
      </div>
    </div>
  );
}

function ScannedBy({
  data,
  players,
}: {
  data: ThroneworldPublicSystemState;
  players: Record<string, ThroneworldPlayerState>;
}) {
  const scannedBy = data.scannedBy || [];
  if (scannedBy.length === 0) return null;
  return (
    <div className="info-meta">
      Scanned by:{" "}
      {scannedBy.map((pid, i) => (
        <span key={pid}>
          {i > 0 && ", "}
          <span style={{ color: players[pid]?.color || "white" }}>{players[pid]?.displayName || pid}</span>
        </span>
      ))}
    </div>
  );
}

/* ============================================================
 * UnitStatCounter (grid-safe, NO overlap)
 * - No cargo glyph (by design)
 * - Attack/Defense/HP left, icon center
 * ============================================================ */

function UnitStatCounter({
  unitDef,
  quantity,
  hasMoved,
  playerColor,
  size = 32,
}: {
  unitDef: ThroneworldUnitType;
  quantity: number;
  hasMoved: boolean;
  playerColor: string;
  size?: number;
}) {
  return (
    <div className="unit-stat-counter">
      <div className="unit-stat-left">
        {!unitDef.NonCombat && (
          <div>
            {unitDef.Attack! > 0 && (
              <>
                {unitDef.Attack}
                <AttIcon />
              </>
            )}
          </div>
        )}
        {!unitDef.NonCombat && (
          <div>
            {unitDef.Defense}
            <DefIcon />
          </div>
        )}
        {!unitDef.NonCombat && (
          <div>
            {unitDef.HP}
            <HpIcon />
          </div>
        )}
      </div>

      <div className="unit-stat-icon">
        <ThroneworldUnitCounter
          unit={unitDef}
          quantity={quantity}
          size={size}
          hasMoved={hasMoved}
          playerColor={playerColor}
        />
      </div>
    </div>
  );
}

/* ============================================================
 * UnitsGrid (name + abilities under tile)
 * ============================================================ */

function UnitsGrid({
  units,
  playerColor,
  size = 32,
}: {
  units: ThroneworldUnit[];
  playerColor: string;
  size?: number;
}) {
  const groups = groupUnits(units);

  return (
    <div className="unit-grid">
      {groups.map((group, idx) => {
        const abilities = getSpecialAbilities(group.unitDef);
        return (
          <div key={idx} className="unit-tile">
            <UnitStatCounter
              unitDef={group.unitDef}
              quantity={group.units.length}
              hasMoved={group.hasMoved}
              playerColor={playerColor}
              size={size}
            />
            <div className="unit-label">
              {group.units.length}× {group.unitDef.Name}
            </div>
            {abilities.length > 0 && <div className="unit-abilities">{abilities.join(", ")}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
 * FleetContents (composition preview only; used by FleetInfo + SystemInfo)
 * ============================================================ */

function FleetContents({
  spaceUnits,
  groundUnits,
  playerColor,
  compact = false,
}: {
  spaceUnits: ThroneworldUnit[];
  groundUnits: ThroneworldUnit[];
  playerColor: string;
  compact?: boolean;
}) {
  if (compact) {
    const all = [...spaceUnits, ...groundUnits];
    if (all.length === 0) return null;

    return (
      <div className="fleet-preview">
        <UnitsGrid units={all} playerColor={playerColor} size={32} />
      </div>
    );
  }

  return (
    <>
      {spaceUnits.length > 0 && (
        <div className="info-section">
          <div className="info-subtitle">Space Units</div>
          <UnitsGrid units={spaceUnits} playerColor={playerColor} />
        </div>
      )}
      {groundUnits.length > 0 && (
        <div className="info-section">
          <div className="info-subtitle">Ground Units</div>
          <UnitsGrid units={groundUnits} playerColor={playerColor} />
        </div>
      )}
    </>
  );
}

/* ============================================================
 * UnitInfo (restore rich stats + abilities)
 * ============================================================ */

function UnitInfo({ data, gameState }: { data: HoveredUnitInfo; gameState: ThroneworldGameState }) {
  const ownerId = data.unit.owner;
  const player = ownerId ? gameState.players[ownerId] : undefined;
  const playerName = player?.displayName || ownerId || "Neutral";
  const playerColor = player?.color || "transparent";

  const unitDef = data.unitDef;
  const abilities = getSpecialAbilities(unitDef);

  const baseCost = unitDef.Cost ?? 0;
  const faction = player?.race ? Factions[player.race] : undefined;
  const discount = faction?.BuildDiscount?.[unitDef.id] ?? 0;
  const finalCost = Math.max(0, baseCost - discount);

  return (
    <div className="throneworld-info">
      <div className="info-title">
        {unitDef.Name} {data.quantity > 1 && <>(×{data.quantity})</>}
      </div>

      {data?.hexId && (
        <div className="info-meta">
          {playerName} • {data.hexId} • {data.unit.hasMoved ? "Moved" : "Ready"}
        </div>
      )}

      <div className="info-section">
        <div className="unit-info-header">
          <div className="unit-info-icon">
            <ThroneworldUnitCounter
              unit={unitDef}
              quantity={data.quantity}
              size={56}
              hasMoved={data.unit.hasMoved}
              playerColor={playerColor}
            />
          </div>
          <div className="unit-info-cost">
            <CostIcon /> {finalCost}
          </div>
        </div>

        <div className="unit-detail-stats">
          {!unitDef.NonCombat && (
            <div>
              <div>
                <strong>Attack: </strong>
                {unitDef.Attack} <AttIcon />
              </div>
              <div>
                <strong>Defense: </strong>
                {unitDef.Defense} <DefIcon />
              </div>
            </div>
          )}

          <div>
            <div>
              <strong>HP: </strong>
              {unitDef.HP} <HpIcon />
            </div>

            {(unitDef.Cargo ?? 0) !== 0 && (
              <div>
                <strong>Cargo: </strong>
                {unitDef.Cargo! > 0 ? "+" : ""}
                {unitDef.Cargo}
                <CgoIcon />
              </div>
            )}
          </div>
        </div>

        {abilities.length > 0 && (
          <div className="abilities-list">
            {abilities.map((ability, idx) => (
              <div key={idx} className="ability-tag">
                {ability}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * FleetInfo (fleet icon + totals NEXT to it)  [NOW uses TotalsSection]
 * ============================================================ */

function FleetInfo({ data, gameState }: { data: HoveredFleetInfo; gameState: ThroneworldGameState }) {
  const playerColor = gameState.players[data.owner]?.color || "#666";
  const playerName = gameState.players[data.owner]?.displayName || data.owner;

  const totalUnits = data.spaceUnits.length + data.groundUnits.length;
  const fleetIconDef = UNITS["fleet"];
  const spaceTotals = sumCombatStats(data.spaceUnits);
  const groundTotals = sumCombatStats(data.groundUnits);
  const cargo = sumCargo([...data.spaceUnits, ...data.groundUnits]);

  const fleetTotalsRows: TotalsSectionRow[] = [
    { key: "space", label: "Space", totals: spaceTotals, hideAttack: false },
    { key: "ground", label: "Ground", totals: groundTotals, hideAttack: false },
  ];

  return (
    <div className="throneworld-info">
      <div className="info-title">Fleet {data.fleetId.slice(-8)}</div>
      <div className="info-meta">
        {playerName} • {data.hexId}
      </div>

      <div className="fleet-header">
        <ThroneworldUnitCounter
          unit={fleetIconDef}
          quantity={totalUnits}
          size={56}
          hasMoved={false}
          playerColor={playerColor}
        />

        <div className="fleet-header-stats">
          <TotalsSection rows={fleetTotalsRows} compactLabel={false} />
          {cargo !== 0 && (
            <div className="cargo-row">
              <CgoIcon /> {cargo > 0 ? `+${cargo}` : cargo}
            </div>
          )}
        </div>
      </div>

      <FleetContents
        spaceUnits={data.spaceUnits}
        groundUnits={data.groundUnits}
        playerColor={playerColor}
        compact={false}
      />
    </div>
  );
}

/* ============================================================
 * SystemInfo
 * - Marker + Planet + Space-by-player totals in SAME ROW
 * - Neutral totals keep space vs ground separate
 * - Hide Attack for neutral rows
 * ============================================================ */

type SystemInfoProps = {
  data: HoveredSystemInfo;
  gameState: ThroneworldGameState;
};

function SystemInfo({ data, gameState }: SystemInfoProps) {
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

  const ownerName = systemDetails?.owner
    ? gameState.players[systemDetails.owner]?.displayName || systemDetails.owner
    : "Unclaimed";
  const ownerColor = systemDetails?.owner ? gameState.players[systemDetails.owner]?.color : undefined;

  const allFleets = Object.values(systemData.fleetsInSpace || {}).flat();

  // Revealed: real planet units
  const revealedPlanetUnits = Object.values(systemData.unitsOnPlanet || {}).flat();

  // Unrevealed but scanned: neutral spawn units (planet/ground)
  const scannedPlanetUnits: ThroneworldUnit[] =
    !data.revealed && systemDetails
      ? Object.entries(systemDetails.groundUnits || {}).flatMap(([unitTypeId, count]) =>
          Array.from({ length: count ?? 0 }, () => ({ unitTypeId }) as ThroneworldUnit)
        )
      : [];

  const planetUnitsForTotals = data.revealed ? revealedPlanetUnits : scannedPlanetUnits;
  const planetTotals = sumCombatStats(planetUnitsForTotals);

  // Space totals grouped by player (not by fleet)
  const spaceUnitsByPlayer = new Map<string, ThroneworldUnit[]>();
  for (const fleet of allFleets) {
    if (!spaceUnitsByPlayer.has(fleet.owner)) spaceUnitsByPlayer.set(fleet.owner, []);
    spaceUnitsByPlayer.get(fleet.owner)!.push(...fleet.spaceUnits);
  }

  // Unrevealed but scanned: neutral spawn units (space)
  const scannedSpaceUnits: ThroneworldUnit[] =
    !data.revealed && systemDetails
      ? Object.entries(systemDetails.spaceUnits || {}).flatMap(([unitTypeId, count]) =>
          Array.from({ length: count ?? 0 }, () => ({ unitTypeId }) as ThroneworldUnit)
        )
      : [];

  // Only add Neutral if there are any scanned space units
  if (scannedSpaceUnits.length > 0) {
    spaceUnitsByPlayer.set("Neutral", scannedSpaceUnits);
  }

  const planetRows: TotalsSectionRow[] =
    planetUnitsForTotals.length > 0
      ? [
          {
            key: "planet",
            label: "Planet",
            totals: planetTotals,
            hideAttack: !data.revealed, // neutral planet strength: hide Attack
          },
        ]
      : [];

  const spaceRows: TotalsSectionRow[] = Array.from(spaceUnitsByPlayer.entries()).map(([playerId, units]) => {
    const display = gameState.players[playerId]?.displayName || playerId;
    const isNeutral = playerId === "Neutral" || !gameState.players[playerId];
    return {
      key: playerId,
      label: display,
      totals: sumCombatStats(units),
      hideAttack: isNeutral, // neutral space strength: hide Attack
    };
  });

  return (
    <div className="throneworld-info">
      <div className="info-title">System {hexId}</div>
      <div className="info-meta">{data.revealed ? `${ownerName} • Dev ${systemDetails?.dev || 0}` : "Unrevealed"}</div>
      <ScannedBy data={systemData} players={gameState.players} />

      <div className="info-section">
        <div className="system-summary">
          <div className="system-marker">
            <SystemMarker
              system={
                systemDetails || {
                  dev: 0,
                  spaceTech: 0,
                  groundTech: 0,
                  spaceUnits: {},
                  groundUnits: {},
                }
              }
              worldType={systemData.worldType}
              revealed={data.canPeek}
              showScanners={false}
              size={64}
              ownerColor={ownerColor}
            />
          </div>

          <div className="system-totals">
            {/* Planet totals (always shown if we have any units for totals) */}
            <TotalsSection rows={planetRows} compactLabel={true} />

            {/* Space totals */}
            <TotalsSection title="Space" rows={spaceRows} indentRows={true} compactLabel={true} />
          </div>
        </div>
      </div>

      {/* Fleets (composition previews; do not show totals here) */}
      {allFleets.length > 0 &&
        (() => {
          const singleUnitsByOwner = new Map<string, ThroneworldUnit[]>();
          const multiFleets = [];

          for (const fleet of allFleets) {
            const units = [...fleet.spaceUnits, ...fleet.groundUnits];
            if (units.length === 1) {
              const u = units[0];
              if (!singleUnitsByOwner.has(fleet.owner)) singleUnitsByOwner.set(fleet.owner, []);
              singleUnitsByOwner.get(fleet.owner)!.push(u);
            } else {
              multiFleets.push(fleet);
            }
          }

          return (
            <div className="info-section">
              <div className="info-subtitle">Fleets ({allFleets.length})</div>

              {/* Single-unit fleets: all on ONE line (wrap if needed), no fleet icon */}
              {singleUnitsByOwner.size > 0 && (
                <div className="single-fleet-units">
                  {Array.from(singleUnitsByOwner.entries()).flatMap(([ownerId, units]) => {
                    const playerColor = gameState.players[ownerId]?.color || "#666";
                    return units.map((u, idx) => {
                      const unitDef = UNITS[u.unitTypeId];
                      return (
                        <div key={`${ownerId}-${u.id ?? u.unitTypeId}-${idx}`} className="single-fleet-unit">
                          <UnitStatCounter
                            unitDef={unitDef}
                            quantity={1}
                            hasMoved={!!u.hasMoved}
                            playerColor={playerColor}
                            size={32}
                          />
                        </div>
                      );
                    });
                  })}
                </div>
              )}

              {/* Multi-unit fleets: keep existing row format */}
              {multiFleets.length > 0 && (
                <div className="fleets-list">
                  {multiFleets.map((fleet) => (
                    <div key={fleet.id} className="fleet-preview-row">
                      <ThroneworldUnitCounter
                        unit={UNITS["fleet"]}
                        quantity={fleet.spaceUnits.length + fleet.groundUnits.length}
                        size={36}
                        hasMoved={false}
                        playerColor={gameState.players[fleet.owner]?.color || "#666"}
                      />
                      <FleetContents
                        compact={true}
                        spaceUnits={fleet.spaceUnits}
                        groundUnits={fleet.groundUnits}
                        playerColor={gameState.players[fleet.owner]?.color || "#666"}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

      {/* Unrevealed: show neutral spawn units (keep old/simple rendering) */}
      {!data.revealed && systemDetails && (
        <div className="info-section">
          <div className="info-subtitle">Neutral Units</div>
          <div className="unit-grid">
            {[
              ...Object.entries(systemDetails.spaceUnits || {}),
              ...Object.entries(systemDetails.groundUnits || {}),
            ].map(([unitTypeId, count]) => (
              <div key={unitTypeId} className="unit-tile">
                <UnitStatCounter
                  unitDef={UNITS[unitTypeId]}
                  quantity={count ?? 0}
                  hasMoved={false}
                  playerColor={neutralColor}
                  size={32}
                />
                <div className="unit-label">
                  {count ?? 0}× {UNITS[unitTypeId].Name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revealed: show ground units on planet */}
      {data.revealed && revealedPlanetUnits.length > 0 && (
        <div className="info-section">
          <div className="info-subtitle">Ground Units</div>
          {Object.entries(systemData.unitsOnPlanet || {}).map(([playerId, units]) => (
            <UnitsGrid
              key={playerId}
              units={units}
              playerColor={gameState.players[playerId]?.color || "#666"}
              size={32}
            />
          ))}
        </div>
      )}
    </div>
  );
}
