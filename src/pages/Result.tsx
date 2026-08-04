import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Button, Toast } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { Card } from "@/components/Card";
import { Amount } from "@/components/Amount";
import { EmptyState } from "@/components/StateView";
import { AdSlot } from "@/components/AdSlot";
import { TossRewardAd } from "@/components/TossRewardAd";
import { getSettlementById } from "@/lib/storage";
import { calculateSplit } from "@/lib/calc";
import { requestTransfer } from "@/lib/transfer";
import { formatKRW } from "@/lib/format";
import type { RouteState } from "@/lib/types";

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as RouteState["/result"] | null) ?? null;
  const [showShare, setShowShare] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const settlement = state?.settlementId ? getSettlementById(state.settlementId) : null;

  if (!settlement) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>정산 결과</Top.TitleParagraph>} />}>
        <EmptyState
          title="정산을 찾을 수 없어요"
          description="삭제되었거나 잘못된 링크예요"
          action={
            <Button variant="weak" display="block" onClick={() => navigate("/")}>
              홈으로
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const total = settlement.items.reduce((sum, item) => sum + item.amount, 0);
  const calcResult = calculateSplit({
    total,
    participants: settlement.participants.map((p) => {
      const rule = settlement.splitRules.find((r) => r.participantId === p.id);
      return {
        id: p.id,
        name: p.name,
        mode: rule?.mode ?? "even",
        amount: rule?.value,
      };
    }),
  });
  const shares = calcResult.ok ? calcResult.result.shares : [];

  const handleTransfer = async (name: string, amount: number) => {
    const ok = await requestTransfer(amount, name);
    if (!ok) setToastOpen(true);
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>정산 결과</Top.TitleParagraph>} />}>
      <SummaryHero
        testId="total-hero"
        label="총 정산액"
        value={<Amount value={total} unit="원" typography="t1" />}
      />
      <Spacing size={20} />
      {settlement.participants.map((p) => {
        const amount = shares.find((s) => s.participantId === p.id)?.amount ?? 0;
        return (
          <div key={p.id}>
            <Card testId="share-card">
              <Paragraph.Text typography="t5">{p.name}</Paragraph.Text>
              <Spacing size={4} />
              <Paragraph.Text typography="t3">{formatKRW(amount)}원</Paragraph.Text>
              <Spacing size={12} />
              <Button
                variant="weak"
                display="block"
                data-testid={`transfer-button-${p.name}`}
                onClick={() => handleTransfer(p.name, amount)}
              >
                송금 요청
              </Button>
            </Card>
            <Spacing size={12} />
          </div>
        );
      })}
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />
      <Spacing size={20} />
      {showShare ? (
        <TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>
          <Button
            variant="weak"
            display="block"
            onClick={() => {
              try {
                navigator.clipboard?.writeText(`${settlement.title} 정산 결과`);
              } catch {
                /* 클립보드 미지원 — 무시 */
              }
            }}
          >
            텍스트 복사
          </Button>
        </TossRewardAd>
      ) : (
        <Button variant="fill" display="block" onClick={() => setShowShare(true)}>
          정산 내역 공유
        </Button>
      )}
      <Toast open={toastOpen} text="송금 화면을 열 수 없어요" position="bottom" />
    </ScreenScaffold>
  );
}
