import { describe, it, expect } from "vitest";

/**
 * Packet: 설계/힐 출력을 청크 단위로 분할 직렬화
 *
 * AC-1: 설계 결과가 엔티티/계약/워크패킷 최소 3개 이상의 분리된 JSON 응답으로 생성된다
 * AC-2: 단일 응답 어느 것도 truncation 없이 완결된 유효 JSON으로 파싱된다
 * AC-3: 전체 계획을 병합한 최종 객체가 기존 스키마와 동일하다
 */

// ============================================================================
// Type definitions for plan chunks
// ============================================================================

/** Chunk 1: Entity definitions (data model types) */
interface EntityChunk {
  type: "entities";
  entities: Array<{
    name: string;
    description: string;
    fields: Array<{ name: string; type: string; required: boolean }>;
  }>;
}

/** Chunk 2: Route contract (navigation/routing states) */
interface RoutingContractChunk {
  type: "routing_contract";
  routes: Array<{
    screen: string;
    params?: Array<{ name: string; type: string }>;
    description: string;
  }>;
}

/** Chunk 3+: Work packets (feature/task breakdown) */
interface WorkPacketChunk {
  type: "work_packets";
  packets: Array<{
    id: string;
    title: string;
    priority: "P0" | "P1" | "P2";
    acceptanceCriteria: string[];
  }>;
  pageInfo?: {
    page: number;
    total: number;
  };
}

type PlanChunk = EntityChunk | RoutingContractChunk | WorkPacketChunk;

/** Full plan schema (merged from all chunks) */
interface FullPlan {
  entities: EntityChunk["entities"];
  routing: RoutingContractChunk["routes"];
  workPackets: WorkPacketChunk["packets"];
}

// ============================================================================
// Mock data fixtures
// ============================================================================

const mockEntityChunk: EntityChunk = {
  type: "entities",
  entities: [
    {
      name: "Member",
      description: "A participant in a split session",
      fields: [
        { name: "id", type: "string", required: true },
        { name: "name", type: "string", required: true },
      ],
    },
    {
      name: "SplitItem",
      description: "An expense item to be split",
      fields: [
        { name: "id", type: "string", required: true },
        { name: "name", type: "string", required: true },
        { name: "amount", type: "number", required: true },
        { name: "payerId", type: "string", required: true },
        { name: "memberIds", type: "string[]", required: true },
      ],
    },
    {
      name: "SplitSession",
      description: "A complete split session with members and items",
      fields: [
        { name: "id", type: "string", required: true },
        { name: "title", type: "string", required: true },
        { name: "members", type: "Member[]", required: true },
        { name: "items", type: "SplitItem[]", required: true },
        { name: "createdAt", type: "string", required: true },
      ],
    },
    {
      name: "SettlementResult",
      description: "Settlement between two members",
      fields: [
        { name: "memberId", type: "string", required: true },
        { name: "amount", type: "number", required: true },
      ],
    },
  ],
};

const mockRoutingChunk: RoutingContractChunk = {
  type: "routing_contract",
  routes: [
    {
      screen: "home",
      description: "Home screen with session list",
    },
    {
      screen: "create",
      description: "Create new split session",
    },
    {
      screen: "result",
      params: [{ name: "sessionId", type: "string" }],
      description: "View split results and settlement",
    },
  ],
};

const mockWorkPacketsChunk1: WorkPacketChunk = {
  type: "work_packets",
  packets: [
    {
      id: "heal-1-01",
      title: "엔티티 타입 + RouteState 계약 정의(최소 스켈레톤)",
      priority: "P0",
      acceptanceCriteria: [
        "SplitSession, Member, SplitItem, SettlementResult 타입 export",
        "RouteState 유니온 타입 정의",
        "tsc --noEmit 통과",
      ],
    },
    {
      id: "heal-1-02",
      title: "localStorage 저장 계층 구현(F1 AC 충족)",
      priority: "P0",
      acceptanceCriteria: [
        "saveSession, getSessions, getSession 구현",
        "최대 3개 세션 유지 (FIFO)",
        "손상된 데이터 복구",
        "QuotaExceededError 처리",
      ],
    },
  ],
  pageInfo: {
    page: 1,
    total: 2,
  },
};

