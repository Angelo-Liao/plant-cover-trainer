// Verify the public deployment, including the downloadable offline archive.
const base = new URL(process.argv[2]);
if (base.protocol !== 'https:') throw new Error('Expected the HTTPS Pages deployment URL.');
for (let attempt = 1; attempt <= 8; attempt++) {
  try {
    const page = await fetch(base, { signal: AbortSignal.timeout(15000) });
    if (!page.ok) throw new Error(`Page returned HTTP ${page.status}`);
    const html = await page.text();
    if (!html.includes('植被尺｜植物覆蓋度判讀訓練') || !html.includes('id="plot"')) throw new Error('Unexpected deployment content.');
    if (/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html)) throw new Error('Deployment is not the standalone build.');
    const zip = await fetch(new URL('plant-cover-trainer-offline.zip', base), { signal: AbortSignal.timeout(15000) });
    if (!zip.ok) throw new Error(`Offline download returned HTTP ${zip.status}`);
    const bytes = new Uint8Array(await zip.arrayBuffer());
    if (bytes.length < 1000 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4) throw new Error('Offline download is not a ZIP archive.');
    console.log(`Public website and offline ZIP verified: ${base.href}`);
    break;
  } catch (error) {
    if (attempt === 8) throw error;
    console.log(`Waiting for Pages publication (${attempt}/8): ${error.message}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
