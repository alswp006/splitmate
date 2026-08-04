// 정산 결과 이미지 저장 — canvas 네이티브 API만 사용(외부 라이브러리/업로드 없음)

interface ShareRow {
  name: string;
  amount: number;
}

export function downloadResultImage(title: string, rows: ShareRow[]): boolean {
  try {
    const width = 640;
    const rowHeight = 56;
    const headerHeight = 96;
    const height = headerHeight + rows.length * rowHeight + 32;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#191f28";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(title, 24, 48);

    ctx.fillStyle = "#6b7684";
    ctx.font = "16px sans-serif";
    ctx.fillText("정산 결과", 24, 76);

    rows.forEach((row, index) => {
      const y = headerHeight + index * rowHeight + 32;
      ctx.fillStyle = "#191f28";
      ctx.font = "18px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(row.name, 24, y);

      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${row.amount.toLocaleString("ko-KR")}원`, width - 24, y);
    });

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${title}-정산결과.png`;
    link.click();
    return true;
  } catch {
    return false;
  }
}
