import { useRef, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { Top, TextField, Paragraph, Chip, Spacing } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { calculateSplit } from "@/lib/calc";
import { saveSettlement } from "@/lib/storage";
import { formatKRW } from "@/lib/format";
import type { RouteState, Settlement, SplitMode } from "@/lib/types";

const MODES: { mode: SplitMode; label: string }[] = [
  { mode: "even", label: "균등" },
  { mode: "ratio", label: "비율" },
  { mode: "fixed", label: "고정" },
  { mode: "excluded", label: "제외" },
];

interface Rule {
  mode: SplitMode;
  value: number;
}

const DEFAULT_RULE: Rule = { mode: "even", value: 0 };

function fireHaptic(type: "success" | "tickWeak") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function createSettlementId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s-${Math.random().toString(36).slice(2)}`;
}

function describeRule(rule: Rule): string {
  switch (rule.mode) {
    case "even":
      return "균등하게 나눠요";
    case "ratio":
      return rule.value > 0 ? `비율 ${rule.value}로 나눠요` : "비율을 입력해 주세요";
    case "fixed":
      return rule.value > 0 ? `${formatKRW(rule.value)}원 고정` : "금액을 입력해 주세요";
    case "excluded":
      return "정산에서 제외돼요";
  }
}

export default function Split() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as RouteState["/new/split"] | null) ?? null;

  const [rules, setRules] = useState<Record<string, Rule>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  if (!state?.title || !state.participants || !state.items) {
    return <Navigate to="/" replace />;
  }

  const { title, participants, items } = state;
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  const getRule = (id: string): Rule => rules[id] ?? DEFAULT_RULE;

  const handleModeSelect = (id: string, mode: SplitMode) => {
    setRules((prev) => ({ ...prev, [id]: { mode, value: 0 } }));
    fireHaptic("tickWeak");
  };

  const handleValueChange = (id: string, raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    setRules((prev) => ({
      ...prev,
      [id]: { mode: getRule(id).mode, value: digits ? Number(digits) : 0 },
    }));
  };

  const handleResult = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    const calcResult = calculateSplit({
      total,
      participants: participants.map((p) => {
        const rule = getRule(p.id);
        return {
          id: p.id,
          name: p.name,
          mode: rule.mode,
          amount: rule.mode === "ratio" || rule.mode === "fixed" ? rule.value : undefined,
        };
      }),
    });

    if (!calcResult.ok) {
      setError(calcResult.error);
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    const now = Date.now();
    const settlement: Settlement = {
      id: createSettlementId(),
      title,
      participants,
      items,
      splitRules: participants.map((p) => {
        const rule = getRule(p.id);
        return { participantId: p.id, mode: rule.mode, value: rule.value };
      }),
      createdAt: now,
      updatedAt: now,
    };

    const saveResult = saveSettlement(settlement);
    if (!saveResult.ok) {
      setError(saveResult.error);
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    fireHaptic("success");
    navigate("/result", {
      state: { settlementId: settlement.id } satisfies RouteState["/result"],
    });
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>분할 설정</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="결과 보기" onClick={handleResult} disabled={submitting} />}
    >
      {participants.map((p) => {
        const rule = getRule(p.id);
        const showValueInput = rule.mode === "ratio" || rule.mode === "fixed";
        return (
          <div key={p.id} data-testid={`split-participant-row-${p.name}`}>
            <Paragraph.Text typography="t5">{p.name}</Paragraph.Text>
            <Spacing size={4} />
            <Paragraph.Text typography="st13">{describeRule(rule)}</Paragraph.Text>
            <Spacing size={8} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {MODES.map((m) => (
                <Chip
                  key={m.mode}
                  data-testid={`split-mode-chip-${p.name}-${m.mode}`}
                  aria-pressed={rule.mode === m.mode}
                  style={{
                    minHeight: 44,
                    minWidth: 44,
                    border:
                      rule.mode === m.mode
                        ? "1.5px solid var(--adaptiveBlue500)"
                        : "1px solid var(--adaptiveGrey200)",
                    color: rule.mode === m.mode ? "var(--adaptiveBlue500)" : "var(--adaptiveGrey700)",
                  }}
                  onClick={() => handleModeSelect(p.id, m.mode)}
                >
                  {m.label}
                </Chip>
              ))}
            </div>
            {showValueInput && (
              <>
                <Spacing size={8} />
                <TextField
                  variant="box"
                  inputMode="numeric"
                  label={rule.mode === "ratio" ? "비율" : "고정 금액"}
                  placeholder={rule.mode === "ratio" ? "숫자를 입력해 주세요" : "금액을 입력해 주세요"}
                  data-testid={`split-value-input-${p.name}`}
                  value={rule.value ? String(rule.value) : ""}
                  onChange={(e) => handleValueChange(p.id, e.target.value)}
                />
              </>
            )}
            <Spacing size={20} />
          </div>
        );
      })}
      {error && (
        <>
          <Paragraph.Text typography="st13">{error}</Paragraph.Text>
          <Spacing size={12} />
        </>
      )}
    </ScreenScaffold>
  );
}
