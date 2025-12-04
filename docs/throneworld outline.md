# Throne World – Implementation Design Document (Hexachromy Module)

_Source: original Throneworld rulebook, 12 pages._ :contentReference[oaicite:1]{index=1}  

This document extracts the structure of the physical game and turns it into a set of concepts and flows suitable for implementation in Hexachromy. It does **not** define data schemas or code; it defines what must exist and how it behaves.

---

## 1. High-Level Overview

In **Throneworld**, 2–6 alien races vie for control of a galactic imperium by expanding from their homeworlds, building fleets and armies, researching technology, and eventually contesting the **Throneworld** itself.  

Players:

- Start on distinct **homeworlds**.
- Explore and claim surrounding systems.
- Fight neutral defenders and other players.
- Research techs on a 4-track tech tree.
- Use **action chits** and **event chits** to create tactical swings.
- Win by controlling enough systems (with the Throneworld counting as multiple).

The game is played over a sequence of turns; each turn has **Expansion**, **Empire**, and **End** phases, with a special **Victory Attempt** mode that alters this flow.

---

## 2. Physical Components → Digital Objects

### 2.1 System Tiles and Map

The map is built from **72 hex system tiles**: :contentReference[oaicite:2]{index=2}  

- **Outer Worlds** – 37 tiles  
- **Fringe Worlds** – 17 tiles  
- **Inner Worlds** – 12 tiles  
- **Throneworlds** – 6 tiles  

The rulebook provides setup diagrams for 2–6 players that arrange these tiles into a ring-like galaxy with spaced-out homeworlds and one central Throneworld. (Page 2 “Throneworld Setup Charts”.)

Each **system tile** needs to support:

- **ID** (unique per hex).
- **Type**: `Homeworld | Inner | Outer | Fringe | Throneworld`.
- **Owner**:
  - `Neutral` or a player.
- **Development chit**:
  - Printed production value (0–6 credits).
  - Printed neutral defender forces (unit mix).
  - Face-down at start; can be revealed.
- **Scan markers**:
  - Per-player “scanned / not scanned” state.
- **Unit stacks**:
  - Space units (in orbit).
  - Ground units (on planet).
- **Special flags**:
  - Homeworld attributes (for revolt rules).
  - Possibly blockade state (derived, not stored).

The **battle board** shown in the rules is just a way to lay out unit stacks during combat; in software it will be a temporary overlay with rows for “attacker space”, “defender space”, “attacker ground”, “defender ground”.

---

### 2.2 Player Boards and Races

There are **6 different races**, each with a race summary and unique tech starting conditions (see “Race Summary” table). :contentReference[oaicite:3]{index=3}  

Each **player** has:

- **Faction** (race identity).
- **Homeworld system** reference.
- **Tech tracks**:
  - Four separate tracks (e.g., Jump, Attack, Defense, Industrial/Production – exact labels in the rulebook).
  - Each track has discrete levels with thresholds and effects.
- **Treasury / Credits**:
  - Used for production and possibly other costs.
- **Action chit hand**:
  - Up to 5 action chits.
- **Used/unused Command Bunkers** (for jumps/scans).
- **Unit pool**:
  - Ships and ground units available to build.
- **Global stats**:
  - Number of systems controlled.
  - Victory attempt state (if any).

---

### 2.3 Units

The **Unit Summary** page lists all unit types with cost, attack, defense, movement, cargo, and notes. :contentReference[oaicite:4]{index=4}  

Typical categories include (names from the table and examples in the rules):

- **Survey Team**
- **Freighter / Transport**
- **Blaster / Escort Combat Ships**
- **Jump Carrier**
- **Fighter / Heavy Fighter**
- **Infantry (Light / Heavy / Drop Troops)**
- **Special heavy units (e.g., “Super Blasters” / “Heavy Ships” depending on the exact names)**

Common attributes per unit:

- **Type ID & name**.
- **Cost (credits)**.
- **Space attack** value.
- **Space defense** value.
- **Ground attack / defense** (for ground units, or when landing).
- **Movement / Jump range** (may be modified by tech).
- **Cargo capacity**:
  - How many ground units the ship can carry.
