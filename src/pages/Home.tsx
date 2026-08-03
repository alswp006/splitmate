import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PersonShare, ResultData } from "@/lib/types";

export default function Home() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [names, setNames] = useState("");
  const [error, setError] = useState("");

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
        <input
          placeholder="예: 96,000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input
          placeholder="예: 민지, 서준, 하은"
          value={names}
          onChange={(e) => setNames(e.target.value)}
        />
      </div>
      {error && <p style={{ color: "#e5484d" }}>{error}</p>}
      <button onClick={handleSubmit}>정산 계산하기</button>
    </div>
  );
}