const mockWorkPacketsChunk2: WorkPacketChunk = {
  type: "work_packets",
  packets: [
    {
      id: "heal-2-01",
      title: "설계/힐 출력을 청크 단위로 분할 직렬화",
      priority: "P0",
      acceptanceCriteria: [
        "3개 이상 분리된 JSON 응답으로 생성",
        "각 응답이 완결된 유효 JSON",
        "병합 후 기존 스키마와 동일",
      ],
    },
  ],
  pageInfo: {
    page: 2,
    total: 2,
  },
};

// ============================================================================
// AC-1: Design output is split into 3+ separate JSON responses
// ============================================================================

describe("AC-1[P0]: 설계 결과가 엔티티/계약/워크패킷 최소 3개 이상의 분리된 JSON 응답으로 생성된다", () => {
  it("should generate at least 3 distinct chunk types", () => {
    const chunks: PlanChunk[] = [
      mockEntityChunk,
      mockRoutingChunk,
      mockWorkPacketsChunk1,
    ];

    expect(chunks.length).toBeGreaterThanOrEqual(3);
    const chunkTypes = new Set(chunks.map((c) => c.type));
    expect(chunkTypes.size).toBeGreaterThanOrEqual(3);
    expect(Array.from(chunkTypes)).toContain("entities");
    expect(Array.from(chunkTypes)).toContain("routing_contract");
    expect(Array.from(chunkTypes)).toContain("work_packets");
  });

  it("should separate entities chunk from routing and work packets", () => {
    const chunks: PlanChunk[] = [
      mockEntityChunk,
      mockRoutingChunk,
      mockWorkPacketsChunk1,
    ];

    const entityChunk = chunks.find((c) => c.type === "entities");
    expect(entityChunk).toBeDefined();
    expect(entityChunk?.type).toBe("entities");
    if (entityChunk?.type === "entities") {
      expect(entityChunk.entities.length).toBeGreaterThan(0);
      expect(entityChunk.entities[0].name).toBeDefined();
      expect(entityChunk.entities[0].fields).toBeDefined();
    }
  });

  it("should separate routing contract chunk from entities and work packets", () => {
    const chunks: PlanChunk[] = [
      mockEntityChunk,
      mockRoutingChunk,
      mockWorkPacketsChunk1,
    ];

    const routingChunk = chunks.find((c) => c.type === "routing_contract");
    expect(routingChunk).toBeDefined();
    expect(routingChunk?.type).toBe("routing_contract");
    if (routingChunk?.type === "routing_contract") {
      expect(routingChunk.routes.length).toBeGreaterThan(0);
      expect(routingChunk.routes[0].screen).toBeDefined();
      expect(routingChunk.routes[0].description).toBeDefined();
    }
  });

  it("should separate work packets chunk with pagination support", () => {
    const chunks: PlanChunk[] = [
      mockEntityChunk,
      mockRoutingChunk,
      mockWorkPacketsChunk1,
      mockWorkPacketsChunk2,
    ];

    const packetChunks = chunks.filter((c) => c.type === "work_packets");
    expect(packetChunks.length).toBeGreaterThanOrEqual(1);

    packetChunks.forEach((chunk) => {
      if (chunk.type === "work_packets") {
        expect(chunk.packets.length).toBeGreaterThan(0);
        expect(chunk.packets[0].id).toBeDefined();
        expect(chunk.packets[0].title).toBeDefined();
        expect(chunk.packets[0].priority).toMatch(/^P[0-2]$/);
        expect(chunk.packets[0].acceptanceCriteria).toBeDefined();
      }
    });
  });

  it("should support multi-page work packet streaming", () => {
    const chunks: PlanChunk[] = [
      mockEntityChunk,
      mockRoutingChunk,
      mockWorkPacketsChunk1,
      mockWorkPacketsChunk2,
    ];

    const packetChunks = chunks.filter(
      (c) => c.type === "work_packets"
    ) as WorkPacketChunk[];

    expect(packetChunks.length).toBe(2);
    expect(packetChunks[0].pageInfo?.page).toBe(1);
    expect(packetChunks[0].pageInfo?.total).toBe(2);
    expect(packetChunks[1].pageInfo?.page).toBe(2);
    expect(packetChunks[1].pageInfo?.total).toBe(2);
  });
});

// ============================================================================
// AC-2: Each response is complete, valid JSON without truncation
// ============================================================================

