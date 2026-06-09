function showMyMemo() {
  _currentView = showMyMemo;
  const list = myMemos.slice().sort((a,b) => b.ts - a.ts);
  let body;

  if (list.length === 0) {
    body = `<div class="memo-empty">
      <div class="me-icon"><i class="ti ti-notebook"></i></div>
      <div class="me-ttl">${tr('memoEmptyTtl')}</div>
      <div class="me-msg">${tr('memoEmptyMsg')}</div>
    </div>`;
  } else {
    body = '<div class="memo-list">' + list.map(m => {
      const memoTxt = m.memo
        ? `<div class="ml-memo">${escapeHtml(m.memo)}</div>`
        : `<div class="ml-memo ml-memo-empty">${tr('memoNone')}</div>`;

      return `<div class="ml-card">
        <div class="ml-hd">
          <div class="ml-booth">${m.booth}</div>
          <div class="ml-company">${escapeHtml(m.company)}</div>
        </div>
        ${memoTxt}
        <div class="ml-actions">
          <button class="ml-btn" onclick="openMemoEditor('${m.booth}','${escapeJsAttr(m.company)}')"><i class="ti ti-edit"></i> ${tr('memoEdit')}</button>
          <button class="ml-btn ml-btn-del" onclick="if(confirm(tr('memoDelConfirm'))){deleteMemo('${m.booth}');showMyMemo();}"><i class="ti ti-trash"></i> ${tr('memoDel')}</button>
        </div>
      </div>`;
    }).join('') + '</div>';

    body += `<div class="memo-mail">
      <button class="mail-btn" onclick="sendMemosByMail()"><i class="ti ti-mail"></i> ${tr('memoMailBtn')}</button>
      <div class="mail-note">${tr('memoMailNote')}</div>
    </div>`;
  }

  document.getElementById('screen').innerHTML = `
  <div class="screen">
    <div class="sub-hd" style="position:relative">
      <button class="back-btn" onclick="showHome()"><i class="ti ti-arrow-left"></i></button>
      <div class="sub-hd-ttl">${tr('memoTitle')} <span class="sub-hd-cnt">${tr('memoCount', myMemos.length)}</span></div>
      <button class="my-other-inq-btn" onclick="openOtherInquiry()" title="${tr('memoOtherInqBtn')}">
        <i class="ti ti-message-circle"></i><span class="my-other-inq-label">${tr('memoOtherInqBtn')}</span>
      </button>
    </div>
    <div style="padding:0 16px">
      <button class="my-search-add-btn" onclick="showBoothSearch()">
        <i class="ti ti-search"></i> ${tr('memoSearchAdd')}
      </button>
    </div>
    ${body}
  </div>`;
}