- **Properties / flags**:
  - `firstFire: boolean` – fires in an earlier combat step.
  - `dropInvade: boolean` – may start ground combat before space is fully resolved.
  - `scout/survey` capabilities (for systems and dev chit reveal).
  - `nonCargo` (survey teams and blasters don’t consume cargo space, per examples).

Each physical counter’s printed values map directly to the digital **unit type definition**; instances in a game are “unit tokens” referencing those definitions.

---

### 2.4 Chits: Action & Event

#### Action Chits

The “Action Chits Manifest” lists categories like: :contentReference[oaicite:5]{index=5}  

- **Artifact**
- **Boon** (different numeric strengths)
- **Interdict**
- **Jam**
- **Jump Boost / Initiative / Special Attack** (exact names per chit)
- **Subsidy**
- etc.

Characteristics:

- Each chit has:
  - **Name / type**.
  - **Effect text** (e.g. perform research, modify combat, extra production, etc.).
  - **Play timing**:
    - Normally step 5.2 (play action chit), or
    - As an **interrupt** (Jams/Intercepts) during movement.
- Players hold up to **5 action chits** in hand.
- Many chits are returned to the cup after use, some may be removed (depending on rule text).

Software needs:

- **Chit definition** table (id, name, category, timing, rules hook).
- **Per-player action hand** structure.
- **Draw/discard/play** operations and limits.

#### Event Chits

The **Event Chits** section lists events such as: :contentReference[oaicite:6]{index=6}  

- **Imperial Attack**
- **Production Delay**
- **Production Advance**
- **Revolt Modifiers / Political Events**
- etc.

Characteristics:

- One event chit is drawn in each **Empire Phase**, resolved immediately, and usually returned.
- Events can:
  - Adjust production timing (advance/delay production turns).
  - Trigger special attacks or disturbances.
  - Modify revolt/homeworld behaviors.
- Events are global and may affect multiple or all players.

Software needs:

- **Event definition** table.
- **Event deck / cup logic** (random draw with replacement, as per rules).
- Hooks into phases (production schedule, revolt logic, etc.).

---

### 2.5 Markers & Tracks

Key markers:

- **Scan markers** (per player, per system).
- **Production track**:
  - A global turn/production marker with “production turns” and possibly “delay/advance” events.
- **Victory/turn markers** (for sequence tracking).
- **Tech markers** on four tracks per player.
- **Revolt markers** (if represented, for homeworld/revolt rules).

---

## 3. Turn & Phase Structure

The rulebook includes a **“Sequence of Play”** summary (page 12) which we will mirror as the core engine loop. :contentReference[oaicite:7]{index=7}  

### 3.1 Per-Turn Skeleton

Each game turn consists of:

1. **Expansion Phase**
2. **Empire Phase** (skipped during victory attempts)
3. **End Phase**

A **Victory Attempt** overlays this structure by skipping Empire Phases and altering end-of-turn checks until either success or failure.

---

### 3.2 Expansion Phase (per player, in order)

For each player, in current player order:

#### 5.1 Transfer, Jump, and Scan

- Player chooses **either**:
  - **One Transfer**:
    - Move stationary units between locations in a limited way (within a system / non-jump move).
  - **Up to three Jumps and/or Scans**:
    - Player plots all intended jumps/scans **before** execution.
    - Jumps require appropriate Command Bunker use and obey jump distance limits (modified by tech).
    - After plotting, other players may announce **Jams** or **Intercepts** via action chits (see section 8).

Key rules details (section 4 “Movement, Units and Combat Basics”): :contentReference[oaicite:8]{index=8}  

- Jumps are from one system to another within allowed jump range.
- Some ships may not jump or may have reduced capability.
- Survey Teams and certain ships can scan/flip dev chits.
- Cargo rules limit which ground units can be carried during jumps.

#### 5.1a Resolve Movement & Battles

After interrupts (Jams/Intercepts) are resolved:

- Apply all surviving jumps and scans.
- For each system where:
  - Arriving player meets neutral defenders, **or**
  - Arriving player enters a system with another player’s units,
- Initiate **battle** in that system.

Battles use the battle board structure, with steps for:

