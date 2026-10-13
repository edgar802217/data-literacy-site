/* 換頁轉場：用瀏覽器的 View Transitions。不支援或使用者開啟「減少動態」時直接切換。 */
import { flushSync } from "react-dom";
import { reduced } from "../home/sea";

type Doc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
export const canVT = () => typeof (document as Doc).startViewTransition === "function" && !reduced();

/** 最近一次進入的場次詳情；回到列表時，這一列的日期與標題會從詳情頁飛回來 */
export const lastDetail = { id: null as string | null };

/** 清掉暫時設定在列表上的轉場名稱，避免同名衝突 */
export function clearNames() {
  document.querySelectorAll<HTMLElement>("[data-vt]").forEach(el => { el.style.viewTransitionName = ""; });
}

/** 把一次畫面更新包進轉場；from 是被點的場次列（讓日期與標題飛到新頁） */
export function vt(update: () => void, from?: Element | null) {
  if (!canVT()) { update(); return; }
  clearNames();
  const row = from?.closest("[data-vt-row]");
  if (row) {
    row.querySelector<HTMLElement>('[data-vt="date"]')?.style.setProperty("view-transition-name", "vt-date");
    row.querySelector<HTMLElement>('[data-vt="title"]')?.style.setProperty("view-transition-name", "vt-title");
  }
  (document as Doc).startViewTransition!(() => flushSync(update)).finished.finally(clearNames);
}