// メモ編集モーダル
function openMemoEditor(booth, company) {
  const existing = findMemo(booth);
  const currentMemo = existing ? existing.memo : '';

  const modal = document.createElement('div');
  modal.id = 'memoModal';
  modal.className = 'memo-modal-bg';
  modal.innerHTML = `
    <div class="memo-modal">
      <div class="mm-hd">
        <i class="ti ti-notebook"></i> ${tr('memoModalTtl')}
        <button class="mm-close" onclick="closeMemoEditor()"><i class="ti ti-x"></i></button>
      </div>
      <div class="mm-booth-info">
        <div class="mm-booth">${booth}</div>
        <div class="mm-company">${escapeHtml(company)}</div>
      </div>
      <div class="mm-section-label">${tr('memoSecMemo')}</div>
      <div class="mm-textarea-wrap">
        <textarea id="memoText" class="mm-textarea" placeholder="${tr('memoPlaceholder')}" rows="3">${escapeHtml(currentMemo)}</textarea>
        <button class="mm-mic-icon" id="memoMicBtn" onclick="toggleMemoMic('memoText')" title="${tr('aiMicTitle')}"><i class="ti ti-microphone"></i></button>
      </div>
      <div class="mm-note">${tr('memoNote')}</div>

      <div class="mm-section-label" style="margin-top:14px">${tr('memoSecInq')}</div>
      <div class="mm-textarea-wrap">
        <textarea id="inquiryText" class="mm-textarea" placeholder="${tr('memoInqPlaceholder')}" rows="3"></textarea>
        <button class="mm-mic-icon" id="inquiryMicBtn" onclick="toggleMemoMic('inquiryText')" title="${tr('aiMicTitle')}"><i class="ti ti-microphone"></i></button>
      </div>

      <div class="mm-actions">
        <button class="mm-btn mm-btn-cancel" onclick="closeMemoEditor()">${tr('memoCancel')}</button>
        <button class="mm-btn mm-btn-save" onclick="saveMemoFromModal('${booth}','${escapeJsAttr(company)}')">${tr('memoSave')}</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('memoText').focus(), 100);
}

function closeMemoEditor() {
  const m = document.getElementById('memoModal');
  if (m) m.remove();

  if (memoRecognition && memoListening) {
    try { memoRecognition.stop(); } catch(e) {}
  }
}

function saveMemoFromModal(booth, company) {
  const memoTxt = (document.getElementById('memoText').value || '').trim();
  const inquiryTxt = (document.getElementById('inquiryText') ? document.getElementById('inquiryText').value || '' : '').trim();

  // 1) ローカルメモ保存（既存動作）
  addMemo(booth, company, memoTxt);

  // 2) GASにメモ記録（同意者のみ）
  if (localStorage.getItem(CONSENT_KEY) === '1') {
    sendMemoToGAS({
      booth: booth,
      company: company,
      memo: memoTxt
    });
  }

  // 3) 問い合わせ記入があれば連絡先入力画面へ
  if (inquiryTxt) {
    closeMemoEditor();
    showInquiryForm(booth, company, inquiryTxt);
    return;
  }

  closeMemoEditor();

  if (typeof currentSearchResults !== 'undefined' && currentSearchResults && currentSearchLabel) {
    showResults(currentSearchResults, currentSearchLabel);
  }
}

// 入退場ログ送信（fire-and-forget）
function recordEntryExit(action) {
  const url = GAS_URL + '?action=entryexit'
    + '&qr='       + encodeURIComponent(visitorQRCode || '')
    + '&gyotai='   + encodeURIComponent(visitorGyotai || '')
    +
    
// メモをGASに送信（fire-and-forget）
function sendMemoToGAS(p) {
  const url = GAS_URL + '?action=memo'
    + '&qr='       + encodeURIComponent(visitorQRCode || '')
    + '&gyotai='   + encodeURIComponent(visitorGyotai || '')
    + '&booth='    + encodeURIComponent(p.booth || '')
    + '&company='  + encodeURIComponent(p.company || '')
    + '&memo='     + encodeURIComponent(p.memo || '')
    + '&session='  + encodeURIComponent(SESSION_ID || '')
    + '&userType=' + encodeURIComponent(userType || '');

  fetch(url).catch(() => {});
}

// 問い合わせ送信（fire-and-forget）
function sendInquiryToGAS(p) {
  const url = GAS_URL + '?action=inquiry'
    + '&qr='              + encodeURIComponent(visitorQRCode || '')
    + '&booth='           + encodeURIComponent(p.booth || '')
    + '&company='         + encodeURIComponent(p.company || '')
    + '&visitor_company=' + encodeURIComponent(p.visitorCompany || '')
    + '&visitor_name='    + encodeURIComponent(p.visitorName || '')
    + '&visitor_dept='    + encodeURIComponent(p.visitorDept || '')
    + '&visitor_title='   + encodeURIComponent(p.visitorTitle || '')
    + '&visitor_tel='     + encodeURIComponent(p.visitorTel || '')
    + '&inquiry='         + encodeURIComponent(p.inquiry || '')
    + '&gyotai='          + encodeURIComponent(visitorGyotai || '')
    + '&regtype='         + encodeURIComponent(p.regtype || '')
    + '&session='         + encodeURIComponent(SESSION_ID || '')
    + '&userType='        + encodeURIComponent(userType || '');

  return fetch(url).catch(() => {});
}

// 連絡先入力フォーム
function showInquiryForm(booth, company, inquiryText) {
  const modal = document.createElement('div');
  modal.id = 'inquiryModal';
  modal.className = 'memo-modal-bg';
  modal.innerHTML = `
    <div class="memo-modal">
      <div class="mm-hd">
        <i class="ti ti-mail"></i> ${tr('inqTitle')}
        <button class="mm-close" onclick="closeInquiryForm()"><i class="ti ti-x"></i></button>
      </div>
      <div class="mm-booth-info">
        <div class="mm-booth">${booth}</div>
        <div class="mm-company">${escapeHtml(company)}</div>
      </div>
      <div style="background:#f9f9f7;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px;color:#444441;line-height:1.6">
        <div style="font-weight:600;margin-bottom:4px;color:#1a1a18">${tr('inqContentLbl')}</div>
        ${escapeHtml(inquiryText)}
      </div>

      <div style="text-align:center;padding:8px 0;color:#888780;font-size:12px" id="inqDbStatus">${tr('inqDbChecking')}</div>

      <div class="mm-section-label">${tr('inqContactLbl')}</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <input type="text" id="inqCompany" placeholder="${tr('inqCompany')}" style="padding:10px;border:1px solid #d3d1c7;border-radius:8px;font-size:14px">
        <input type="text" id="inqName"    placeholder="${tr('inqName')}" style="padding:10px;border:1px solid #d3d1c7;border-radius:8px;font-size:14px">
        <input type="text" id="inqDept"    placeholder="${tr('inqDept')}" style="padding:10px;border:1px solid #d3d1c7;border-radius:8px;font-size:14px">
        <input type="text" id="inqTitle"   placeholder="${tr('inqRole')}" style="padding:10px;border:1px solid #d3d1c7;border-radius:8px;font-size:14px">
        <input type="tel"  id="inqTel"     placeholder="${tr('inqTel')}" style="padding:10px;border:1px solid #d3d1c7;border-radius:8px;font-size:14px">
      </div>

      <label style="display:flex;align-items:flex-start;gap:10px;margin-top:14px;cursor:pointer;font-size:12px;color:#444441;line-height:1.5">
        <input type="checkbox" id="inqConsent" style="width:18px;height:18px;flex-shrink:0;margin-top:1px;accent-color:#0F6E56">
        <span>${tr('inqConsent')}</span>
      </label>

      <div class="mm-actions">
        <button class="mm-btn mm-btn-cancel" onclick="closeInquiryForm()">${tr('inqCancel')}</button>
        <button class="mm-btn mm-btn-save" id="inqSendBtn" onclick="submitInquiry('${booth}','${escapeJsAttr(company)}','${escapeJsAttr(inquiryText)}')">${tr('inqSend')}</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const st = document.getElementById('inqDbStatus');
  if (st) st.style.display = 'none';

  document.getElementById('inqSendBtn').dataset.regtype = '会場';
}

