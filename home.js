// ============================================================
// 画面描画
// ============================================================
function showInit() {
  document.getElementById('screen').innerHTML = `
  <div class="screen init-screen">
    <div class="init-logo"><i class="ti ti-search"></i></div>
    <div class="init-txt">${tr('loading')}</div>
  </div>`;
}

function privacyInfoLinkText() {
  if (lang === 'en') return 'Personal Data & AI Use';
  if (lang === 'zh') return '个人信息・AI使用';
  if (lang === 'ko') return '개인정보・AI 이용';
  return '個人情報・AI利用について';
}

function showPrivacyInfo(backFnName) {
  const backFn = backFnName || 'showHome';
  _currentView = function(){ showPrivacyInfo(backFn); };

  document.getElementById('screen').innerHTML = `
  <div class="screen">
    <div class="sub-hd">
      <button class="back-btn" onclick="${backFn}()"><i class="ti ti-arrow-left"></i></button>
      <div class="sub-hd-ttl">${tr('consentAccTitle')}</div>
    </div>

    <div style="padding:18px 18px 28px;font-size:14px;line-height:1.8;color:#333">
      <div style="font-weight:700;font-size:16px;margin-bottom:12px">${tr('consentAccTitle')}</div>
      <p style="margin:0 0 14px">${tr('consentP1')}</p>
      <p style="margin:0 0 14px">${tr('consentP2')}</p>
      <p style="margin:0 0 14px">${tr('consentP3')}</p>
      <p style="margin:0;color:#666;font-size:12px">${tr('consentPrevail')}</p>
    </div>
  </div>`;
}

function showReceptionHome() {
  _currentView = showReceptionHome;
  document.getElementById('screen').innerHTML = `
  <div class="screen">
    <div class="home-hero">
      <h2 style="font-size:26px">ご案内</h2>
      <p style="font-size:15px">商品・出展社をお探しの方はこちら</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px">
      <div class="mm-card" onclick="showBoothSearch()" style="min-height:180px">
        <div class="mm-icon" style="background:#FAEEDA;color:#854F0B;width:72px;height:72px;font-size:36px"><i class="ti ti-search"></i></div>
        <div class="mm-label" style="font-size:18px">ブースを探す</div>
        <div class="mm-sub" style="font-size:13px">商品名・カテゴリから検索</div>
      </div>
      <div class="mm-card" onclick="enterAIConcierge()" style="min-height:180px">
        <div class="mm-icon" style="background:#E6F1FB;color:#185FA5;width:72px;height:72px;font-size:36px"><i class="ti ti-robot"></i></div>
        <div class="mm-label" style="font-size:18px">AIに聞く</div>
        <div class="mm-sub" style="font-size:13px">「〇〇はどこですか？」</div>
      </div>
    </div>
    <div style="padding:0 16px">
      <button onclick="showMapScreen()"
        style="width:100%;padding:16px;background:#fff;border:1.5px solid #0F6E56;color:#0F6E56;border-radius:14px;font-size:16px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
        <i class="ti ti-map" style="font-size:20px"></i> 会場MAPを見る
      </button>
    </div>
    <div style="padding:10px 16px 16px;text-align:center">
      <span onclick="showPrivacyInfo('showReceptionHome')"
        style="font-size:11px;color:#aaa;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent">
        ${privacyInfoLinkText()}
      </span>
    </div>
  </div>`;
}

