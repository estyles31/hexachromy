"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOARD_HEXES_BY_ID = exports.BOARD_HEXES = void 0;
exports.getWorldType = getWorldType;
exports.isInPlay = isInPlay;
const boardLayout_throneworld_json_1 = __importDefault(require("../data/boardLayout.throneworld.json"));
const raw = boardLayout_throneworld_json_1.default;
/* ───────────────────────── */
/* Helpers                   */
/* ───────────────────────── */
function colIndex(col) {
    const first = col.charCodeAt(0);
    return first - "A".charCodeAt(0);
}
function makeId(col, row) {
    return `${col}${row}`;
}
/* ───────────────────────── */
/* Build Board Geometry      */
/* ───────────────────────── */
exports.BOARD_HEXES = [];
Object.entries(raw.columns).forEach(([col, rows]) => {
    rows.forEach((row, rowIndexInColumn) => {
        const id = makeId(col, row);
        const baseWorldType = raw.baseWorldTypes[id] ??
            raw.defaultWorldType;
        const overridesByPlayers = {};
        Object.entries(raw.worldTypesByPlayers).forEach(([playerCount, map]) => {
            if (map[id]) {
                overridesByPlayers[Number(playerCount)] = map[id];
            }
        });
        exports.BOARD_HEXES.push({
            id,
            col: col,
            row,
            colIndex: colIndex(col),
            rowIndexInColumn,
            baseWorldType,
            overridesByPlayers
        });
    });
});
/* ───────────────────────── */
/* Index by ID               */
/* ───────────────────────── */
exports.BOARD_HEXES_BY_ID = Object.fromEntries(exports.BOARD_HEXES.map(h => [h.id, h]));
/* ───────────────────────── */
/* Access API                */
/* ───────────────────────── */
function getWorldType(hexId, playerCount) {
    const hex = exports.BOARD_HEXES_BY_ID[hexId];
    if (!hex)
        throw new Error(`Unknown hex: ${hexId}`);
    return (hex.overridesByPlayers[playerCount] ??
        hex.baseWorldType);
}
function isInPlay(hexId, playerCount) {
    return getWorldType(hexId, playerCount) !== "NotInPlay";
}
// validation
function assertHexExists(hexId) {
    const col = hexId[0];
    const row = hexId.slice(1);
    if (!raw.columns[col]) {
        throw new Error(`Unknown column '${col}' referenced by ${hexId}`);
    }
    if (!raw.columns[col].includes(Number(row))) {
        throw new Error(`Invalid row '${row}' in hex ${hexId}`);
    }
}
function assertAllHexReferencesValid() {
    const check = (id) => assertHexExists(id);
    Object.keys(raw.baseWorldTypes).forEach(check);
    Object.values(raw.worldTypesByPlayers).forEach(map => Object.keys(map).forEach(check));
}
assertAllHexReferencesValid();
