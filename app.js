// ============================================================
// 起動時：GASからデータ取得
// ============================================================
window.addEventListener('load', async () => {
  // 通路グラフ構築（即時）
  CORRIDOR_GRAPH = buildCorridorGraph();
  console.log('✅ 通路グラフ構築: ノード'+CORRIDOR_GRAPH.nodes.length+'個, エッジ'+CORRIDOR_GRAPH.edges.length+'本');

  // ローディング表示
  document.getElementById('screen').innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#fafaf8">
      <div style="width:50px;height:50px;border:4px solid #e8e7e1;border-top-color:#0F6E56;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:16px"></div>
      <div style="color:#73726c;font-size:14px">${tr('loading')}</div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>`;

  // 会場SVG読込（並行）
  const svgPromise = fetch('venue_map.svg')
    .then(r => r.ok ? r.text() : '')
    .then(svgText => {
      const m = svgText.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
      if(m) {
        VENUE_SVG_INNER = m[1];
        console.log('✅ 会場SVG読込完了');
      }
    })
    .catch(e => console.warn('会場SVG読込失敗:', e.message));

  // GASからデータ取得（完了を待つ・10秒タイムアウト）
  let gasOK = false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const [prodRes, semRes, docRes] = await Promise.all([
      fetch(GAS_URL + '?action=products', {signal: ctrl.signal}),
      fetch(GAS_URL + '?action=seminar',  {signal: ctrl.signal}),
      fetch(GAS_URL + '?action=aidoc',    {signal: ctrl.signal}).catch(() => null),
    ]);
    clearTimeout(timer);
    const prodData = await prodRes.json();
    const semData  = await semRes.json();
    if (prodData.products && prodData.products.length > 0) {
      P = prodData.products;
      gasOK = true;
      console.log('✅ GASデータ取得完了: ' + P.length + '社');
    }
    if (semData.seminars && semData.seminars.length > 0) {
      SEMINARS = semData.seminars;
    }
    // AI補助資料（失敗してもアプリは動作する）
    try {
      if (docRes) {
        const docData = await docRes.json();
        if (docData.items && docData.items.length > 0) {
          AI_DOC = docData.items;
          console.log('✅ AI補助資料取得: ' + AI_DOC.length + '件');
        }
      }
    } catch(e) { console.warn('AI補助資料取得失敗:', e.message); }
  } catch (e) {
    console.warn('GAS未接続。サンプルデータで動作。', e.message);
  }

  // GAS失敗時のみフォールバック
  if(!gasOK) {
    P = SAMPLE_P;
    SEMINARS = SAMPLE_SEMINARS;
  }

  // SVG読込も待つ
  await svgPromise;

  // Fuse.js初期化
  initFuse();

  // 起動フロー判定
  const params = new URLSearchParams(location.search);

  // ?reset=1 でlocalStorage・sessionStorageをクリアして同意画面から再スタート
  if (params.get('reset') === '1') {
    try { localStorage.clear(); } catch(e){}
    try { sessionStorage.clear(); } catch(e){}
    history.replaceState({}, '', location.pathname + (params.get('dev')==='1' ? '?dev=1' : ''));
    visitorGyotai = '';
    visitorQRCode = '';
    showConsentScreen();
    return;
  }

  // ?mode=reception で受付モード
  RECEPTION_MODE = params.get('mode') === 'reception';
  if (RECEPTION_MODE) {
    document.body.classList.add('reception-mode');
    visitorQRCode = 'reception';
    visitorGyotai = '';
    saveVisitor();
    showReceptionHome();
    return;
  }

  const hasConsent = localStorage.getItem(CONSENT_KEY) === '1';
  if (!hasConsent) {
    showConsentScreen();
  } else if (!visitorQRCode) {
    showQRScreen();
  } else {
    showHome();
  }
});