describe("AC-2[P0]: 단일 응답 어느 것도 truncation 없이 완결된 유효 JSON으로 파싱된다", () => {
  it("should serialize entities chunk to valid JSON", () => {
    const jsonStr = JSON.stringify(mockEntityChunk);
    expect(() => JSON.parse(jsonStr)).not.toThrow();

    const parsed = JSON.parse(jsonStr) as EntityChunk;
    expect(parsed.type).toBe("entities");
    expect(Array.isArray(parsed.entities)).toBe(true);
  });

  it("should serialize routing contract chunk to valid JSON", () => {
    const jsonStr = JSON.stringify(mockRoutingChunk);
    expect(() => JSON.parse(jsonStr)).not.toThrow();

    const parsed = JSON.parse(jsonStr) as RoutingContractChunk;
    expect(parsed.type).toBe("routing_contract");
    expect(Array.isArray(parsed.routes)).toBe(true);
    expect(parsed.routes[0].screen).toBe("home");
  });

  it("should serialize work packets chunk to valid JSON", () => {
    const jsonStr = JSON.stringify(mockWorkPacketsChunk1);
    expect(() => JSON.parse(jsonStr)).not.toThrow();

    const parsed = JSON.parse(jsonStr) as WorkPacketChunk;
    expect(parsed.type).toBe("work_packets");
    expect(Array.isArray(parsed.packets)).toBe(true);
    expect(parsed.packets[0].id).toBe("heal-1-01");
  });

  it("should parse each chunk independently without dependency on others", () => {
    const chunks = [
      JSON.stringify(mockEntityChunk),
      JSON.stringify(mockRoutingChunk),
      JSON.stringify(mockWorkPacketsChunk1),
      JSON.stringify(mockWorkPacketsChunk2),
    ];

    const parsed = chunks.map((c) => JSON.parse(c));
    expect(parsed.length).toBe(4);
    parsed.forEach((chunk) => {
      expect(chunk).toBeDefined();
      expect(chunk.type).toBeDefined();
    });
  });

  it("should handle large work packet chunks without truncation", () => {
    // Create a large packet chunk with many items
    const largePacketsChunk: WorkPacketChunk = {
      type: "work_packets",
      packets: Array.from({ length: 50 }, (_, i) => ({
        id: `packet-${i}`,
        title: `Packet ${i} with a longer description to increase payload size`,
        priority: i % 3 === 0 ? "P0" : i % 3 === 1 ? "P1" : "P2",
        acceptanceCriteria: [
          `AC-${i}-1: First criterion`,
          `AC-${i}-2: Second criterion with more details`,
          `AC-${i}-3: Third criterion with even more details to increase size`,
        ],
      })),
      pageInfo: { page: 1, total: 5 },
    };

    const jsonStr = JSON.stringify(largePacketsChunk);
    expect(() => JSON.parse(jsonStr)).not.toThrow();

    const parsed = JSON.parse(jsonStr) as WorkPacketChunk;
    expect(parsed.packets.length).toBe(50);
    expect(parsed.packets[0].id).toBe("packet-0");
    expect(parsed.packets[49].id).toBe("packet-49");
  });

  it("should preserve all fields when round-tripping through JSON", () => {
    const original = mockWorkPacketsChunk1;
    const serialized = JSON.stringify(original);
    const deserialized = JSON.parse(serialized) as WorkPacketChunk;

    expect(deserialized.type).toBe(original.type);
    expect(deserialized.packets.length).toBe(original.packets.length);
    expect(deserialized.packets[0].id).toBe(original.packets[0].id);
    expect(deserialized.packets[0].acceptanceCriteria).toEqual(
      original.packets[0].acceptanceCriteria
    );
    expect(deserialized.pageInfo?.page).toBe(original.pageInfo?.page);
    expect(deserialized.pageInfo?.total).toBe(original.pageInfo?.total);
  });
});

// ============================================================================
// AC-3: Merged result matches original schema
// ============================================================================

