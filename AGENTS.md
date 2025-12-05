# HEXACHROMY AGENTS FILE

This repository is an active development workspace.  
Any automated agent (Codex, Copilot, etc) MUST comply with the rules below.

---

## 🧭 PROJECT OVERVIEW

**Hexachromy** is a modular web app for hosting asynchronous board games.

The system is divided into three strict layers:

### 1. Frontend (`/frontend`)
- React (TypeScript)
- Game-agnostic UI layer
- Renders SVG boards
- Gets state directly from Firebase
- Sends actions to backend via API

### 2. Backend (`/functions`)
- Firebase Cloud Functions (Node, TypeScript)
- Contains ALL game logic
- Authoritative rules engine
- Handles:
  - move validation
  - fog-of-war
  - scoped views
  - turn sequencing
  - game resolution

### 3. Shared (`/shared`)
- Data models and configuration ONLY
- No framework code
- Includes:
  - schemas
  - models
  - type definitions

### 4. Modules (`/modules`)
- Game specific code.
- /modules/{gamename}/frontend
- /modules/{gamename}/functions
- /modules/{gamename}/shared
- instead of putting anything game specific in the other sections, put everything here and load it dynamically

---

## 🖼️ BOARD RENDERING RULES

SVG boards are:

✅ GENERATED AT BUILD TIME  
✅ STORED UNDER Firebase hosting  
✅ REFERENCED BY URL  
✅ NEVER rendered dynamically in React  

Agents MUST NOT:
- render boards in React using JSX
- calculate hex geometry in the frontend
- embed ThroneWorld data in UI components (Throneworld is the first game we are implementing, but we want that logic to be on the backend and not leak to the front end)

Board generation scripts live in:
/hexachromy/tools/

Generated SVGs go to:
/hexachromy/frontend/public/boards/

---

## 🌌 BOARD VISUAL CONFIGURATION
Styling is driven by JSON only.

Location:
/shared/data/boardVisuals.*


SVG visuals MUST be controlled by:
- gradients
- stars (added as a background option, eventually want to generalize this)
- background layers
- tinting
- color mappings

Agents MUST NOT:
- hardcode colors in TypeScript
- inject visual details into game logic

---

## 🎮 GAME PAGE ARCHITECTURE

Frontend is game-agnostic.

Rules:

✅ No game rules live in React
✅ No phase logic in UI components
✅ UI renders by JSON schemata only

Backend sends:
- game state, including board svg url, and game objects
- legal actions
- legal targets
- current phase
- warnings

Frontend:
- renders state
- submits intent
- never validates rules

---

## 🌫️ FOG OF WAR

Fog is enforced at the database layer.

Plan:

- Firestore has per-player scoped views:
games/{gameId}/views/{playerId}

- Backend writes sanitized state to these docs
- Frontend reads only this doc
- No client-side filtering

Agents MUST:
- prevent state leaks
- not send hidden info to UI
- not rely on permissions alone for fog
- sanitize in backend

---

## 🔥 RULES ENGINE

Games are implemented as:

- separate modules, in their own folder
- base api determines which module to call by game id
- game has separate classes for each phase, and keeps a concept of the current phase and controls phase transistions
- Game-specific logic in backend
- Shared models define structure, not behavior

Frontend:
- renders based on GameState only
Backend:
- owns truth, validates all actions

---

## ✅ FILE PLACEMENT RULES

| Type | Location |
|------|----------|
| React Components | `/frontend/src` |
| Firebase Functions | `/functions/src` |
| Shared Models / Config | `/shared` |
| SVG Generator | `/frontend/tools` |
| Game Definitions | Firestore |
| Visual Config | `/shared/data` |

---

## 🛑 AGENT RULES

Agents:
- MUST follow this file
- MUST ask if unsure
- MUST not generate code outside specified paths
- MUST preserve data ownership boundaries

Any violation should be considered a failure.

---

## ✅ ASSUMPTIONS

- Firebase Hosting used
- Firebase Functions backend
- Firestore data storage
- Deterministic builds preferred
- Frontend is generic
- Backend is authoritative
- ReactJS frontend, typescript everywhere

---

## 🧠 HUMAN AUTHORITATIVE DESIGN

This repo is controlled by its human designer.

When ambiguity exists:
➡ Always prefer instructions in AGENTS.md

---

If you are an automated agent:
READ THIS FILE AGAIN.
