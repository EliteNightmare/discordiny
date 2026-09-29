import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import mapImage from "../assets/siva/opnb/map.png";
import "./NaniteBreak.css";

type EncounterKind = "normal" | "hidden";
type EncounterName =
  | "dresiks" | "monster" | "nanitecrew" | "perfectedsquad" | "rahndel"
  | "servitors" | "shankswarm" | "stealthswarm" | "walker"
  | "clear" | "cyclone" | "defense" | "infiltrate";

type WorldNode = {
  id: string;
  x: number;
  y: number;
  kind: EncounterKind;
  encounter: EncounterName;
  image: string;
};

type PlayerSignal = {
  userId: number;
  username: string;
  globalName: string | null;
  x: number;
  y: number;
  updatedAt: string;
};

type WorldResponse = {
  success: boolean;
  error?: string;
  self?: PlayerSignal;
  players?: PlayerSignal[];
  nodes?: WorldNode[];
};

type ClearResponse = {
  success: boolean;
  error?: string;
  rewards?: Record<string, number>;
  xp?: number;
  weapon?: { dropped: boolean; name: string | null; rarity: string | null };
  cleanseProgress?: number;
  cleanseTarget?: number;
};

const encounterAssets = import.meta.glob(
  "../assets/siva/opnb/*.png",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const imageByName = Object.fromEntries(
  Object.entries(encounterAssets).map(([path, url]) => [
    path.split("/").pop()?.toLowerCase() ?? path,
    url,
  ]),
) as Record<string, string>;

const MAP_POLYGON: Array<[number, number]> = [
  [8, 18], [21, 9], [39, 7], [57, 10], [74, 8], [91, 18],
  [94, 36], [91, 57], [84, 77], [67, 91], [45, 94], [24, 88],
  [9, 72], [5, 51],
];

function insidePolygon(x: number, y: number) {
  let inside = false;
  for (let i = 0, j = MAP_POLYGON.length - 1; i < MAP_POLYGON.length; j = i++) {
    const [xi, yi] = MAP_POLYGON[i];
    const [xj, yj] = MAP_POLYGON[j];
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || 0.00001) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function encounterFilename(node: WorldNode) {
  return node.kind === "hidden"
    ? `nanitebreak_hidden_${node.encounter}.png`
    : `nanitebreak_encounter_${node.encounter}.png`;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) throw new Error(`Empty response (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      response.ok