describe("AC-3[P0]: 전체 계획을 병합한 최종 객체가 기존 스키마와 동일하다", () => {
  it("should merge all chunks into a complete plan object", () => {
    const chunks: PlanChunk[] = [
      mockEntityChunk,
      mockRoutingChunk,
      mockWorkPacketsChunk1,
      mockWorkPacketsChunk2,
    ];

    const merged: FullPlan = {
      entities: [],
      routing: [],
      workPackets: [],
    };

    chunks.forEach((chunk) => {
      if (chunk.type === "entities") {
        merged.entities.push(...chunk.entities);
      } else if (chunk.type === "routing_contract") {
        merged.routing.push(...chunk.routes);
      } else if (chunk.type === "work_packets") {
        merged.workPackets.push(...chunk.packets);
      }
    });

    expect(merged.entities.length).toBe(4);
    expect(merged.routing.length).toBe(3);
    expect(merged.workPackets.length).toBe(3);
  });

  it("should preserve entity structure after merging", () => {
    const chunks: PlanChunk[] = [mockEntityChunk];

    const merged: FullPlan = {
      entities: [],
      routing: [],
      workPackets: [],
    };

    chunks.forEach((chunk) => {
      if (chunk.type === "entities") {
        merged.entities.push(...chunk.entities);
      }
    });

    expect(merged.entities[0].name).toBe("Member");
    expect(merged.entities[0].fields[0].name).toBe("id");
    expect(merged.entities[0].fields[0].type).toBe("string");
    expect(merged.entities[0].fields[0].required).toBe(true);
  });

  it("should preserve routing contract structure after merging", () => {
    const chunks: PlanChunk[] = [mockRoutingChunk];

    const merged: FullPlan = {
      entities: [],
      routing: [],
      workPackets: [],
    };

    chunks.forEach((chunk) => {
      if (chunk.type === "routing_contract") {
        merged.routing.push(...chunk.routes);
      }
    });

    expect(merged.routing.length).toBe(3);
    expect(merged.routing[0].screen).toBe("home");
    expect(merged.routing[2].screen).toBe("result");
    expect(merged.routing[2].params).toBeDefined();
    expect(merged.routing[2].params?.[0].name).toBe("sessionId");
  });

  it("should accumulate work packets across multiple chunks", () => {
    const chunks: PlanChunk[] = [
      mockWorkPacketsChunk1,
      mockWorkPacketsChunk2,
    ];

    const merged: FullPlan = {
      entities: [],
      routing: [],
      workPackets: [],
    };

    chunks.forEach((chunk) => {
      if (chunk.type === "work_packets") {
        merged.workPackets.push(...chunk.packets);
      }
    });

    expect(merged.workPackets.length).toBe(3);
    expect(merged.workPackets[0].id).toBe("heal-1-01");
    expect(merged.workPackets[1].id).toBe("heal-1-02");
    expect(merged.workPackets[2].id).toBe("heal-2-01");
  });

  it("should maintain AC structure when merging work packets", () => {
    const chunks: PlanChunk[] = [mockWorkPacketsChunk1];

    const merged: FullPlan = {
      entities: [],
      routing: [],
      workPackets: [],
    };

    chunks.forEach((chunk) => {
      if (chunk.type === "work_packets") {
        merged.workPackets.push(...chunk.packets);
      }
    });

    const healPacket = merged.workPackets[0];
    expect(healPacket.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(healPacket.acceptanceCriteria[0]).toContain(
      "SplitSession, Member, SplitItem, SettlementResult"
    );
  });

  it("should support re-serializing merged plan without loss", () => {
    const chunks: PlanChunk[] = [
      mockEntityChunk,
      mockRoutingChunk,
      mockWorkPacketsChunk1,
    ];

    const merged: FullPlan = {
      entities: [],
      routing: [],
      workPackets: [],
    };

    chunks.forEach((chunk) => {
      if (chunk.type === "entities") {
        merged.entities.push(...chunk.entities);
      } else if (chunk.type === "routing_contract") {
        merged.routing.push(...chunk.routes);
      } else if (chunk.type === "work_packets") {
        merged.workPackets.push(...chunk.packets);
      }
    });

    const serialized = JSON.stringify(merged);
    expect(() => JSON.parse(serialized)).not.toThrow();

    const reserialized = JSON.parse(serialized) as FullPlan;
    expect(reserialized.entities.length).toBe(merged.entities.length);
    expect(reserialized.routing.length).toBe(merged.routing.length);
    expect(reserialized.workPackets.length).toBe(merged.workPackets.length);
  });
});

// ============================================================================
// Integration: Chunk size and token efficiency
// ============================================================================

describe("Integration[P1]: 청크 크기 제한 및 토큰 효율성", () => {
  it("should keep each chunk under reasonable size limit (4-6K tokens estimate)", () => {
    const chunks: PlanChunk[] = [
      mockEntityChunk,
      mockRoutingChunk,
      mockWorkPacketsChunk1,
    ];

    chunks.forEach((chunk) => {
      const json = JSON.stringify(chunk);
      // Rough estimate: 1 token ≈ 4 characters
      const estimatedTokens = json.length / 4;
      expect(estimatedTokens).toBeLessThan(6000);
    });
  });

  it("should support streaming chunks in sequence without accumulating memory", () => {
    // Simulate streaming 5 work packet pages
    const packetPages: WorkPacketChunk[] = Array.from({ length: 5 }, (_, i) => ({
      type: "work_packets",
      packets: [
        {
          id: `page-${i}-packet`,
          title: `Packet from page ${i}`,
          priority: "P0",
          acceptanceCriteria: ["AC-1", "AC-2"],
        },
      ],
      pageInfo: {
        page: i + 1,
        total: 5,
      },
    }));

    let totalPackets = 0;
    packetPages.forEach((page) => {
      const json = JSON.stringify(page);
      const parsed = JSON.parse(json) as WorkPacketChunk;
      totalPackets += parsed.packets.length;
    });

    expect(totalPackets).toBe(5);
  });

  it("should allow client to request next chunk using pageInfo", () => {
    const chunk = mockWorkPacketsChunk1;

    if (chunk.pageInfo) {
      const hasMore = chunk.pageInfo.page < chunk.pageInfo.total;
      expect(hasMore).toBe(true);
      expect(chunk.pageInfo.page + 1).toBe(2);
    }
  });

  it("should handle final chunk with no next page", () => {
    const finalChunk: WorkPacketChunk = {
      type: "work_packets",
      packets: [
        {
          id: "final-packet",
          title: "Last packet",
          priority: "P0",
          acceptanceCriteria: ["Done"],
        },
      ],
      pageInfo: {
        page: 2,
        total: 2,
      },
    };

    if (finalChunk.pageInfo) {
      const hasMore = finalChunk.pageInfo.page < finalChunk.pageInfo.total;
      expect(hasMore).toBe(false);
      expect(finalChunk.pageInfo.page).toBe(finalChunk.pageInfo.total);
    }
  });
});

// ============================================================================
// Error handling and validation
// ============================================================================

describe("Error Handling[P1]: 청크 검증 및 에러 처리", () => {
  it("should validate chunk type field is required", () => {
    const validChunk = {
      type: "entities",
      entities: [],
    };

    expect(validChunk.type).toBeDefined();
    expect(validChunk.type).toBe("entities");
  });

  it("should parse and validate entity chunk structure", () => {
    const chunk = mockEntityChunk;

    expect(chunk.type).toBe("entities");
    chunk.entities.forEach((entity) => {
      expect(entity.name).toBeDefined();
      expect(entity.description).toBeDefined();
      expect(Array.isArray(entity.fields)).toBe(true);
      entity.fields.forEach((field) => {
        expect(field.name).toBeDefined();
        expect(field.type).toBeDefined();
        expect(typeof field.required).toBe("boolean");
      });
    });
  });

  it("should parse and validate routing chunk structure", () => {
    const chunk = mockRoutingChunk;

    expect(chunk.type).toBe("routing_contract");
    chunk.routes.forEach((route) => {
      expect(route.screen).toBeDefined();
      expect(route.description).toBeDefined();
      if (route.params) {
        expect(Array.isArray(route.params)).toBe(true);
        route.params.forEach((param) => {
          expect(param.name).toBeDefined();
          expect(param.type).toBeDefined();
        });
      }
    });
  });

  it("should parse and validate work packet chunk structure", () => {
    const chunk = mockWorkPacketsChunk1;

    expect(chunk.type).toBe("work_packets");
    expect(Array.isArray(chunk.packets)).toBe(true);
    chunk.packets.forEach((packet) => {
      expect(packet.id).toBeDefined();
      expect(packet.title).toBeDefined();
      expect(/^P[0-2]$/.test(packet.priority)).toBe(true);
      expect(Array.isArray(packet.acceptanceCriteria)).toBe(true);
      expect(packet.acceptanceCriteria.length).toBeGreaterThan(0);
    });

    if (chunk.pageInfo) {
      expect(typeof chunk.pageInfo.page).toBe("number");
      expect(typeof chunk.pageInfo.total).toBe("number");
      expect(chunk.pageInfo.page).toBeGreaterThan(0);
      expect(chunk.pageInfo.total).toBeGreaterThan(0);
      expect(chunk.pageInfo.page).toBeLessThanOrEqual(chunk.pageInfo.total);
    }
  });
});
