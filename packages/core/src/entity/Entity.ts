import {
  queryAddEntity,
  queryCheckEntity,
  queryRemoveEntity,
} from "../query/Query.js";
import { resizeWorlds } from "../world/World.js";
import {
  $localEntities,
  $localEntityLookup,
  $manualEntityRecycling,
  $size,
} from "../world/symbols.js";
import { World } from "../world/types.js";
import {
  $entityComponents,
  $entityMasks,
  $entitySparseSet,
} from "./symbols.js";
import { TODO } from "../utils/types.js";
import { $notQueries, $queries } from "../query/symbols.js";

let defaultSize = 100000;

// need a global EID cursor which all worlds and all components know about
// so that world entities can posess entire rows spanning all component tables
let globalEntityCursor = 0;
let globalSize = defaultSize;

export const getGlobalSize = () => globalSize;

// removed eids should also be global to prevent memory leaks
const removed: number[] = [];
const recycled: number[] = [];

const defaultRemovedReuseThreshold = 0.01;
let removedReuseThreshold = defaultRemovedReuseThreshold;

export const resetGlobals = () => {
  globalSize = defaultSize;
  globalEntityCursor = 0;
  removedReuseThreshold = defaultRemovedReuseThreshold;
  removed.length = 0;
  recycled.length = 0;
};

export const getDefaultSize = () => defaultSize;

/**
 * Sets the default maximum number of entities for worlds and component stores.
 *
 * @param {number} newSize
 */
export const setDefaultSize = (newSize: number) => {
  const oldSize = globalSize;

  defaultSize = newSize;
  resetGlobals();

  globalSize = newSize;
  resizeWorlds(newSize);
};

/**
 * Sets the number of entities that must be removed before removed entity ids begin to be recycled.
 * This should be set to as a % (0-1) of `defaultSize` that you would never likely remove/add on a single frame.
 *
 * @param {number} newThreshold
 */
export const setRemovedRecycleThreshold = (newThreshold: number) => {
  removedReuseThreshold = newThreshold;
};

export const getEntityCursor = () => globalEntityCursor;
export const getRemovedEntities = () => [...recycled, ...removed];

export const eidToWorld = new Map<number, World>();

export const flushRemovedEntities = (world: World) => {
  if (!world[$manualEntityRecycling]) {
    throw new Error(
      "bitECS - cannot flush removed entities, enable feature with the enableManualEntityRecycling function"
    );
  }
  removed.push(...recycled);
  recycled.length = 0;
};

/**
 * Adds a new entity to the specified world.
 *
 * @param {World} world
 * @returns {number} eid
 */
export const addEntity = (world: World): number => {
  const eid: number = world[$manualEntityRecycling]
    ? removed.length
      ? removed.shift()!
      : globalEntityCursor++
    : removed.length > Math.round(globalSize * removedReuseThreshold)
    ? removed.shift()!
    : globalEntityCursor++;

  if (eid > world[$size]) throw new Error("bitECS - max entities reached");

  world[$entitySparseSet].add(eid);
  eidToWorld.set(eid, world);

  world[$notQueries].forEach((q) => {
    const match = queryCheckEntity(world, q, eid);
    if (match) queryAddEntity(q, eid);
  });

  world[$entityComponents].set(eid, new Set());

  return eid;
};

/**
 * Removes an existing entity from the specified world.
 *
 * @param {World} world
 * @param {number} eid
 */
export const removeEntity = (world: World, eid: number) => {
  // Check if entity is already removed
  if (!world[$entitySparseSet].has(eid)) return;

  // Remove entity from all queries
  // TODO: archetype graph
  world[$queries].forEach((q) => {
    queryRemoveEntity(world, q, eid);
  });

  // Free the entity
  if (world[$manualEntityRecycling]) recycled.push(eid);
  else removed.push(eid);

  // remove all eid state from world
  world[$entitySparseSet].remove(eid);
  world[$entityComponents].delete(eid);

  // remove from deserializer mapping
  world[$localEntities].delete(world[$localEntityLookup].get(eid));
  world[$localEntityLookup].delete(eid);

  // Clear entity bitmasks
  for (let i = 0; i < world[$entityMasks].length; i++)
    world[$entityMasks][i][eid] = 0;
};

/**
 *  Returns an array of components that an entity possesses.
 *
 * @param {*} world
 * @param {*} eid
 */
export const getEntityComponents = (world: World, eid: number): TODO[] => {
  if (eid === undefined) throw new Error("bitECS - entity is undefined.");
  if (!world[$entitySparseSet].has(eid))
    throw new Error("bitECS - entity does not exist in the world.");
  return Array.from(world[$entityComponents].get(eid)!);
};

/**
 * Checks the existence of an entity in a world
 *
 * @param {World} world
 * @param {number} eid
 */
export const entityExists = (world: World, eid: number) =>
  world[$entitySparseSet].has(eid);
