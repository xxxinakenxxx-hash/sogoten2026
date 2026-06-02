function showLoading() {
  document.getElementById('screen').innerHTML = `
  <div class="screen ld-screen">
    <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
    <div class="ld-txt">${T[lang].searching}</div>
  </div>`;
}

// 現在の検索結果を保持（MAP画面から戻るため）
let _lastResults = [], _lastLabel = '', _lastBoothIds = [];
let _currentFocus = null;  // MAP画面でフォーカス中のブース（個別選択時）
let _mapZoom = 1;           // MAP拡大率

function showResults(results, label, facilityHits) {
  _currentView = () => showResults(results, label, facilityHits);
  _lastResults = results;
  _lastLabel = label;
  _lastBoothIds = results.map(r => r.booth).filter(b => BOOTH_COORDS[b]);
  _mapBackHandler = null;  // 通常検索→MAP→検索結果に戻る

  // 検索結果を保持してメモ保存後の再描画に使う
  currentSearchResults = results;
  currentSearchLabel = label;

  // 施設ヒットカード
  let facilityCards = '';
  (facilityHits || []).forEach(fname => {
    const fac = FACILITY_COORDS[fname];
    if (!fac) return;
    facilityCards += `<div class="rc" onclick="_facilityFocus='${fname}';_lastResults=[];_lastLabel='${fname}';_lastBoothIds=[];showMapScreen(null)" style="cursor:pointer;background:#F0FBF7">
      <div class="rc-booth" style="background:#0F6E56;color:#fff;min-width:44px;text-align:center;font-size:20px;padding:8px 6px">${fac.icon}</div>
      <div style="flex:1"><div class="rc-co">${fname}</div>
      <div style="font-size:12px;color:#0F6E56;margin-top:2px">施設 · MAPで見る</div></div>
    </div>`;
  });

  let cards = '';
  results.forEach(r => {
    const hasCoord = BOOTH_COORDS[r.booth] ? true : false;
    const memoExists = findMemo(r.booth);
    const memoIcon = memoExists ? 'ti-edit' : 'ti-notebook';
    const memoClass = memoExists ? 'memo-btn memo-btn-on' : 'memo-btn';
    const memoLabel = memoExists ? tr('resEdit') : tr('resMemo');
    const mapBtn = hasCoord
      ? `<button class="map-jump-btn" onclick="event.stopPropagation();showMapScreen('${r.booth}')">${tr('resMap')}</button>`
      : '';
    const memoBtn = `<button class="${memoClass}" onclick="event.stopPropagation();openMemoEditor('${r.booth}','${escapeJsAttr(r.company)}')"><i class="ti ${memoIcon}"></i>${memoLabel}</button>`;
    cards += `<div class="rc">
      <div class="rc-booth rc-booth-btn" onclick="showMapScreen('${r.booth}')" style="${hasCoord?'cursor:pointer':''}">
        <div class="rc-bnum">${r.booth}</div><div class="rc-blbl">${tr('resBooth')}</div>
      </div>
      <div style="flex:1"><div class="rc-co">${r.company}</div>
        <div class="rc-prod">${r.matchedTags ? r.matchedTags.slice(0,3).join('・') : ''}</div>
        <div class="rc-btns">${memoBtn}${mapBtn}</div>
      </div>
    </div>`;
  });

  const mapBtn2 = _lastBoothIds.length ? `
    <button class="map-all-btn" onclick="showMapScreen()">
      <i class="ti ti-map"></i> ${tr('resMapAll', _lastBoothIds.length)}
    </button>` : '';

  const noRes = !results.length && !(facilityHits && facilityHits.length) ? `
    <div class="no-res">
      <i class="ti ti-search"></i>
      <h3>${tr('resNotFound')}</h3>
      <p>${AI_ENABLED ? tr('resNotFoundAi') : tr('resNotFoundTry')}</p>
    </div>
    <div id="aiSearchFallback"></div>` : '';

  document.getElementById('screen').innerHTML = `
  <div class="screen">
    <div class="res-hdr">
      <button class="back-btn" onclick="showHome()"><i class="ti ti-arrow-left"></i></button>
      <div class="res-q">${label}</div>
      ${results.length ? `<div class="res-cnt">${tr('resCount', results.length)}</div>` : ''}
    </div>
    ${results.length ? `<div class="res-msg">${tr('resMsg', label, results.length)}</div>` : ''}
    <div class="rcards">${facilityCards}${cards}</div>
    ${mapBtn2}
    ${noRes}
  </div>`;
}

