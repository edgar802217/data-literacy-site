/* 後端 API。正式模式（VITE_MODE=live）時所有資料走 /api；示範模式（預設）用瀏覽器裡的示範資料。 */
export const LIVE = import.meta.env.VITE_MODE === "live";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** 呼叫後端；錯誤時丟出 ApiError，訊息可以直接顯示給使用者 */
export async function api<T = unknown>(path: string, opt: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api" + path, {
      method: opt.method || "GET",
      credentials: "same-origin",
      headers: { "X-Requested-With": "fetch", ...(opt.body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: opt.body !== undefined ? JSON.stringify(opt.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "連不上伺服器，請稍後再試");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = (data as { detail?: unknown }).detail;
    const msg = typeof d === "string" ? d : Array.isArray(d) ? "資料格式不正確，請檢查必填欄位" : `發生錯誤（${res.status}）`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

/** 密碼規則（和後端一致）：至少 8 碼、含小寫與大寫英文字母、不能有 6 位連續或重複的數字 */
export function passwordProblems(pw: string): string[] {
  const out: string[] = [];
  if (pw.length < 8) out.push("至少 8 個字元");
  if (!/[a-z]/.test(pw)) out.push("至少一個小寫英文字母");
  if (!/[A-Z]/.test(pw)) out.push("至少一個大寫英文字母");
  for (const m of pw.match(/\d{6,}/g) || []) {
    for (let i = 0; i + 6 <= m.length; i++) {
      const d = m.slice(i, i + 6).split("").map(Number);
      const steps = new Set(d.slice(1).map((v, k) => v - d[k]));
      if (steps.size === 1 && [0, 1, -1].includes([...steps][0])) { out.push("不能有 6 位連續或重複的數字（例如 000000、123456）"); return out; }
    }
  }
  return out;
}
