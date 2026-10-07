/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** 分析平台網址；空白時「進入平台」只停在示範跳轉頁 */
  readonly VITE_ANALYTICS_URL?: string;
  /** 設為 1 時改用記憶體路由（給不能改網址的預覽環境） */
  readonly VITE_MEMORY_ROUTER?: string;
}