// MAP専用スクリーン
function showMapScreen(focusBooth) {
  _currentView = () => showMapScreen(focusBooth);
  _currentFocus = focusBooth || null;
  // viewBox状態を初期化
  _mapView = { x: 0, y: 0, w: 561, h: 734 };
  const highlightIds = focusBooth ? [focusBooth] : _lastBoothIds;
  let focusPos = focusBooth ? BOOTH_COORDS[focusBooth] : null;
  // 施設フォーカス時は施設座標にフォーカス
  if (!focusBooth && _facilityFocus && FACILITY_COORDS[_facilityFocus]) {
    focusPos = FACILITY_COORDS[_facilityFocus];
  }
  const focusCompany = focusBooth ? ((_lastResults.find(r=>r.booth===focusBooth)||{}).company||'') : '';
  const headerLabel = focusBooth
    ? focusBooth + ' ' + focusCompany
    : _lastLabel;
  const cntLabel = _facilityFocus ? '' : `<div class="res-cnt">${tr('resCount', highlightIds.length)}</div>`;

  // メモボタン（個別ブースフォーカス時のみ表示）
  const memoBtn = focusBooth ? (() => {
    const hasMemo = findMemo(focusBooth);
    const cls = hasMemo ? 'memo-btn memo-btn-on' : 'memo-btn';
    const lbl = hasMemo ? tr('resEdit') : tr('resMemo');
    const icon = hasMemo ? 'ti-edit' : 'ti-notebook';
    return `<button class="${cls}" id="mapMemoBtn" onclick="openMemoEditor('${focusBooth}','${escapeJsAttr(focusCompany)}');"><i class="ti ${icon}"></i>${lbl}</button>`;
  })() : '';

  document.getElementById('screen').innerHTML = `
  <div class="screen" style="display:flex;flex-direction:column;height:100%;position:relative">
    <div class="res-hdr" style="flex-shrink:0">
      <button class="back-btn" onclick="_mapBackHandler ? _mapBackHandler() : showResults(_lastResults,_lastLabel)"><i class="ti ti-arrow-left"></i></button>
      <div class="res-q">${headerLabel}</div>
      ${memoBtn}${cntLabel}
    </div>
    <div style="flex:1;overflow:hidden;background:#f5f5f3;padding:8px 8px 104px 8px;position:relative">
      <div id="map-svg-wrap" style="background:white;border-radius:12px;overflow:hidden;width:100%;height:100%;touch-action:none;cursor:grab">
        ${buildMapSVG(highlightIds, focusPos, null, _facilityFocus)}
      </div>
      <div style="position:absolute;bottom:112px;right:14px;display:flex;flex-direction:column;gap:6px;z-index:20">
        <button onclick="mapZoomVB(1/1.5)" style="width:42px;height:42px;border-radius:50%;border:none;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:22px;font-weight:700;color:#0F6E56;cursor:pointer">＋</button>
        <button onclick="mapZoomVB(1.5)" style="width:42px;height:42px;border-radius:50%;border:none;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:22px;font-weight:700;color:#0F6E56;cursor:pointer">−</button>
        <button onclick="mapResetVB()" style="width:42px;height:42px;border-radius:50%;border:none;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:14px;font-weight:700;color:#0F6E56;cursor:pointer">⛶</button>
      </div>
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 16px calc(10px + env(safe-area-inset-bottom)) 16px;background:#fff;border-top:1px solid #e8e7e1;z-index:30;box-shadow:0 -2px 8px rgba(0,0,0,.06);${RECEPTION_MODE ? 'display:none' : ''}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <i class="ti ti-navigation" style="color:#0F6E56;font-size:16px;flex-shrink:0"></i>
        <span style="font-size:13px;font-weight:600;color:#1a1a18">${tr('mapRouteTitle')}</span>
        <span style="font-size:11px;color:#888780">${tr('mapRouteHint')}</span>
      </div>
      <div style="display:flex;gap:8px">
        <input id="curLocInput" placeholder="${tr('mapRoutePlaceholder')}" 
          style="flex:1;padding:10px 14px;border:1.5px solid #0F6E56;border-radius:10px;font-size:16px;outline:none;text-transform:uppercase;background:#f9fffe"
          onkeydown="if(event.key==='Enter')showRoute()">
        <button onclick="showRoute()" 
          style="padding:10px 18px;background:#0F6E56;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px">
          <i class="ti ti-route" style="font-size:15px"></i>${tr('mapRouteBtn')}
        </button>
      </div>
    </div>
  </div>`;

  // フォーカス時はそのブースを中心に拡大
  if(focusPos) {
    _mapView = { x: focusPos.cx - 100, y: focusPos.cy - 130, w: 200, h: 260 };
    applyViewBox();
  }
  attachMapInteractions();
  // 受付モードはMAP表示時に自動で総合案内起点の経路を表示
  if(RECEPTION_MODE && focusBooth) {
    showRoute();
  }
}

