# 植被尺｜植物覆蓋度判讀訓練

這是一個用於訓練植物地面樣區調查覆蓋度的判識的一個小小的專案，可以直接在瀏覽器運行，也可以下載下來做離線做練習

透過練習用肉眼判讀枝葉的覆蓋比例，讓植物樣區調查者建立較一致的面積直覺。

**[線上使用](https://angelo-liao.github.io/plant-cover-trainer/)** · **[下載離線 ZIP](https://angelo-liao.github.io/plant-cover-trainer/plant-cover-trainer-offline.zip)** · **[版本下載](https://github.com/Angelo-Liao/plant-cover-trainer/releases/latest)**

> 發布狀態：網站連結需在 Settings → Pages 選擇 GitHub Actions，並成功部署後才會可用；本機可直接使用建置後的 `dist/index.html`。維護者確認首次部署成功後即可移除此提示。

免費、免登入、無後端、無追蹤、無外部字型或 CDN。原始碼與網站皆可放在同一個公開 GitHub repository；MIT 授權，可自由 fork。

此專案已整理為獨立 Git repository。完整匯出包、保留 Git 歷史及移轉至另一個 repository 的步驟，見 [專案移轉說明](docs/transfer.md)。

## 開始使用

1. 觀察正方形樣方。
2. 輸入估計的覆蓋度（0–100%，可有一位小數）。
3. 按「確認答案」，比較實際值與誤差，再練習下一題。

| 模式 | 用途 |
| --- | --- |
| 即時練習 | 每題立即揭曉，設定調整後從下一題套用。 |
| 20 題測驗 | 全部完成後才揭曉；設定鎖定，可逐題回顧。 |
| 自由示範 | 調整已知比例，或在相同比例下換一種分布。 |

可設定一般或低覆蓋度範圍、草本／木本、葉片大小與聚集程度。參考網格、同面積色塊、純剪影對照僅在揭曉後與示範模式提供。

### 進階外觀

所有進階效果預設關閉，且可分別開啟。

- **顏色：**綠葉、枯葉、混合；搭配淺土色、深土色或天空背景。
- **紋理：**葉脈、葉面斑駁與背景細碎紋理，分低／中／高。
- **陰影：**固定光源的枝葉層次與投影，分低／中／高；背景上的投影不計入覆蓋度。
- **植物立體感：**葉片傾斜、捲曲的形狀近似與遮擋層次，分低／中／高；使用正交投影，不會斜看整個樣方，也不使用遠小近大的透視縮放。

立體感以程序幾何近似，並非真實植物的三維生長或物理光照模擬。顏色、紋理與陰影不改變標準答案；立體感改變投影幾何後重新校準面積。

## 覆蓋度如何計算

**覆蓋度 = 樣方內葉片及枝幹的正射投影聯集面積 ÷ 樣方面積 × 100%。**

- 重疊只算一次；超出框外的部分不算。
- 枝葉間的空隙不算；背景上的陰影不算。
- 不是沿整個樹冠外緣圈出的面積，也不是魚眼照片的天空遮蔽率。
- 0% 與 100% 是空白／全滿的邊界示範，不額外偽造枝葉細節。

生成器先建立植物幾何，使用固定 **1024×1024 二元覆蓋遮罩**做像素中心採樣及聯集運算。圖形尺度以單調二分搜尋校準，與目標誤差須 **小於 0.05 個百分點**；標準答案取自實際遮罩，不直接使用目標值。若校準失敗，介面要求重新出題，不以未達精度的題目評分。最終植物的透明度也由同一遮罩決定，裝飾另行渲染。

參考比例與答案顯示到 0.1%；評分保留內部精度，因此由畫面上四捨五入的數字手算，可能有末位差異。解析度加倍的抽查是數值驗證，不代表對所有可能幾何具有解析面積的數學誤差保證。

草本為細長葉叢，木本為分枝葉群。高覆蓋度可因尺度校準而產生較大的重疊；它訓練面積判讀，而非植物物種或真實冠層結構辨識。極細枝葉在小螢幕上可能縮小至次像素，建議使用較大螢幕進行嚴格比較，並保持相同裝置與外觀設定。

## 如何解讀誤差

3% 估成 5%，代表：

- 高估 **2 個百分點**。
- 相對誤差約 **66.7%**（絕對誤差除以實際覆蓋度）。

實際值為零時，相對誤差不適用。測驗顯示平均絕對誤差、平均高估／低估，以及實際覆蓋度 ≤10% 題目的表現；不設無實證依據的合格門檻。一般題組在指定範圍內分 20 層抽樣後打亂，範圍可固定在單一比例。

這是視覺訓練工具。是否改善現場調查者的一致性，須另外使用現場資料與研究設計驗證。

## 離線與資料

下載 `plant-cover-trainer-offline.zip`，解壓後雙擊 `index.html`。不需 Node.js、Python、網路或登入；整個應用的程式與樣式皆內嵌於 HTML。

設定與最近 20 次完整測驗保存在目前瀏覽器的 `localStorage`，不會上傳。換瀏覽器、清除網站資料或移動離線檔案，都可能使紀錄不再可見。部分瀏覽器不允許 `file://` 儲存，屆時會顯示提示，當次訓練仍可完成。測驗中途離開不會保存未完成的結果。

## 本機開發

需 Node.js **22.18+**（建議 24）及 Python 3（只在建置 ZIP 時使用）。一般開發：

```sh
npm install
npm run dev
```

驗證與建置：

```sh
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium firefox webkit
BROWSERS=chromium,firefox,webkit npm run test:browser
```

`npm run build` 先執行 Vite 建置，再產生可直接開啟的 `dist/index.html` 與 ZIP。`dist-vite/` 是 Vite 的中間產物；實際部署使用 `dist/`。

若當下無法下載 npm 套件，核心單元測試與獨立建置不依賴套件：

```sh
node --test tests/*.test.mjs
node scripts/build.mjs
```

這條替代路徑利用 Node 內建 TypeScript 語法移除器，**不等於 TypeScript 型別檢查或 Vite 驗證**。正常 CI 仍執行兩者。

### 程式結構

- `src/geometry.ts`：可重現的植物幾何與正交投影近似。
- `src/coverage.ts`：掃描線遮罩、聯集面積、覆蓋度校準。
- `src/render.ts`：顏色、紋理、陰影與輔助圖層。
- `src/scoring.ts`、`src/storage.ts`：輸入、評分、可失敗的本機儲存。
- `src/main.ts`：練習、測驗、示範的互動與狀態。
- `scripts/build.mjs`：遞迴合併本地模組為單一離線 HTML；新增模組時使用具名匯出及單行本地 import，避免跨模組頂層同名宣告。

生成器版本、種子、目標、實際面積、作答值與整場設定保存在測驗資料中。變更幾何或校準行為時，更新 `VERSION` 並驗證種子重現的相容性；不可用新版本重新評分舊結果。

## 建立 repository、啟用 Pages 與 fork

網站沒有付費服務需求，使用 GitHub 免費方案的公開 repository 與其 Pages／Actions 額度即可。

若尚未建立 repository，可使用以下指令（需具有建立 repository 與啟用 Pages 的 GitHub 權限）；repository 已存在時，直接使用下方的 Settings → Pages 設定即可：

```sh
gh auth login
gh repo create plant-cover-trainer --public --source=. --remote=origin --push
gh api --method POST repos/Angelo-Liao/plant-cover-trainer/pages -f build_type=workflow
```

也可到 repository 的 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**，接著在 **Actions → Publish GitHub Pages → Run workflow** 執行。新 repository 尚未啟用 Pages 時，首次部署可能失敗；啟用後重跑即可。

正常推送 `main` 會在檢查通過後發布網站；`Check` 工作流程另外涵蓋 Chromium、Firefox、WebKit。WebKit 測試可提供 Safari 引擎相容性的參考，但不等於在所有 Apple 裝置上的 Safari 人工驗收。

建立版本下載：

```sh
git tag v0.1.0
git push origin v0.1.0
```

`Publish offline release` 會在驗證後建立 GitHub Release，附上離線 ZIP。

**Fork 後：**啟用 Actions 與 Pages，將 README、頁尾及離線說明中的 `Angelo-Liao/plant-cover-trainer` 改成自己的帳號與 repository 名稱。所有本機資源皆內嵌或使用相對路徑，支援 Pages 的 repository 子路徑。網站網址為 `https://你的帳號.github.io/你的-repository/`。

## 驗證範圍與授權

測試涵蓋面積、重疊／裁切、稀疏／密集題目、解析度抽查、外觀不改變答案、作答驗證、評分、紀錄、三種模式、測驗答案隱藏、手機排版與真正的 `file://` 離線操作。當次實際執行結果見 [驗證紀錄](docs/verification.md)。

採 [MIT License](LICENSE)。程序生成植物與紋理，不使用外部圖片。介面設計參考 [Anthropic Frontend Design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) 的主題導向與減少無用裝飾原則。
