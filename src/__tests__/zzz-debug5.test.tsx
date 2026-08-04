import { describe, it, vi } from "vitest";

const tossRewardAdSlotIds: unknown[] = [];
vi.mock("@/components/TossRewardAd", () => {
  console.log("FACTORY INVOKED");
  return {
    TossRewardAd: (props: { slotId?: string; children: unknown }) => {
      console.log("MOCK RENDERED", props.slotId);
      tossRewardAdSlotIds.push(props.slotId);
      return props.children;
    },
  };
});

import { TossRewardAd } from "@/components/TossRewardAd";
import * as ResultModule from "@/pages/Result";

describe("debug5", () => {
  it("checks binding identity", () => {
    console.log("direct import typeof:", typeof TossRewardAd, TossRewardAd.toString().slice(0, 60));
  });
});
