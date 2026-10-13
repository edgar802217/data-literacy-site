import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 本機開發時把 /api 轉到本機後端（api/，uvicorn 預設 8000）；正式環境由 vercel.json 轉到 Render
const proxy = { "/api": { target: process.env.API_TARGET || "http://localhost:8000", changeOrigin: false } };

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
});
