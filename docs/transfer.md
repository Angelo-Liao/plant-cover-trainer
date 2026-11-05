# 將完整專案移轉到新的 GitHub Repository

更新：原始碼現已移轉至 `Angelo-Liao/plant-cover-trainer`。若你是這個 repository 的擁有者，不必再執行以下推送步驟；接下來只需設定 Settings → Pages → GitHub Actions。以下保留作為備份還原或將來搬往其他 repository 的說明。

這個網站是獨立專案，不依賴原先 Cloud Environment 連結的 repository。交付時，本機 `/workspace/plant-cover-trainer` 沒有設定 Git remote，也未推送到任何 GitHub repository。

所有現有工作檔案會保留。以下指令由專案擁有者在確認新的 repository 可以接收程式碼後執行；不會自動操作原先連結的 repository。

## 完整專案 ZIP 內容

`plant-cover-trainer-project.zip` 解壓後會有 `plant-cover-trainer/`：

- README、MIT 授權、完整 TypeScript 原始碼與樣式。
- 單元測試、瀏覽器測試、GitHub Actions／Pages／Release 設定。
- `dist/index.html`：已建置、所有資源內嵌的網站。
- `dist/plant-cover-trainer-offline.zip`：供一般使用者下載的離線版。
- `artifacts/`：本次瀏覽器驗證的桌面、進階外觀與手機截圖。
- `git-history.bundle`：獨立專案的完整本機 Git 歷史；不含原 repository 的歷史。
- `EXPORT-MANIFEST.txt`：匯出版本、檔案清單及 SHA-256。

匯出包不包含 `node_modules`、帳號憑證或原 repository 的 `.git`。`dist/` 與截圖不需要提交至新 repository；部署時由工作流程重新建置。

## 方法一：直接從目前 Cloud 工作目錄移轉

先在 GitHub 建立**空白的公開 repository**，不要預先加入 README、授權或 `.gitignore`。在有 GitHub 連線及推送權限的環境執行：

```sh
cd /workspace/plant-cover-trainer
git status
git log -1 --oneline
git remote -v
# 確認沒有指向舊 repository 的 remote，再設定新網址。
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_NEW_REPO.git
git push -u origin main
```

將 `YOUR_ACCOUNT` 和 `YOUR_NEW_REPO` 換成實際值。若已存在 `origin`，先檢查它的網址；確認要改成新 repository 後，使用 `git remote set-url origin 新網址`。

若新 repository 不是空的，先停止並處理既有內容，不使用 `--force` 覆寫。

## 方法二：下載到自己的電腦，保留 Git 歷史

解壓完整專案包後，在其上層目錄執行：

```sh
git clone plant-cover-trainer/git-history.bundle plant-cover-trainer-migrated
cd plant-cover-trainer-migrated
# bundle clone 的 origin 是本機檔案，明確改為新 GitHub repository。
git remote set-url origin https://github.com/YOUR_ACCOUNT/YOUR_NEW_REPO.git
git remote -v
git push -u origin main
```

clone 會還原所有已提交的原始碼、文件、測試及部署設定。已建置的 `dist/` 與截圖仍保留在原解壓目錄，可直接使用或複製；它們不在 Git 歷史中。

若不需保留歷史，也可以直接在解壓的 `plant-cover-trainer/` 內執行 `git init -b main`，提交來源檔案後推送至新的空白 repository。不要提交 `git-history.bundle`、匯出清單、`dist/` 或截圖。

## 更換對外連結

現有文件中的 `Angelo-Liao/plant-cover-trainer` 和 `angelo-liao.github.io/plant-cover-trainer` 是規劃時的預定位置，尚未發布。若新的位置不同，更新：

1. README 的線上使用、離線 ZIP、Release 連結與啟用 Pages 指令。
2. `index.html` 頁尾的原始碼連結。
3. `scripts/build.mjs` 內產生的離線說明連結。

重新建置後，新的連結會進入單一 HTML 和離線 ZIP。不要只修改 `dist/index.html`，否則下次建置會被覆蓋。

## 新 Repository 的驗證與發布

```sh
npm install
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium firefox webkit
BROWSERS=chromium,firefox,webkit npm run test:browser
```

到新的 repository 的 **Settings → Pages → Source** 選 **GitHub Actions**，再執行 **Actions → Publish GitHub Pages → Run workflow**。首次推送會觸發工作流程；如果當時尚未啟用 Pages，啟用後重跑即可。

確認線上網站、子路徑及下載 ZIP 都正常後，再移除 README 的未發布提示，並更新 `docs/verification.md`。若要發布正式版本，建立並推送 `v0.1.0` 標籤，Release 工作流程會產生離線附件。

在確認新 repository 收到程式碼、工作流程通過，而且 ZIP 可取回前，保留原工作目錄與匯出包。