function applyViewBox() {
  const svg = document.querySelector('#map-svg-wrap svg');
  if(!svg) return;
  // 範囲制限
  _mapView.w = Math.max(80, Math.min(561, _mapView.w));
  _mapView.h = Math.max(100, Math.min(734, _mapView.h));
  _mapView.x = Math.max(-50, Math.min(561 - _mapView.w + 50, _mapView.x));
  _mapView.y = Math.max(-50, Math.min(734 - _mapView.h + 50, _mapView.y));
  svg.setAttribute('viewBox', _mapView.x+' '+_mapView.y+' '+_mapView.w+' '+_mapView.h);
}

function mapZoomVB(factor) {
  // 現在の中心を保持して拡大縮小
  const cx = _mapView.x + _mapView.w / 2;
  const cy = _mapView.y + _mapView.h / 2;
  _mapView.w *= factor;
  _mapView.h *= factor;
  _mapView.x = cx - _mapView.w / 2;
  _mapView.y = cy - _mapView.h / 2;
  applyViewBox();
}

function mapResetVB() {
  _mapView = { x: 0, y: 0, w: 561, h: 734 };
  applyViewBox();
}

// ドラッグパン・ピンチズーム
function attachMapInteractions() {
  const wrap = document.getElementById('map-svg-wrap');
  if(!wrap) return;
  let dragging = false, lastX = 0, lastY = 0;
  let pinchDist = 0;

  // マウスドラッグ
  wrap.addEventListener('mousedown', function(e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    wrap.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', function(e) {
    if(!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    const rect = wrap.getBoundingClientRect();
    _mapView.x -= dx * (_mapView.w / rect.width);
    _mapView.y -= dy * (_mapView.h / rect.height);
    applyViewBox();
  });
  window.addEventListener('mouseup', function() {
    dragging = false;
    if(wrap) wrap.style.cursor = 'grab';
  });

  // タッチ（パン＆ピンチ）
  wrap.addEventListener('touchstart', function(e) {
    if(e.touches.length === 1) {
      dragging = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    } else if(e.touches.length === 2) {
      dragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist = Math.sqrt(dx*dx + dy*dy);
    }
  }, {passive: true});

  wrap.addEventListener('touchmove', function(e) {
    if(e.touches.length === 1 && dragging) {
      const dx = e.touches[0].clientX - lastX;
      const dy = e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      const rect = wrap.getBoundingClientRect();
      _mapView.x -= dx * (_mapView.w / rect.width);
      _mapView.y -= dy * (_mapView.h / rect.height);
      applyViewBox();
      e.preventDefault();
    } else if(e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if(pinchDist > 0) {
        const factor = pinchDist / dist;
        mapZoomVB(factor);
      }
      pinchDist = dist;
      e.preventDefault();
    }
  }, {passive: false});

  wrap.addEventListener('touchend', function() {
    dragging = false;
    pinchDist = 0;
  });

  // ホイールズーム（PC）
  wrap.addEventListener('wheel', function(e) {
    e.preventDefault();
    mapZoomVB(e.deltaY > 0 ? 1.2 : 1/1.2);
  }, {passive: false});
}

// 経路表示
function showRoute() {
  let fromBooth;
  if (RECEPTION_MODE) {
    // 受付モードは総合案内固定
    const highlightIds = _currentFocus ? [_currentFocus] : _lastBoothIds;
    let focusPos = _currentFocus ? BOOTH_COORDS[_currentFocus] : null;
    if (!_currentFocus && _facilityFocus && FACILITY_COORDS[_facilityFocus]) {
      focusPos = FACILITY_COORDS[_facilityFocus];
    }
    const wrap = document.getElementById('map-svg-wrap');
    if(wrap) {
      wrap.innerHTML = buildMapSVG(highlightIds, focusPos, null, _facilityFocus, FACILITY_COORDS['総合案内']);
      applyViewBox();
    }
    return;
  }
  const fromInput = document.getElementById('curLocInput');
  if(!fromInput) return;
  fromBooth = fromInput.value.trim().toUpperCase();
  if(!fromBooth || !BOOTH_COORDS[fromBooth]) {
    fromInput.style.borderColor = '#E24B4A';
    setTimeout(() => fromInput.style.borderColor = '#d3d1c7', 1500);
    return;
  }
  fromInput.style.borderColor = '#0F6E56';
  const highlightIds = _currentFocus ? [_currentFocus] : _lastBoothIds;
  let focusPos = _currentFocus ? BOOTH_COORDS[_currentFocus] : null;
  if (!_currentFocus && _facilityFocus && FACILITY_COORDS[_facilityFocus]) {
    focusPos = FACILITY_COORDS[_facilityFocus];
  }
  const wrap = document.getElementById('map-svg-wrap');
  if(wrap) {
    wrap.innerHTML = buildMapSVG(highlightIds, focusPos, fromBooth, _facilityFocus);
    applyViewBox();
  }

function buildMapSVG(highlightIds, focusPos, fromBooth, highlightFacility, fromCoords) {
  // ── 会場レイアウト（venue_map.svgの中身を背景に） ──
  // 読み込み済みならそれを使う、未読込なら最低限の外枠だけ
  const venueLayer = VENUE_SVG_INNER
    ? '<g opacity="0.7">' + VENUE_SVG_INNER + '</g>'
    : '<rect x="2" y="2" width="557" height="730" fill="none" stroke="#999" stroke-width="1.5" rx="4"/>';

  // ── 施設ラベル ──
  // 出入口・総合案内はチラシ同様、大きく赤く強調する
  const EMPH_FAC = {'出入口(A)': true, '総合案内': true};
  let facLayer = '';
  Object.entries(FACILITY_COORDS).forEach(function(entry) {
    const name = entry[0], fac = entry[1];
    if (EMPH_FAC[name]) {
      const fs = 9, h = 20;
      const tw = name.length * 9 + 22;
      facLayer += '<g>'
        + '<rect x="'+(fac.cx-tw/2)+'" y="'+(fac.cy-h/2)+'" width="'+tw+'" height="'+h+'" rx="4" fill="#E2342F" stroke="#fff" stroke-width="1.5"/>'
        + '<text x="'+fac.cx+'" y="'+(fac.cy+3.2)+'" text-anchor="middle" font-size="'+fs+'" fill="#fff" font-weight="800" font-family="sans-serif">'+(fac.icon||'')+' '+name+'</text>'
        + '</g>';
    } else {
      const tw = name.length * 5.5 + 14;
      facLayer += '<g>'
        + '<rect x="'+(fac.cx-tw/2)+'" y="'+(fac.cy-7)+'" width="'+tw+'" height="13" rx="3" fill="#0F6E56" opacity="0.92"/>'
        + '<text x="'+fac.cx+'" y="'+(fac.cy+2.5)+'" text-anchor="middle" font-size="5.5" fill="#fff" font-weight="700" font-family="sans-serif">'+(fac.icon||'')+' '+name+'</text>'
        + '</g>';
    }
  });

  // ── 施設ハイライト（セミナー会場など） ──
  let facHighlightLayer = '';
  if (highlightFacility && FACILITY_COORDS[highlightFacility]) {
    const fac = FACILITY_COORDS[highlightFacility];
    facHighlightLayer = '<g>'
      + '<circle cx="'+fac.cx+'" cy="'+fac.cy+'" r="28" fill="#E24B4A" opacity="0.15"><animate attributeName="r" values="20;32;20" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0.05;0.4" dur="1.5s" repeatCount="indefinite"/></circle>'
      + '<circle cx="'+fac.cx+'" cy="'+fac.cy+'" r="18" fill="none" stroke="#E24B4A" stroke-width="2.5" opacity="0.9"/>'
      + '</g>';
  }

  // ── ハイライトブース ──
  let hlLayer = '';
  (highlightIds||[]).forEach(function(bid) {
    const pos = BOOTH_COORDS[bid];
    if(!pos) return;
    const s = bid[0];
    const c = MAP_COLORS[s]||'#854F0B', b = MAP_BG[s]||'#FAEEDA';
    hlLayer += '<g>'
      + '<circle cx="'+pos.cx+'" cy="'+pos.cy+'" r="13" fill="'+b+'" stroke="'+c+'" stroke-width="2.5" opacity="0.95"/>'
      + '<text x="'+pos.cx+'" y="'+(pos.cy+1.5)+'" text-anchor="middle" font-size="5.5" fill="'+c+'" font-weight="800" font-family="sans-serif">'+bid+'</text>'
      + '</g>';
  });

  // ── 経路（通路グラフをダイクストラで探索）──
  let routeLayer = '';
  // fromCoordsが渡された場合はそれを起点にする（受付モード：総合案内固定）
  const fp_override = fromCoords || null;

  if(fp_override || (fromBooth && BOOTH_COORDS[fromBooth])) {
    const fp = fp_override || BOOTH_COORDS[fromBooth];

    // 施設への経路（施設フォーカス時）
    if (highlightFacility && FACILITY_COORDS[highlightFacility]) {
      const tp = FACILITY_COORDS[highlightFacility];
      const pathD = findCorridorRoute(fp, tp);
      if(pathD) {
        routeLayer += '<path d="'+pathD+'" stroke="#E24B4A" stroke-width="2.5" fill="none" stroke-dasharray="6,3" opacity="0.95" stroke-linejoin="round" stroke-linecap="round"/>';
        routeLayer += '<circle cx="'+tp.cx+'" cy="'+tp.cy+'" r="4" fill="#E24B4A"/>';
      }
    }

    (highlightIds||[]).forEach(function(bid) {
      if(bid === fromBooth) return;
      const tp = BOOTH_COORDS[bid];
      if(!tp) return;
      const pathD = findCorridorRoute(fp, tp);
      if(pathD) {
        routeLayer += '<path d="'+pathD+'" stroke="#E24B4A" stroke-width="2.5" fill="none" stroke-dasharray="6,3" opacity="0.95" stroke-linejoin="round" stroke-linecap="round"/>';
        routeLayer += '<circle cx="'+tp.cx+'" cy="'+tp.cy+'" r="4" fill="#E24B4A"/>';
      }
    });

    // 現在地マーカー（最前面）
    const fromLabel = fp_override ? '案内' : '現在地';
    routeLayer += '<g>'
      + '<circle cx="'+fp.cx+'" cy="'+fp.cy+'" r="16" fill="#185FA5" opacity="0.25"/>'
      + '<circle cx="'+fp.cx+'" cy="'+fp.cy+'" r="11" fill="#185FA5"/>'
      + '<text x="'+fp.cx+'" y="'+(fp.cy+3)+'" text-anchor="middle" font-size="6" fill="#fff" font-weight="700" font-family="sans-serif">'+fromLabel+'</text>'
      + '</g>';
  }

  return '<svg viewBox="0 0 561 734" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;background:#fafaf8">'
    + venueLayer
    + '<g>'
    + '<line x1="0" y1="366" x2="561" y2="366" stroke="#E8A0A0" stroke-width="18" stroke-linecap="round" opacity="0.45"/>'
    + '<line x1="282" y1="0" x2="282" y2="734" stroke="#E8A0A0" stroke-width="18" stroke-linecap="round" opacity="0.45"/>'
    + '</g>'
    + '<g>' + facLayer + '</g>'
    + '<g>' + facHighlightLayer + '</g>'
    + '<g>' + routeLayer + '</g>'
    + '<g>' + hlLayer + '</g>'
    + '</svg>';
}

