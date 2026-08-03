import { useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { PersonShare, ResultData } from "@/lib/types";

const DRAFT_STORAGE_KEY = "splitmate:home-draft";

interface Draft {
  amount: string;
  names: string;
}

function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return { amount: "", names: "" };
    const parsed = JSON.parse(raw);
    return {
      amount: typeof parsed.amount === "string" ? parsed.amount : "",
      names: typeof parsed.names === "string" ? parsed.names : "",
    };
  } catch {
    return { amount: "", names: "" };
  }
}

function saveDraft(draft: Draft) {
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // 임시 저장 실패해도 계산 자체는 계속 진행
  }
}

export default function Home() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState(() => loadDraft().amount);
  const [names, setNames] = useState(() => loadDraft().names);
  const [error, setError] = useState("");

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
    const next = digitsOnly ? Number(digitsOnly).toLocaleString() : "";
    setAmount(next);
    setError("");
    saveDraft({ amount: next, names });
  };

  const handleNamesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setNames(next);
    setError("");
    saveDraft({ amount, names: next });
  };

  const handleSubmit = () => {
    const totalAmount = Number(amount.replace(/,/g, ""));
    const nameList = names
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    if (!totalAmount || totalAmount <= 0) {
      setError("금액을 입력해 주세요");
      return;
    }
    if (nameList.length === 0) {
      setError("정산할 사람 이름을 입력해 주세요");
      return;
    }

    const share = Math.floor(totalAmount / nameList.length);
    const perPerson: PersonShare[] = nameList.map((name) => ({
      name,
      amount: share,
    }));
    const result: ResultData = { totalAmount, perPerson };

    navigate("/result", { state: { result } });
  };

  return (
    <div style={{ padding: "16px" }}>
      <h1>더치페이 계산</h1>
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: "#4e5968" }}>
          총 금액
        </p>
        <input
          placeholder="예: 96,000"
          value={amount}
          onChange={handleAmountChange}
          inputMode="numeric"
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: "#4e5968" }}>
          정산할 사람 (쉼표로 구분)
        </p>
        <input
          placeholder="예: 민지, 서준, 하은"
          value={names}
          onChange={handleNamesChange}
        />
      </div>
      {error && <p style={{ color: "#e5484d" }}>{error}</p>}
      <button onClick={handleSubmit}>정산 계산하기</button>
    </div>
  );
}
