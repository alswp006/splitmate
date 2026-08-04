import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { Top, TextField, Paragraph, Button, Chip, Spacing } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { SummaryHero } from "@/components/SummaryHero";
import { Amount } from "@/components/Amount";
import { formatKRW, parseKRW } from "@/lib/format";
import type { RouteState, SettlementItem } from "@/lib/types";

const LABEL_MAX = 20;

function fireHaptic(type: "success" | "tickWeak" | "tickMedium") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function createItemId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `i-${Math.random().toString(36).slice(2)}`;
}

export default function Items() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as RouteState["/new/items"] | null) ?? null;
  console.log("ITEMS-INTERNAL:", JSON.stringify(location.state), "path=", location.pathname);

  const [items, setItems] = useState<SettlementItem[]>([]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  if (!state?.title || !state.participants) {
    return <Navigate to="/" replace />;
  }

  const { title, participants } = state;
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  const toggleParticipant = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    fireHaptic("tickWeak");
  };

  const handleAmountChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    setAmount(digits ? formatKRW(Number(digits)) : "");
  };

  const handleAddItem = () => {
    const parsedAmount = parseKRW(amount);
    if (parsedAmount <= 0) {
      setError("금액을 1원 이상 입력해주세요");
      return;
    }
    if (selectedIds.size === 0) {
      setError("이 항목을 나눌 참여자를 선택해주세요");
      return;
    }

    const newItem: SettlementItem = {
      id: createItemId(),
      label: label.trim(),
      amount: parsedAmount,
      participantIds: Array.from(selectedIds),
    };
    setItems((prev) => [...prev, newItem]);
    setLabel("");
    setAmount("");
    setSelectedIds(new Set());
    setError("");
    fireHaptic("success");
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    fireHaptic("tickMedium");
  };

  const handleNext = () => {
    navigate("/new/split", {
      state: { title, participants, items } satisfies RouteState["/new/split"],
    });
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>항목 입력</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="다음" onClick={handleNext} />}
    >
      <SummaryHero
        label="현재 총합"
        value={<Amount value={total} unit="원" typography="t1" testId="items-total" />}
        caption={`항목 ${items.length}개`}
      />
      <Spacing size={20} />
      <TextField
        variant="box"
        label="항목 이름"
        placeholder="항목 이름을 입력해 주세요"
        value={label}
        maxLength={LABEL_MAX}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Spacing size={12} />
      <TextField
        variant="box"
        label="금액"
        placeholder="금액을 입력해 주세요"
        inputMode="numeric"
        value={amount}
        onChange={(e) => handleAmountChange(e.target.value)}
      />
      <Spacing size={12} />
      <Paragraph.Text typography="st11">이 항목을 나눌 참여자</Paragraph.Text>
      <Spacing size={8} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {participants.map((p) => {
          const isSelected = selectedIds.has(p.id);
          return (
            <Chip
              key={p.id}
              data-testid={`item-participant-chip-${p.name}`}
              aria-pressed={isSelected}
              style={{
                border: isSelected
                  ? "1.5px solid var(--adaptiveBlue500)"
                  : "1px solid var(--adaptiveGrey200)",
                color: isSelected ? "var(--adaptiveBlue500)" : "var(--adaptiveGrey700)",
              }}
              onClick={() => toggleParticipant(p.id)}
            >
              {p.name}
            </Chip>
          );
        })}
      </div>
      {error && (
        <>
          <Spacing size={8} />
          <Paragraph.Text typography="st13">{error}</Paragraph.Text>
        </>
      )}
      <Spacing size={12} />
      <Button variant="weak" size="medium" display="block" onClick={handleAddItem}>
        항목 추가
      </Button>
      <Spacing size={24} />
      {items.length === 0 ? (
        <Paragraph.Text typography="st13">항목이 없으면 총액을 똑같이 나눠요</Paragraph.Text>
      ) : (
        items.map((item) => (
          <div key={item.id} data-testid={`item-row-${item.label}`}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <Paragraph.Text typography="t5">{item.label}</Paragraph.Text>
                <Paragraph.Text typography="st13">{`${formatKRW(item.amount)}원`}</Paragraph.Text>
              </div>
              <Button
                variant="weak"
                size="medium"
                color="danger"
                aria-label={`${item.label} 삭제`}
                onClick={() => handleRemoveItem(item.id)}
              >
                삭제
              </Button>
            </div>
            <Spacing size={12} />
          </div>
        ))
      )}
    </ScreenScaffold>
  );
}
