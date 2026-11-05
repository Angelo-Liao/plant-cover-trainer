# 初版驗證紀錄

驗證日期：2026-11-05（Asia/Taipei）。

## 移轉後的最新狀態

- 程式碼已移轉至 `Angelo-Liao/plant-cover-trainer`，保留擁有者原本的 README 簡介、MIT 授權與初始提交。
- GitHub Actions 已實際通過依賴安裝、TypeScript 型別檢查、10 組單元測試與 Vite／單檔建置。這些項目不再受原 Cloud 工作環境的 npm 連線限制。
- 首輪瀏覽器安裝因 `ubuntu-latest` 指向尚不受指定 Playwright 版本支援的 Ubuntu 26.04 而失敗。工作流程改為明確指定 Ubuntu 24.04，重新驗證瀏覽器案例。
- Pages 仍須在 repository 的 Settings → Pages 選擇 GitHub Actions；網站可用狀態以部署工作流程結果為準。
- 以下為初次匯出時的環境紀錄，保留以區分本機測試與之後的 GitHub CI 結果。

## 已執行且通過

- `node --test tests/*.test.mjs`：10 組測試全部通過，約 7 秒。
- 面積案例涵蓋空白、全滿、已知矩形／三角形、重疊聯集、框外裁切，以及草本／木本的 0.1%、1%、3%、5%、25%、95%、99.9%。
- 24 組不同種子、葉片大小、聚集程度與立體感的校準案例，皆低於 0.05 個百分點的目標誤差。
- 四組 1024→2048 解析度抽查，面積差皆低於 0.05 個百分點。
- 顏色／紋理／陰影的設定不改變幾何、遮罩或實際覆蓋度；立體感會改變幾何並重新校準。
- 非同步校準與同步結果相同，且支援取消，避免過期生成覆蓋新題目。
- 分層抽樣、數字驗證、相對誤差零分母、正負偏差、損壞／不可用儲存、最近 20 次紀錄上限。
- `node scripts/build.mjs`：成功建立約 60 KiB 的單一 HTML、授權與離線 ZIP；ZIP 完整性驗證通過。HTML 無外部程式或樣式依賴。
- Chromium 的 HTTP 子路徑瀏覽器驗收通過：練習、示範、完整 20 題測驗、答案隱藏、設定鎖定、重複提交保護、逐題回顧、重新載入後保留紀錄、模式切換確認、手機排版、視窗縮放不改變題圖、對話框與儲存遭拒後仍能作答。
- 檢視桌面、進階外觀與 390px 手機寬度截圖，沒有水平溢出，手機設定預設收合。

本環境使用預裝 Chromium 和 Playwright 執行瀏覽器測試；預設的 `npm run test:browser` 使用專案依賴。

## 尚未驗證／尚未發布

- **直接開啟離線 HTML：**曾嘗試在關閉網路的瀏覽器情境載入 `file://`，但執行環境的 Chromium 管理政策回傳 `ERR_BLOCKED_BY_ADMINISTRATOR`。沒有繞過該限制。後續本機驗收明確設定 `SKIP_FILE_TEST=1`，只跳過這項測試，不能將它視為已通過。
- **Firefox 與 WebKit／Safari：**本環境沒有可用引擎，尚未執行。CI 已設定 Chromium、Firefox、WebKit；WebKit 自動測試不等於真實 Safari 裝置測試。
- **TypeScript 型別檢查及 Vite 正常建置：**npm registry 連線遭環境拒絕，無法安裝依賴。已驗證的是 Node 原生 TypeScript 語法移除建置及實際執行，並非 `tsc`／Vite。CI 明確要求兩者通過。
- **GitHub repository／Pages／Release：**連接工具可確認 GitHub 使用者為 `Angelo-Liao`，但沒有建立 repository 或啟用 Pages 的介面；命令列 GitHub API 連線遭環境拒絕。新 repository 尚未在 GitHub 建立，Pages、Release 與正式連結尚未驗證。

專案擁有者隨後明確指定：由本人另行建立新 repository，再處理移轉與發布。因此本次交付以獨立專案、完整匯出包及移轉指引為準；不操作原先 Cloud Environment 連結的 repository，也不代為推送或發布。

## 完成發布後應執行

1. 執行 `npm install`、`npm run typecheck`、`npm test`、`npm run build`。
2. 安裝三個瀏覽器引擎，執行 `BROWSERS=chromium,firefox,webkit npm run test:browser`，不可設定 `SKIP_FILE_TEST`。
3. 在至少一台真實手機的 Safari 或 Chrome 上確認互動與高密度題目反應。
4. 建立公開 repository、啟用 Pages，確認 Pages 工作流程成功。
5. 開啟正式 Pages 網址，從正式網站下載 ZIP，解壓並斷網驗證。
6. 推送版本標籤並確認 Release 附件。更新本紀錄，移除 README 的未發布提示。
