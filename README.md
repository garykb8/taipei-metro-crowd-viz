# Taipei Metro Crowd Visualization (台北捷運人潮流量視覺化)

這是一個基於台北捷運開放資料 (Open Data) 的互動式流量分析工具。透過高效能的數據預處理與前端分站加載技術，實現了流暢的全路網人潮趨勢觀察。

## ✨ 特色功能
- **全站點覆蓋**：收錄台北捷運全線 122 個車站的完整流量數據。
- **線路分類導覽**：直覺的下拉選單，按捷運線路（板南線、文湖線等）分組，支援轉乘站點切換。
- **雙維度趨勢分析**：
  - **時段趨勢圖**：觀察平日與假日的 24 小時進出站波動。
  - **整月熱點圖 (Heatmap)**：精確掌握整個月中每日各時段的擁擠程度。
- **效能優化 (Performance)**：
  - **串流預處理**：使用 Node.js 串流技術處理 300MB+ 的大型 CSV 檔案。
  - **分站按需加載 (Lazy Loading)**：前端僅載入當前車站數據，極大化降低記憶體佔用與載入時間。

## 🚀 技術棧
- **Frontend**: React, Vite, Recharts, Lucide-React
- **Backend (Preprocessing)**: Node.js (Stream API)
- **Design**: Vanilla CSS (Glassmorphism UI)

## 📦 如何運行

### 1. 數據預處理
如果您有最新的原始 CSV 資料，可以將其放入根目錄並執行預處理腳本。腳本會自動將數據聚合並切分成小的 JSON 檔案存放在 `mrt-dashboard/public/data`。

```bash
node preprocess_all.js
```

### 2. 啟動開發伺服器
進入儀表板目錄並啟動：

```bash
cd mrt-dashboard
npm install
npm run dev
```

## 📊 數據來源
資料來源為 [臺北市政府資料開放平台](https://data.taipei/) 提供的「臺北捷運每日分時各站OD流量統計資料」。

## 🛠️ 部署
本專案為靜態網頁架構，可直接部署於 GitHub Pages, Vercel 或 Netlify。
執行 `npm run build` 後，將 `dist` 資料夾內容上傳即可。