function closeInquiryForm() {
  const m = document.getElementById('inquiryModal');
  if (m) m.remove();
}

function submitInquiry(booth, company, inquiryText) {
  const c   = (document.getElementById('inqCompany').value || '').trim();
  const n   = (document.getElementById('inqName').value    || '').trim();
  const d   = (document.getElementById('inqDept').value    || '').trim();
  const t   = (document.getElementById('inqTitle').value   || '').trim();
  const tel = (document.getElementById('inqTel').value     || '').trim();
  const consent = document.getElementById('inqConsent').checked;
  const regtype = document.getElementById('inqSendBtn').dataset.regtype || '不明';

  if (!c) {
    alert(tr('inqNeedCompany'));
    return;
  }

  if (!n) {
    alert(tr('inqNeedName'));
    return;
  }

  if (!tel) {
    alert(tr('inqNeedTel'));
    return;
  }

  if (!consent) {
    alert(tr('inqNeedConsent'));
    return;
  }

  const btn = document.getElementById('inqSendBtn');
  btn.disabled = true;
  btn.textContent = tr('inqSending');

  sendInquiryToGAS({
    booth: booth,
    company: company,
    visitorCompany: c,
    visitorName: n,
    visitorDept: d,
    visitorTitle: t,
    visitorTel: tel,
    inquiry: inquiryText,
    regtype: regtype
  }).then(() => {
    alert(tr('inqDone'));
    closeInquiryForm();

    if (typeof currentSearchResults !== 'undefined' && currentSearchResults && currentSearchLabel) {
      showResults(currentSearchResults, currentSearchLabel);
    }
  });
}

