import { Navigate, useLocation } from "react-router-dom";
import { Toast } from "@toss/tds-mobile";
import AdSlot from "@/components/AdSlot";

interface PersonShare {
  name: string;
  amount: number;
}

interface ResultData {
  totalAmount: number;
  perPerson?: PersonShare[] | null;
}

interface ResultRouteState {
  result?: ResultData | null;
}

export default function Result() {
  const location = useLocation();
  const state = location.state as ResultRouteState | null | undefined;

  if (!state?.result) {
    Toast.show("계산 내역을 찾을 수 없어요. 처음부터 다시 시작해주세요");
    return <Navigate to="/" replace />;
  }

  const { totalAmount, perPerson } = state.result;

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <h1>정산 결과</h1>
      <p>총 {totalAmount.toLocaleString()}원</p>
      <ul>
        {(perPerson ?? []).map((person) => (
          <li key={person.name}>
            {person.name}: {person.amount.toLocaleString()}원
          </li>
        ))}
      </ul>
      <AdSlot />
    </div>
  );
}
