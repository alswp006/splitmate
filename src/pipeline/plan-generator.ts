import { parseChunkedResponse } from "./heal";

export interface EntityField {
  name: string;
  type: string;
  required: boolean;
}

export interface EntityDefinition {
  name: string;
  description: string;
  fields: EntityField[];
}

export interface EntityChunk {
  type: "entities";
  entities: EntityDefinition[];
}

export interface RouteParam {
  name: string;
  type: string;
}

export interface RouteContract {
  screen: string;
  params?: RouteParam[];
  description: string;
}

export interface RoutingContractChunk {
  type: "routing_contract";
  routes: RouteContract[];
}

export type WorkPacketPriority = "P0" | "P1" | "P2";

export interface WorkPacket {
  id: string;
  title: string;
  priority: WorkPacketPriority;
  acceptanceCriteria: string[];
}

export interface PageInfo {
  page: number;
  total: number;
}

export interface WorkPacketChunk {
  type: "work_packets";
  packets: WorkPacket[];
  pageInfo?: PageInfo;
}

export type PlanChunk = EntityChunk | RoutingContractChunk | WorkPacketChunk;

/** Full plan schema — merged result of all chunks. */
export interface FullPlan {
  entities: EntityDefinition[];
  routing: RouteContract[];
  workPackets: WorkPacket[];
}

const MAX_CHUNK_TOKENS = 6000;
const CHARS_PER_TOKEN = 4;

export function createEntityChunk(entities: EntityDefinition[]): EntityChunk {
  return { type: "entities", entities };
}

export function createRoutingContractChunk(routes: RouteContract[]): RoutingContractChunk {
  return { type: "routing_contract", routes };
}

/** Splits work packets into paginated chunks so each stays within the token budget. */
export function paginateWorkPackets(packets: WorkPacket[], pageSize: number): WorkPacketChunk[] {
  if (packets.length === 0) {
    return [{ type: "work_packets", packets: [] }];
  }

  const totalPages = Math.ceil(packets.length / pageSize);
  return Array.from({ length: totalPages }, (_, i) => ({
    type: "work_packets" as const,
    packets: packets.slice(i * pageSize, (i + 1) * pageSize),
    pageInfo: { page: i + 1, total: totalPages },
  }));
}

export function estimateTokens(chunk: PlanChunk): number {
  return Math.ceil(JSON.stringify(chunk).length / CHARS_PER_TOKEN);
}

export function isWithinChunkSizeLimit(chunk: PlanChunk, maxTokens: number = MAX_CHUNK_TOKENS): boolean {
  return estimateTokens(chunk) <= maxTokens;
}

export function serializePlanChunk(chunk: PlanChunk): string {
  return JSON.stringify(chunk);
}

function isPlanChunk(value: unknown): value is PlanChunk {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return type === "entities" || type === "routing_contract" || type === "work_packets";
}

/** Parses a single chunk response, repairing truncation before giving up. */
export function parsePlanChunk(json: string): PlanChunk | null {
  const { chunks } = parseChunkedResponse(json);
  const [parsed] = chunks;
  return isPlanChunk(parsed) ? parsed : null;
}

/** Merges independently-parsed chunks into the full plan (same shape as the pre-chunking schema). */
export function mergePlanChunks(chunks: PlanChunk[]): FullPlan {
  const merged: FullPlan = { entities: [], routing: [], workPackets: [] };

  for (const chunk of chunks) {
    if (chunk.type === "entities") {
      merged.entities.push(...chunk.entities);
    } else if (chunk.type === "routing_contract") {
      merged.routing.push(...chunk.routes);
    } else if (chunk.type === "work_packets") {
      merged.workPackets.push(...chunk.packets);
    }
  }

  return merged;
}