// 出展社以外への問い合わせモーダル
function openOtherInquiry() {
  const modal = document.createElement('div');
  modal.id = 'otherInqModal';
  modal.className = 'memo-modal-bg';
  modal.innerHTML = `
    <div class="memo-modal">
      <div class="mm-hd">
        <i class="ti ti-message-circle"></i> ${tr('oinqTitle')}
        <button class="mm-close" onclick="closeOtherInquiry()"><i class="ti ti-x"></i></button>
      </div>

      <div style="background:#fdf6ec;border-left:3px solid #C8842F;border-radius:6px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:#444441;line-height:1.6">
        ${tr('oinqDesc')}
      </div>

      <div class="mm-section-label">${tr('oinqCatLbl')}</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
        <label class="oinq-radio"><input type="radio" name="oinqCat" value="主催者への要望・感想" checked> ${tr('oinqCat1')}</label>
        <label class="oinq-radio"><input type="radio" name="oinqCat" value="探していた商品・出展社が見つからなかった"> ${tr('oinqCat2')}</label>
        <label class="oinq-radio"><input type="radio" name="oinqCat" value="アプリの不具合・改善要望"> ${tr('oinqCat3')}</label>
      </div>

      <div class="mm-section-label">${tr('oinqContentLbl')}</div>
      <div class="mm-textarea-wrap">
        <textarea id="oinqText" class="mm-textarea" placeholder="${tr('oinqPlaceholder')}" rows="4"></textarea>
        <button class="mm-mic-icon" id="oinqMicBtn" onclick="toggleMemoMic('oinqText')" title="${tr('aiMicTitle')}"><i class="ti ti-microphone"></i></button>
      </div>

      <div class="mm-section-label" style="margin-top:14px">${tr('oinqContactLbl')}</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <input type="text" id="oinqCompany" placeholder="${tr('oinqCompany')}" style="padding:10px;border:1px solid #d3d1c7;border-radius:8px;font-size:14px">
        <input type="text" id="oinqName"    placeholder="${tr('oinqName')}" style="padding:10px;border:1px solid #d3d1c7;border-radius:8px;font-size:14px">
        <input type="tel"  id="oinqTel"     placeholder="${tr('oinqTel')}" style="padding:10px;border:1px solid #d3d1c7;border-radius:8px;font-size:14px">
      </div>

      <div class="mm-actions">
        <button class="mm-btn mm-btn-cancel" onclick="closeOtherInquiry()">${tr('oinqCancel')}</button>
        <button class="mm-btn mm-btn-save" id="oinqSendBtn" onclick="submitOtherInquiry()">${tr('oinqSend')}</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
}

function closeOtherInquiry() {
  const m = document.getElementById('otherInqModal');
  if (m) m.remove();
}

function submitOtherInquiry() {
  const cat  = (document.querySelector('input[name="oinqCat"]:checked') || {}).value || '';
  const txt  = (document.getElementById('oinqText').value    || '').trim();
  const c    = (document.getElementById('oinqCompany').value || '').trim();
  const n    = (document.getElementById('oinqName').value    || '').trim();
  const tel  = (document.getElementById('oinqTel').value     || '').trim();

  if (!txt) {
    alert(tr('oinqNeedContent'));
    return;
  }

  const btn = document.getElementById('oinqSendBtn');
  btn.disabled = true;
  btn.textContent = tr('inqSending');

  sendInquiryToGAS({
    booth: '',
    company: '【' + cat + '】',
    visitorCompany: c,
    visitorName: n,
    visitorDept: '',
    visitorTitle: '',
    visitorTel: tel,
    inquiry: txt,
    regtype: 'その他'
  }).then(() => {
    alert(tr('inqDone'));
    closeOtherInquiry();
  });
}

// メモ・問い合わせ用音声入力
let memoRecognition = null;
let memoListening = false;
let memoMicCurrentBtn = null;

function toggleMemoMic(targetId) {
  targetId = targetId || 'memoText';

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert(tr('micUnsupported'));
    return;
  }

  const btnId = targetId === 'inquiryText'
    ? 'inquiryMicBtn'
    : targetId === 'oinqText'
      ? 'oinqMicBtn'
      : 'memoMicBtn';

  const btn = document.getElementById(btnId);

  if (memoListening) {
    if (memoRecognition) memoRecognition.stop();
    memoListening = false;

    if (memoMicCurrentBtn) {
      memoMicCurrentBtn.classList.remove('mic-on');
      memoMicCurrentBtn.innerHTML = '<i class="ti ti-microphone"></i>';
    }

    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  memoRecognition = new SR();
  memoRecognition.lang = 'ja-JP';
  memoRecognition.continuous = false;
  memoRecognition.interimResults = false;

  memoRecognition.onresult = (e) => {
    const txt = e.results[0][0].transcript;
    const ta = document.getElementById(targetId);
    if (ta) ta.value = ta.value ? ta.value + ' ' + txt : txt;
  };

  memoRecognition.onend = () => {
    memoListening = false;

    if (memoMicCurrentBtn) {
      memoMicCurrentBtn.classList.remove('mic-on');
      memoMicCurrentBtn.innerHTML = '<i class="ti ti-microphone"></i>';
    }
  };

  memoRecognition.start();
  memoListening = true;
  memoMicCurrentBtn = btn;

  if (btn) {
    btn.classList.add('mic-on');
  }
}

// メモをメール送信（mailto:）
function sendMemosByMail() {
  if (myMemos.length === 0) return;

  const list = myMemos.slice().sort((a,b) => b.ts - a.ts);
  const subject = '【丸菱総合展2026】マイメモ ' + list.length + '件';

  let body = '丸菱グループ食品機械と原材料 総合展2026\n';
  body += 'マイメモ一覧（' + list.length + '件）\n';
  body += '━━━━━━━━━━━━━━━━━━\n\n';

  list.forEach((m, i) => {
    body += '[' + (i+1) + '] ' + m.booth + ' ' + m.company + '\n';
    body += (m.memo ? m.memo : '（メモなし・気になる）') + '\n\n';
  });

  body += '━━━━━━━━━━━━━━━━━━\n';
  body += '第37回 丸菱グループ総合展2026\n';
  body += '2026年6月10-11日 マリンメッセ福岡A館\n';

  location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}
