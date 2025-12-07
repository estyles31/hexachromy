# Throneworld Visibility and Board Generation

This document summarizes how visibility, scanning, and board generation work for Throneworld. It is intended for anyone wiring new logic (backend or frontend) so that we keep fog-of-war and scan behavior consistent.

## Public versus private data

* **Public game state (`games/{gameId}`)** stores only the fields that every player can read per hex: the hex id and location, its world type, whether it has been revealed, which players have scanned it, and—if the hex is publicly revealed—the full system details. Homeworlds start revealed and therefore include their details immediately. The `ThroneworldPublicSystemState` interface documents these fields.
* **Player views (`games/{gameId}/playerViews/{playerId}`)** hold the private system details each player is allowed to see. The `neutral` view mirrors all system details and acts as the source of truth for copying into player views or the public state. Each player’s view starts empty and gains entries as they successfully scan hexes.
* **Requesting a game state** must include the viewer’s `playerView` so the frontend can determine whether a hovered marker should expose hidden information; the base marker always renders from public data.

## Revealed versus unrevealed hexes

* A hex is **revealed** only when its `revealed` flag is set in the public state. At that point, its full system details are copied into the public record so every player sees the tile without hovering.
* An **unrevealed** hex remains fogged in normal rendering, even if the acting player has private knowledge about it.
* When a player has scanned an unrevealed hex, the UI should still draw the fogged marker but allow that player to see the full tile on hover using the details stored in their `playerView`. The scan marker (see below) signals that hovering will show the preview.
* Homeworlds are always public and therefore skip fog and hover gating.

## Board generation

* Board layout uses `BOARD_HEXES` combined with the scenario’s player count to decide which positions are in play and what world type each position should be.
* Non-homeworld systems are drawn randomly from their world-type pool. Each drawn tile’s details are stored in the neutral view, while the public state only records location, world type, `revealed: false`, and `scannedBy: []`.
* Homeworlds assign sequentially to the provided player ids. They begin `revealed: true`, include full details in the public state, and also populate the neutral view.
* After generation, the backend writes one public game document and a `playerViews` document for every player plus the neutral catch-all.

## Scan markers and player scans

* Every hex tracks a `scannedBy` array in the public state so the frontend can draw a colored “bug” for each player who has scanned it.
* When a player successfully scans a hex (via Command Bunker coverage or a Survey Team jump):
  1. Append their player id to the hex’s `scannedBy` list if it is not already present.
  2. Copy the system’s full details from the neutral view into that player’s `playerView` entry for the hex (creating the per-player `systems` map entry on first scan).
  3. Leave `revealed` unchanged. Public reveal should occur only when a separate rule dictates it and, when it does, the system details should be promoted from the neutral view into the public state.
* The frontend uses the public `scannedBy` list to render scan markers and the requesting player’s view to decide whether a hover preview can show the full tile.
