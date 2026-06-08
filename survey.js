// ============================================================
// アンケート（帰り際）
// ============================================================
function showSurvey() {
  let rating = 0;
  const booths = visitedBooths.slice(0, 8);

  const boothChecks = booths.map((b, i) => {
    const co = P.find(p => p.booth === b);
    return `<div class="bc" id="bc${i}" onclick="toggleBooth(${i})">
      <span class="bc-num">${b}</span>
      <span class="bc-co">${co ? co.company : b}</span>
    </div>`;
  }).join('');

  document.getElementById('screen').innerHTML = `
  <div class="screen">
    <div class="res-hdr">
      <button class="back-btn" onclick="showHome()"><i class="ti ti-arrow-left"></i></button>
      <div class="res-q">帰り際アンケート</div>
    </div>
    <div class="survey-wrap">
      <div class="survey-title">本日はいかがでしたか？</div>
      <div class="survey-sub">1タップで回答できます</div>
      <div class="rating-row">
        <button class="rating-btn" id="r1" onclick="setRating(1)">😊</button>
        <button class="rating-btn" id="r2" onclick="setRating(2)">😐</button>
        <button class="rating-btn" id="r3" onclick="setRating(3)">😞</button>
      </div>
      ${booths.length ? `
      <div class="survey-q2">良かったブースを教えてください（複数OK）</div>
      <div class="booth-checks" id="boothChecks">${boothChecks}</div>
      ` : ''}
      <button class="submit-btn" onclick="submitSurvey()">送信する</button>
    </div>
  </div>`;

  window._surveyRating = 0;
  window._surveyBooths = [];
}

function setRating(r) {
  window._surveyRating = r;
  [1,2,3].forEach(i => {
    document.getElementById('r'+i).classList.toggle('on', i === r);
  });
}

function toggleBooth(i) {
  const el = document.getElementById('bc'+i);
  const b  = visitedBooths[i];

  if (el.classList.toggle('on')) {
    if (!window._surveyBooths.includes(b)) window._surveyBooths.push(b);
  } else {
    window._surveyBooths = window._surveyBooths.filter(x => x !== b);
  }
}

function submitSurvey() {
  const rating = window._surveyRating || 0;
  const booths = (window._surveyBooths || []).join(',');

  const url = GAS_URL + '?action=survey'
    + '&rating='      + rating
    + '&booths='      + encodeURIComponent(booths)
    + '&searchCount=' + searchCount
    + '&session='     + SESSION_ID
    + '&gyotai='      + encodeURIComponent(visitorGyotai || '')
    + '&qr='          + encodeURIComponent(visitorQRCode || '')
    + '&userType='    + encodeURIComponent(userType || '');

  fetch(url).catch(() => {});

  document.getElementById('screen').innerHTML = `
  <div class="screen ld-screen">
    <div style="font-size:48px">🎉</div>
    <div class="ld-txt" style="font-size:18px;font-weight:600;color:#1a1a18">ありがとうございました！</div>
    <div class="ld-txt">またのご来場をお待ちしています</div>
  </div>`;
}