1. First Fire (units with that property fire first)
2. Normal fire & casualties
3. Drop-invade interactions (space + ground)
4. Retreats / elimination.

(Section 4.4–4.5 plus the “Battle Sequence” summary on page 12.) :contentReference[oaicite:9]{index=9}  

#### 5.2 Play Action Chit or Pass

- The current player may:
  - Play **1 action chit** and optionally discard **1 extra** chit,  
  - **Or** pass and discard up to **5** chits.
- Chit effects can:
  - Perform extra research.
  - Modify production.
  - Manipulate systems or fleets.
  - Affect revolt or homeworld rules.
- Chits are resolved as per their text, then returned to the pool or removed (per chit rules).

#### 5.3 Draw Action Chits

- After discards/plays:
  - Player draws chits up to a hand size of **5**.
- Draw source is the Action Chit cup/pile (refilled as needed according to the manifest).

---

### 3.3 Empire Phase (skipped during Victory Attempts)

#### 6.1 Research

- All players **simultaneously** perform one research attempt.
- A research attempt:
  - Targets one of the four tech tracks.
  - Uses some combination of dice, existing tech, and possibly chits to determine success (details encoded as rules logic).
- On success:
  - Move the corresponding tech marker up one space, unlocking new abilities (e.g., better jump range, combat bonuses, industrial output).

#### 6.2 Event Chit

- Draw the top (or a random) **Event chit**.
- Resolve its global effect.
- Return it according to the rules (usually to the event pool).

#### 6.3 Production (on Production Turns)

- On the **first turn** and every **second turn thereafter**, a **Production turn** occurs (modulo events that “Advance” or “Delay” production). :contentReference[oaicite:10]{index=10}  
- In a Production step:
  - **Homeworld Production**:
    - Player may spend from their treasury to build units at their homeworld.
  - **Local Production**:
    - Each non-homeworld system may produce units **up to its development rating**.
  - **Blockades**:
    - Blockaded systems may only use local production; unused potential is lost.
- Produced units appear in the appropriate orbit/ground zones according to unit type.

#### 6.4 Advance Production Marker

- Move the production marker along its track.
- Event chits can cause the marker to skip ahead or stall.

---

### 3.4 End Phase

Per rules section 7: :contentReference[oaicite:11]{index=11}  

1. **Refresh Command Bunkers**:
   - Flip all used Command Bunkers face up (ready for next turn).
2. **Determine Next Turn’s Player Order**:
   - Order determined by specified criteria (e.g., initiative, certain chits, or track positions).
   - During **Victory Attempts**, player order may be frozen or handled differently as per section 11.

---

## 4. Jams, Intercepts, and Player Battles

Section 8 defines special interaction using **Jam** and **Intercept** chits. :contentReference[oaicite:12]{index=12}  

Key concepts:

- During the Expansion phase, after a player reveals planned jumps/scans:
  - Other players may play **Jam** chits targeting specific jumps.
  - Intercepts allow counter-movement to meet enemy fleets in mid-or post-jump situations.
- Resolution:
  - A structured **Jam/Intercept sequence** (summarized on page 12) dictates:
    - Order of chit declarations,
    - Interaction between multiple Jams/Intercepts,
    - Final resulting positions and which systems go to battle.

For implementation:

- Represent this as a distinct sub-phase of Expansion:
  - **Interrupt Window**, where:
    - Allowed actions: play Jam/Intercept chit, or pass.
    - Once all players pass consecutively, interrupts end and movement is finalized.

---

## 5. Capturing Homeworlds & Revolt

Section 9 (“Capturing a Homeworld / Revolt”) defines special consequences of losing a homeworld. :contentReference[oaicite:13]{index=13}  

High-level behavior:

- If a player’s **homeworld** is captured by an opponent:
  - Some or all of that player’s other systems may revolt.
  - Systems may become neutral or switch control under specified conditions.
  - There may also be special “Revolt” events that interact with this rule.
- The exact revolt rules describe:
  - Which systems check for revolt.
  - Dice or conditions needed to revolt.
  - What happens to units stationed there.

Implementation:

- A **Revolt Resolution** routine is triggered:
  - Immediately on homeworld capture, and/or when certain event chits invoke it.
  - It iterates over relevant systems and adjusts ownership/units.

