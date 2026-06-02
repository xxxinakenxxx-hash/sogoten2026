function showMachineMenu() {
  _currentView = showMachineMenu;
  const subs = MACHINE_SUBS.map(s => `
    <div class="sc" onclick="search('${s.q}','${escapeJsAttr(catL(s.label))}',null,null,true)">
      <div class="sc-icon" style="background:${s.bg};color:${s.ic}"><i class="ti ${s.icon}"></i></div>
      <div class="sc-label">${catL(s.label)}</div>
      <div class="sc-cnt">${catS(s.label, s.sub)}</div>
    </div>`).join('');

  document.getElementById('screen').innerHTML = `
  <div class="screen">
    <div class="res-hdr">
      <button class="back-btn" onclick="showHome()"><i class="ti ti-arrow-left"></i></button>
      <div class="res-q">${tr('mmTitle')}</div>
    </div>
    <div class="sub-hero"><h2>${tr('mmHeroTtl')}</h2><p>${tr('mmHeroSub')}</p></div>
    <div class="sub-grid">${subs}</div>
    <div class="or-row" style="padding:0 16px 8px"><div class="or-line"></div><div class="or-txt">${tr('mmOrSearch')}</div><div class="or-line"></div></div>
    <div class="txt-row">
      <input class="txt-inp" id="qi2" placeholder="${tr('mmPlaceholder')}" onkeydown="if(event.key==='Enter'){var v=this.value.trim();if(v){search(v,v);this.value=''}}">
      <button class="snd-btn" onclick="var v=document.getElementById('qi2');if(v&&v.value.trim()){search(v.value.trim(),v.value.trim());v.value=''}"><i class="ti ti-send" style="font-size:18px"></i></button>
    </div>
  </div>`;
}

// セミナーが完了済みかを判定（開始から1時間経過、または日付が過ぎている）
function isSeminarDone(s) {
  const now = new Date();
  // 日付を解析（'6/10' → 2026/6/10）
  const m = String(s.date || '').match(/(\d+)\/(\d+)/);
  if (!m) return false;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  const year = 2026;
  // 当日の0時を基準に、日付がすでに過去なら非表示
  const seminarDay = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (seminarDay < today) return true;
  // 同日で時刻指定がある場合は開始1時間後で非表示。'随時'は終日表示。
  if (seminarDay.getTime() === today.getTime()) {
    const tm = String(s.time || '').match(/(\d+):(\d+)/);
    if (!tm) return false; // '随時'など
    const start = new Date(year, month - 1, day, parseInt(tm[1],10), parseInt(tm[2],10));
    const oneHourAfter = new Date(start.getTime() + 60 * 60 * 1000);
    return now >= oneHourAfter;
  }
  return false;
}

function showSeminars() {
  _currentView = showSeminars;
  const byDate = {};
  SEMINARS.filter(s => !isSeminarDone(s)).forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  });

  let html = '';
  for (const [date, items] of Object.entries(byDate)) {
    items.sort((a, b) => {
      const toMin = t => {
        const ampm = String(t).match(/^(AM|PM)(\d+):(\d+)/i);
        if (ampm) {
          let h = parseInt(ampm[2], 10);
          const m = parseInt(ampm[3], 10);
          if (ampm[1].toUpperCase() === 'PM' && h !== 12) h += 12;
          if (ampm[1].toUpperCase() === 'AM' && h === 12) h = 0;
          return h * 60 + m;
        }
        const hm = String(t).match(/(\d+):(\d+)/);
        if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
        return 9999;
      };
      return toMin(a.time) - toMin(b.time);
    });
    html += `<div style="padding:12px 16px 4px;font-size:13px;font-weight:600;color:#0F6E56;border-bottom:1px solid #e8e7e1">${date}</div>`;
    items.forEach(s => {
      const badge = s.type === '実演'
        ? `<span style="background:#FAEEDA;color:#854F0B;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600">${tr('semBadgeDemo')}</span>`
        : `<span style="background:#E6F1FB;color:#185FA5;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600">${tr('semBadgeSeminar')}</span>`;
      const rsv = s.reservation === '要予約'
        ? `<span style="color:#E24B4A;font-size:12px">${tr('semRsvNeed')}</span>`
        : `<span style="color:#0F6E56;font-size:12px">${tr('semRsvFree')}</span>`;
      // venue を解析してMAPボタン化
      const loc = parseVenue(s.venue);
      const venueDisplay = loc
        ? `<button class="venue-btn" onclick="showMapForVenue('${loc.type}','${escapeJsAttr(loc.id)}','${escapeJsAttr(loc.label)}')"><i class="ti ti-map-pin"></i> ${loc.label}</button>`
        : `<div style="font-size:12px;color:#888780;margin-top:2px"><i class="ti ti-map-pin" style="font-size:12px"></i> ${s.venue}</div>`;
      html += `<div style="padding:12px 16px;border-bottom:1px solid #e8e7e1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <span style="font-size:16px;font-weight:700;color:#1a1a18">${s.time}</span>
          ${badge} ${rsv}
        </div>
        <div style="font-size:15px;font-weight:600;color:#1a1a18;margin-bottom:3px">${s.title}</div>
        <div style="font-size:13px;color:#73726c;margin-bottom:6px">${s.speaker}</div>
        ${venueDisplay}
      </div>`;
    });
  }

  document.getElementById('screen').innerHTML = `
  <div class="screen">
    <div class="res-hdr">
      <button class="back-btn" onclick="showHome()"><i class="ti ti-arrow-left"></i></button>
      <div class="res-q">${tr('semTitle')}</div>
    </div>
    ${html}
  </div>`;
}

// venue文字列を解析（ブース番号 or 施設名）
function parseVenue(venue) {
  if (!venue) return null;
  const s = String(venue).trim();
  // ブース番号を抽出（A58, D51, B74 等）
  const m = s.match(/[A-D]\s?\d{1,3}/i);
  if (m) {
    const boothId = m[0].replace(/\s/g, '').toUpperCase();
    if (BOOTH_COORDS[boothId]) {
      return {type: 'booth', id: boothId, label: 'ブース ' + boothId};
    }
  }
  // 施設名でマッチ
  for (const fname of Object.keys(FACILITY_COORDS)) {
    if (s.indexOf(fname) >= 0) {
      return {type: 'facility', id: fname, label: fname};
    }
  }
  return null;
}

// venueタップで該当MAP表示
let _mapBackHandler = null;
let _facilityFocus = null;
function showMapForVenue(type, id, label) {
  _mapBackHandler = function() { showSeminars(); };
  if (type === 'booth') {
    _lastResults = [{booth: id, company: label || id}];
    _lastLabel = label || id;
    _lastBoothIds = [id];
    _facilityFocus = null;
    showMapScreen(id);
  } else if (type === 'facility') {
    // 施設も通常のMAP画面と同じUIで表示（経路検索も使える）
    _facilityFocus = id;
    _lastResults = [];
    _lastLabel = label || id;
    _lastBoothIds = [];
    showMapScreen(null);
  }