// ============================================================
// 退場レポート
// ============================================================
function showExitReport() {
  _currentView = showExitReport;

  const elapsed  = Math.floor((Date.now() - appStartTime) / 60000);
  const hours    = Math.floor(elapsed / 60);
  const minutes  = elapsed % 60;
  const timeStr  = hours > 0 ? tr('timeHM', hours, minutes) : tr('timeM', minutes);

  const kws       = actionLog.searchKeywords.slice(-12);
  const booths    = actionLog.viewedBooths.slice(0, 10);
  const memoCount = myMemos.length;

  const kwHtml = kws.length
    ? kws.map(k => `<span class="report-kw">${escapeHtml(k.q.replace(/^\[AI\] /,''))}</span>`).join('')
    : '<span style="color:#888780;font-size:13px">' + tr('erNoSearch') + '</span>';

  const boothHtml = booths.length
    ? booths.map(b => `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #e8e7e1;font-size:13px">
        <span style="background:#FAEEDA;color:#854F0B;font-weight:700;padding:3px 8px;border-radius:6px;flex-shrink:0">${escapeHtml(b.booth)}</span>
        <span>${escapeHtml(b.company)}</span>
      </div>`).join('')
    : '<div style="color:#888780;font-size:13px">' + tr('erNoBooths') + '</div>';

  const bizHtml = visitorGyotai
    ? `<span class="business-tag">${escapeHtml(visitorGyotai)}</span>`
    : '';

  document.getElementById('screen').innerHTML = `
  <div class="screen">
    <div class="res-hdr">
      <button class="back-btn" onclick="showHome()"><i class="ti ti-arrow-left"></i></button>
      <div class="res-q">${tr('erFootprintSurvey')}</div>
    </div>
    <div class="report-wrap">
      <div class="report-hero">
        <div class="report-hero-ttl">${tr('erHeroTtl')}</div>
      </div>

      <div class="report-sec" style="background:#f9fffe;border:1.5px solid #0F6E56">
        <div class="report-sec-ttl" style="margin-bottom:14px"><i class="ti ti-mood-smile" style="color:#0F6E56"></i>${tr('erSurveyTtl')}</div>

        <div class="sat-row-inline">
          <div class="sat-lbl-inline">${tr('erSatEvent')}</div>
          <div class="satisfaction-row">
            <button class="sat-btn" data-cat="event" data-val="5" onclick="setSatV2(this,'event',5)">🤩</button>
            <button class="sat-btn" data-cat="event" data-val="4" onclick="setSatV2(this,'event',4)">😄</button>
            <button class="sat-btn" data-cat="event" data-val="3" onclick="setSatV2(this,'event',3)">😊</button>
            <button class="sat-btn" data-cat="event" data-val="2" onclick="setSatV2(this,'event',2)">😐</button>
            <button class="sat-btn" data-cat="event" data-val="1" onclick="setSatV2(this,'event',1)">😢</button>
          </div>
        </div>

        <div class="sat-row-inline" style="margin-top:12px">
          <div class="sat-lbl-inline">${tr('erSatApp')}</div>
          <div class="satisfaction-row">
            <button class="sat-btn" data-cat="app" data-val="5" onclick="setSatV2(this,'app',5)">🤩</button>
            <button class="sat-btn" data-cat="app" data-val="4" onclick="setSatV2(this,'app',4)">😄</button>
            <button class="sat-btn" data-cat="app" data-val="3" onclick="setSatV2(this,'app',3)">😊</button>
            <button class="sat-btn" data-cat="app" data-val="2" onclick="setSatV2(this,'app',2)">😐</button>
            <button class="sat-btn" data-cat="app" data-val="1" onclick="setSatV2(this,'app',1)">😢</button>
          </div>
        </div>

        <div style="margin-top:14px">
          <div class="sat-lbl-inline" style="margin-bottom:6px">${tr('erComment')}</div>
          <textarea id="surveyComment" class="mm-textarea" rows="2" placeholder="${tr('erCommentPlaceholder')}"></textarea>
        </div>

        <button class="report-submit" onclick="submitExitReport()" style="margin-top:14px">
          <i class="ti ti-send"></i> ${tr('erSubmit')}
        </button>
      </div>

      <div class="report-subhead">
        <i class="ti ti-footprints" style="color:#0F6E56;font-size:20px"></i>
        <div>
          <div class="report-subhead-ttl">${tr('erFootprintTtl')}</div>
          <div class="report-subhead-sub">${tr('erFootprintSub', bizHtml)}</div>
        </div>
      </div>

      <div class="report-stats">
        <div class="rstat"><div class="rstat-num">${kws.length}</div><div class="rstat-lbl">${tr('erStatSearch')}</div></div>
        <div class="rstat"><div class="rstat-num">${booths.length}</div><div class="rstat-lbl">${tr('erStatBooth')}</div></div>
        <div class="rstat"><div class="rstat-num">${memoCount}</div><div class="rstat-lbl">${tr('erStatMemo')}</div></div>
        <div class="rstat"><div class="rstat-num">${timeStr}</div><div class="rstat-lbl">${tr('erStatStay')}</div></div>
      </div>

      <div class="report-sec">
        <div class="report-sec-ttl"><i class="ti ti-search" style="color:#0F6E56"></i>${tr('erSecKeywords')}</div>
        <div class="report-kw-list">${kwHtml}</div>
      </div>

      <div class="report-sec">
        <div class="report-sec-ttl"><i class="ti ti-building" style="color:#185FA5"></i>${tr('erSecBooths')}</div>
        ${boothHtml}
      </div>

      ${memoCount > 0 ? `<div class="report-sec">
        <div class="report-sec-ttl"><i class="ti ti-notebook" style="color:#534AB7"></i>${tr('erSecMemo', memoCount)}</div>
        <div style="font-size:13px;color:#73726c">${tr('erMemoNote')}</div>
        <button onclick="showMyMemo()" style="margin-top:8px;background:#534AB7;color:#fff;border:none;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">${tr('erMemoBtn')}</button>
      </div>` : ''}
    </div>
  </div>`;

  window._reportSatEvent = 0;
  window._reportSatApp   = 0;
}

