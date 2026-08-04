import { Asset, ListRow, Paragraph, Spacing } from "@toss/tds-mobile";
import { Card } from "@/components/Card";
import { formatKRW } from "@/lib/format";
import type { SettlementResult } from "@/lib/types";

export interface ShareCardProps {
  title: string;
  result: SettlementResult;
  testId?: string;
}

/**
 * 정산 결과 요약 카드 — 공유 시트/캡처용. TDS 컴포넌트만으로 구성.
 */
export function ShareCard({ title, result, testId }: ShareCardProps) {
  return (
    <Card testId={testId}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Asset.ContentIcon name="iconReceiptRegular" alt="정산 결과" style={{ width: 20, height: 20 }} />
        <Paragraph.Text typography="t5">{title}</Paragraph.Text>
      </div>
      <Spacing size={8} />
      <Paragraph.Text typography="t1">{formatKRW(result.total)}원</Paragraph.Text>
      <Spacing size={16} />
      {result.shares.map((share) => (
        <ListRow
          key={share.participantId}
          contents={
            <ListRow.Texts
              type="Right2RowTypeA"
              top={share.name}
              bottom={`${formatKRW(share.amount)}원`}
            />
          }
        />
      ))}
    </Card>
  );
}