---

## 6. The Throneworld

Section 10 details specific rules for **The Throneworld**. :contentReference[oaicite:14]{index=14}  

Key properties:

- It is treated as a system with special defenses or revolt rules.
- For **victory counting**, it is worth **6 systems**.
- Battles on the Throneworld may have modified combat rules (e.g., extra defenders, special tech effects or penalties).

Implementation:

- Throneworld is a special system type with:
  - Unique neutral defenders.
  - Modified capture conditions.
  - Higher strategic value in system-count calculations.

---

## 7. Victory Attempts and Winning

Section 11 defines **Victory Attempts** and completion rules. :contentReference[oaicite:15]{index=15}  

### 7.1 Starting a Victory Attempt

- At the end of a turn (or specified timing), if a player controls:
  - At least **N systems** (based on player count, table on p.12),
  - With the Throneworld counting as **6**,
- That player may declare a **Victory Attempt**.

Required systems by player count:

| Players | Systems required |
|--------|------------------|
| 2      | 16               |
| 3      | 15               |
| 4      | 14               |
| 5      | 13               |
| 6      | 12               |

### 7.2 Victory Attempt Flow

- During a Victory Attempt:
  - **Empire Phase is skipped** each turn.
  - Only Expansion and End phases occur.
  - All other players attempt to:
    - Reduce the attempting player’s system count below the threshold, or
    - Exceed their system total.
- The attempt **succeeds** if:
  - After all players have completed an Expansion phase,  
  - No opposing player has more systems than the attempting player, **and**
  - The attempting player’s system count remains at or above the threshold.

- The attempt **fails** if:
  - The attempting player drops below the threshold, **or**
  - Another player exceeds their system total at any time specified in the rules.

- On failure:
  - Any player currently meeting the requirements may immediately start a new attempt.

Implementation:

- A `victoryAttempt` state indicating:
  - Attempting player.
  - Turn/phase when attempt began.
- Modified phase schedule:
  - Skip Empire.
  - At the end of each full round of Expansion phases, run **Victory Check**.

---

## 8. Data & Logic Modules Needed

This section summarizes the major game systems we must encode.

### 8.1 Core Data Structures (Conceptual)

- `GameDefinition_Throneworld`
  - Unit types, action chit definitions, event chit definitions.
  - System tile mix and setup charts.
  - Race starting configurations.
- `GameInstance`
  - Player list and current player order.
  - System map (specific tile layout and ownership).
  - Stack of units per system (space + ground).
  - Development chit state per system.
  - Player boards (tech, treasury, hand, bunkers).
  - Chit pools (action, event).
  - Global markers (turn, production, victoryAttempt).

### 8.2 Rule Engines

- **Setup Engine**
  - Arranges system tiles per player count exactly as per setup diagrams.
  - Deals out development chits and initial neutral defenders.

- **Movement & Jump Engine**
  - Handles transfer vs jump.
  - Enforces cargo and jump ranges.
  - Integrates with Jams/Intercepts.

- **Interrupt Engine**
  - Manages Jam/Intercept windows, sequencing, and outcomes.

- **Combat Engine**
  - Space and ground combat resolution.
  - First Fire and Drop-Invade.
  - Neutral vs player, and player vs player.

- **Research Engine**
  - Tech progression and effect activation.

- **Production Engine**
  - Homeworld and local production, blockade rules, lost credits.

- **Event Engine**
  - Execute event chit behaviors.

- **Revolt/Homeworld Engine**
  - Resolve consequences of homeworld capture and revolt events.

- **Throneworld Engine**
  - Apply special rules and victory weight.

- **Victory Engine**
  - System counting and victory attempt management.

---

## 9. Next Steps

1. Turn this design into a **formal GameState interface** (backend model).
2. Define **data tables** for:
   - Unit types.
   - Chit types (action/events).
   - Races and starting tech.
   - System tile types and dev chits.
3. Design the **phase class skeletons**:
   - `ExpansionPhase`, `EmpirePhase`, `EndPhase`, `VictoryAttemptPhase`.
4. Begin with **Setup + Expansion Phase** implementation since those drive the map and early game.

---