function setSatV2(btn, cat, v) {
  if (cat === 'event') window._reportSatEvent = v;
  else if (cat === 'app') window._reportSatApp = v;

  document.querySelectorAll('.sat-btn[data-cat="' + cat + '"]').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

function setSat(v, btn) {
  window._reportSatEvent = v;
  document.querySelectorAll('.sat-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

function submitExitReport() {
  const ratingEvent = window._reportSatEvent || 0;
  const ratingApp   = window._reportSatApp   || 0;
  const commentEl   = document.getElementById('surveyComment');
  const comment     = commentEl ? (commentEl.value || '').trim() : '';
  const kws         = actionLog.searchKeywords.map(k => k.q).join(',');
  const booths      = actionLog.viewedBooths.map(b => b.booth).join(',');
  const elapsed     = Math.floor((Date.now() - appStartTime) / 60000);

  const url = GAS_URL + '?action=survey'
    + '&rating='      + ratingEvent
    + '&appRating='   + ratingApp
    + '&comment='     + encodeURIComponent(comment)
    + '&booths='      + encodeURIComponent(booths)
    + '&searchCount=' + actionLog.searchKeywords.length
    + '&session='     + SESSION_ID
    + '&gyotai='      + encodeURIComponent(visitorGyotai || '')
    + '&qr='          + encodeURIComponent(visitorQRCode || '')
    + '&elapsed='     + elapsed
    + '&keywords='    + encodeURIComponent(kws.slice(0,200))
    + '&userType='    + encodeURIComponent(userType || '');

  fetch(url).catch(() => {});

  recordEntryExit('退場');

  try {
    sessionStorage.removeItem('sogoten2026_actions');
  } catch(e) {}

  const renderThanks = () => {
    _currentView = renderThanks;
    document.getElementById('screen').innerHTML = `
    <div class="screen ld-screen" style="padding:80px 24px;text-align:center">
      <div style="font-size:64px">🎉</div>
      <div style="font-size:20px;font-weight:700;color:#1a1a18;margin-top:12px">${tr('erThanksBig')}</div>
      <div style="font-size:14px;color:#73726c;margin-top:8px;line-height:1.6">${tr('erThanksSub')}</div>
      <div style="margin-top:32px;padding:16px;background:#f5f5f3;border-radius:12px;font-size:12px;color:#73726c;line-height:1.6">
        ${tr('erMemoTransfer')}
      </div>
      ${myMemos.length > 0 ? `<button onclick="showMyMemo()" style="margin-top:16px;background:#534AB7;color:#fff;border:none;padding:13px 24px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer">${tr('erSendMemoBtn')}</button>` : ''}
    </div>`;
  };

  renderThanks();
}