function showHome() {
  _currentView = showHome;
  const t = T[lang];
  const memoCount = myMemos.length;
  const memoBadge = memoCount > 0 ? `<span class="menu-badge">${memoCount}</span>` : '';

  document.getElementById('screen').innerHTML = `
  <div class="screen">
    <div class="home-hero">
      <h2>${t.welcome}</h2>
      <p>${t.sub}</p>
    </div>
    <div class="main-menu">
      <div class="mm-card" onclick="showBoothSearch()">
        <div class="mm-icon" style="background:#FAEEDA;color:#854F0B"><i class="ti ti-search"></i></div>
        <div class="mm-label">${tr('mBoothLabel')}</div>
        <div class="mm-sub">${tr('mBoothSub')}</div>
      </div>
      <div class="mm-card" onclick="enterAIConcierge()">
        <div class="mm-icon" style="background:#E6F1FB;color:#185FA5"><i class="ti ti-robot"></i></div>
        <div class="mm-label">${tr('mAILabel')}</div>
        <div class="mm-sub">${tr('mAISub')}</div>
      </div>
      <div class="mm-card" onclick="showMyMemo()">
        <div class="mm-icon" style="background:#EEEDFE;color:#534AB7"><i class="ti ti-notebook"></i></div>
        <div class="mm-label">${tr('mMemoLabel')}${memoBadge}</div>
        <div class="mm-sub">${tr('mMemoSub')}</div>
      </div>
      <div class="mm-card" onclick="showSeminars()">
        <div class="mm-icon" style="background:#FBEAF0;color:#993556"><i class="ti ti-presentation"></i></div>
        <div class="mm-label">${tr('mSemLabel')}</div>
        <div class="mm-sub">${tr('mSemSub')}</div>
      </div>
    </div>
    <div style="padding:0 16px 8px">
      <button onclick="showExitReport()" style="width:100%;padding:14px 12px;background:#fff;color:#0F6E56;border:1.5px solid #0F6E56;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;line-height:1.4">
        <span style="font-size:13px;color:#73726c;font-weight:500">${tr('exitTop')}</span>
        <span style="display:flex;align-items:center;gap:6px"><i class="ti ti-clipboard-check"></i> ${tr('exitMain')}</span>
      </button>
    </div>
    <div style="padding:0 16px 16px;text-align:center">
      <span onclick="showPrivacyInfo('showHome')"
        style="font-size:11px;color:#aaa;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent">
        ${privacyInfoLinkText()}
      </span>
    </div>
  </div>`;
}

// 「ブースを探す」（旧トップのカテゴリ一覧）
function showBoothSearch() {
  _currentView = showBoothSearch;
  const t = T[lang];
  const cats = MAIN_CATS.filter(c => !c.isSeminar).map(c => {
    const arr = c.isMachine ? `<span class="cc-arr"><i class="ti ti-chevron-right"></i></span>` : '';
    const cls = c.isMachine ? ' mc' : '';
    const idx = MAIN_CATS.indexOf(c);
    const fn  = c.isMachine  ? `showMachineMenu()`
              : c.excludeBusiness ? `searchCat(${idx})`
              : `search('${c.q}','${escapeJsAttr(catL(c.label))}',null,null,true)`;
    return `<div class="cc${cls}" onclick="${fn}">
      <div class="cc-icon" style="background:${c.bg};color:${c.ic}"><i class="ti ${c.icon}"></i></div>
      <div><div class="cc-label">${catL(c.label)}</div><div class="cc-sub">${catS(c.label, c.sub)}</div></div>
      ${arr}
    </div>`;
  }).join('');

  document.getElementById('screen').innerHTML = `
  <div class="screen">
    <div class="sub-hd">
      <button class="back-btn" onclick="showHome()"><i class="ti ti-arrow-left"></i></button>
      <div class="sub-hd-ttl">${tr('mBoothLabel')}</div>
    </div>
    <div class="cat-grid">${cats}</div>
    <div class="mic-area">
      <button class="mic-big" id="mic" onclick="toggleMic()"><i class="ti ti-microphone"></i></button>
      <div class="mic-lbl">${t.micLbl}</div>
    </div>
    <div class="or-row"><div class="or-line"></div><div class="or-txt">${tr('orText')}</div><div class="or-line"></div></div>
    <div class="txt-row">
      <input class="txt-inp" id="qi" placeholder="${t.ph}" onkeydown="if(event.key==='Enter'){var v=this.value.trim();if(v){search(v,v);this.value=''}}">
      <button class="snd-btn" onclick="var v=document.getElementById('qi');if(v&&v.value.trim()){search(v.value.trim(),v.value.trim());v.value=''}"><i class="ti ti-send" style="font-size:18px"></i></button>
    </div>
  </div>`;
}
