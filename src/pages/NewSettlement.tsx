import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Top, TextField, Paragraph, Button, Chip, Spacing } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import type { Participant, RouteState } from "@/lib/types";

const NAME_MAX = 10;

function fireHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function createParticipantId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `p-${Math.random().toString(36).slice(2)}`;
}

export default function NewSettlement() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [nameError, setNameError] = useState("");

  const addParticipant = () => {
    if (name.length === 0 || name.length > NAME_MAX || name.includes(" ")) {
      setNameError("이름은 1~10자로 입력해주세요");
      return;
    }
    if (participants.some((p) => p.name === name)) {
      setNameError("이미 추가된 이름이에요");
      return;
    }
    setParticipants((prev) => [...prev, { id: createParticipantId(), name }]);
    setName("");
    setNameError("");
    fireHaptic();
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    fireHaptic();
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addParticipant();
    }
  };

  const hasEnoughParticipants = participants.length >= 2;
  const canProceed = hasEnoughParticipants && title.trim().length > 0;

  const handleNext = () => {
    navigate("/new/items", {
      state: { title: title.trim(), participants } satisfies RouteState["/new/items"],
    });
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>정산 정보</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="다음" onClick={handleNext} disabled={!canProceed} />}
    >
      <TextField
        variant="box"
        label="정산 이름"
        placeholder="정산 제목을 입력해 주세요"
        value={title}
        maxLength={20}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Spacing size={24} />
      <Paragraph.Text typography="t4">참여자</Paragraph.Text>
      <Spacing size={12} />
      <TextField
        variant="box"
        label="이름"
        placeholder="이름을 입력해 주세요"
        value={name}
        hasError={!!nameError}
        help={nameError}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleNameKeyDown}
        right={
          <Button variant="weak" size="small" onClick={addParticipant}>
            추가
          </Button>
        }
      />
      <Spacing size={12} />
      {participants.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {participants.map((p) => (
            <Chip
              key={p.id}
              data-testid={`participant-chip-${p.name}`}
              aria-label={`${p.name} 삭제`}
              onClick={() => removeParticipant(p.id)}
            >
              {p.name}
            </Chip>
          ))}
        </div>
      )}
      {!hasEnoughParticipants && (
        <>
          <Spacing size={8} />
          <Paragraph.Text typography="st13">참여자를 2명 이상 추가해주세요</Paragraph.Text>
        </>
      )}
    </ScreenScaffold>
  );
}
