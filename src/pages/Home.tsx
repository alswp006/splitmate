import { useEffect, useState } from 'react';
import {
  Top,
  Paragraph,
  Spacing,
  ListRow,
  Button,
  BottomSheet,
  AlertDialog,
  Toast,
  Asset,
} from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { EmptyState, LoadingState } from '@/components/StateView';
import { formatKRW } from '@/lib/format';
import { getRecentSettlements, deleteSettlement } from '@/lib/storage';
import type { Settlement } from '@/lib/types';

function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    // WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시
  }
}

export default function Home() {
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState<Settlement[] | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettlements(getRecentSettlements());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toastOpen) return;
    const timer = setTimeout(() => setToastOpen(false), 2000);
    return () => clearTimeout(timer);
  }, [toastOpen]);

  function handleNewSettlement() {
    fireHaptic('success');
    navigate('/new');
  }

  function handleCardClick(settlementId: string) {
    navigate('/result', { state: { settlementId } });
  }

  function handleLongPress(settlementId: string) {
    fireHaptic('tickWeak');
    setPendingId(settlementId);
    setSheetOpen(true);
  }

  function handleRequestDelete() {
    setSheetOpen(false);
    setDialogOpen(true);
  }

  function handleConfirmDelete() {
    setDialogOpen(false);
    if (!pendingId) return;
    const result = deleteSettlement(pendingId);
    if (result.ok) {
      setSettlements((prev) => (prev ?? []).filter((s) => s.id !== pendingId));
      fireHaptic('success');
      setToastOpen(true);
    }
    setPendingId(null);
  }

  const newSettlementButton = (
    <Button variant="fill" display="block" onClick={handleNewSettlement}>
      새 정산 시작
    </Button>
  );

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>정산 내역</Top.TitleParagraph>} />}>
      {settlements === null ? (
        <LoadingState rows={3} />
      ) : settlements.length === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="iconReceiptRegular" alt="정산 내역 없음" style={{ width: 48, height: 48 }} />}
          title="아직 정산 내역이 없어요"
          description="첫 정산을 시작해 보세요"
          action={
            <Button variant="weak" display="block" onClick={handleNewSettlement}>
              새 정산 시작
            </Button>
          }
        />
      ) : (
        <>
          {settlements.map((settlement) => {
            const total = settlement.items.reduce((sum, item) => sum + item.amount, 0);
            return (
              <ListRow
                key={settlement.id}
                data-testid={`settlement-card-${settlement.id}`}
                onClick={() => handleCardClick(settlement.id)}
                onContextMenu={(e: React.MouseEvent) => {
                  e.preventDefault();
                  handleLongPress(settlement.id);
                }}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={settlement.title}
                    bottom={`참여자 ${settlement.participants.length}명`}
                  />
                }
                right={<Paragraph.Text typography="t3">{formatKRW(total)}원</Paragraph.Text>}
              />
            );
          })}
          <Spacing size={24} />
          {newSettlementButton}
        </>
      )}

      <BottomSheet
        open={sheetOpen}
        onDimmerClick={() => setSheetOpen(false)}
        header={<BottomSheet.Header>정산 관리</BottomSheet.Header>}
      >
        <Button variant="weak" display="block" onClick={handleRequestDelete}>
          삭제
        </Button>
      </BottomSheet>

      <AlertDialog
        open={dialogOpen}
        title="삭제할까요?"
        description="삭제하면 되돌릴 수 없어요"
        alertButton={
          <AlertDialog.AlertButton onClick={handleConfirmDelete}>삭제</AlertDialog.AlertButton>
        }
        onClose={() => setDialogOpen(false)}
      />

      <Toast open={toastOpen} text="삭제되었어요" position="bottom" onClose={() => setToastOpen(false)} />
    </ScreenScaffold>
  );
}
