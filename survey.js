function initFuse() {
  if (typeof Fuse === 'undefined') return;
  fuse = new Fuse(P, {
    keys: [
      { name: 'company', weight: 3 },
      { name: 'tags',    weight: 2 },
    ],
    threshold:       0.35,
    includeScore:    true,
    ignoreLocation:  true,
    minMatchCharLength: 2,
  });
}

// カテゴリ検索で固定追加するブース
// 業種除外フィルタに引っかかるが表示すべき例外出展社
const CAT_FIXED_BOOTHS = {
  '冷凍生地・冷凍食材': ['C02'], // 株式会社七洋製作所（機械業種だが冷凍食材も扱う）
};

function searchCat(idx) {
  const c = MAIN_CATS[idx];
  search(c.q, c.label, c.excludeBusiness, CAT_FIXED_BOOTHS[c.label] || [], true);
}

function search(q, label, excludeBusiness, fixedBooths, tokenized) {
  showLoading();
  searchCount++;

  const qNorm = q.trim().replace(/[\u3000\s]/g, '').toLowerCase();
  if (!qNorm) { showResults([], label); return; }

  const resultMap = new Map();

  // ── 方式1: 2段階タグ検索（日本語自然文・音声入力対応）──
  // tokenized=true（カテゴリ検索）は、語を空白で分割した「確定キーワード」だけを使い、
  // 「タグが指定語を含む」一方向一致にする。これにより "冷凍和菓子" の中の "和菓子" のような
  // 部分語が他カテゴリの商品を引き込む誤検出を防ぐ。
  const matchedKws = new Set();
  if (tokenized) {
    q.toLowerCase().split(/[\u3000\s]+/).forEach(tok => {
      const t = tok.trim();
      if (t.length >= 2) matchedKws.add(t);
    });
  } else {
    P.forEach(item => {
      (item.tags || []).forEach(tag => {
        const t = tag.trim().toLowerCase();
        if (t.length >= 2 && qNorm.indexOf(t) >= 0) matchedKws.add(t);
      });
    });
    if (qNorm.length >= 2) matchedKws.add(qNorm);
  }

  P.forEach(item => {
    // 業種除外フィルタ（例：冷凍カテゴリで機械・包材を除外）
    if (excludeBusiness && excludeBusiness.indexOf(item.business) >= 0) return;

    let score = 0;
    const matched = [];
    (item.tags || []).forEach(tag => {
      const t = tag.trim().toLowerCase();
      if (!t || t.length < 2) return;
      for (const kw of matchedKws) {
        const hit = tokenized ? (t.indexOf(kw) >= 0) : (t.indexOf(kw) >= 0 || kw.indexOf(t) >= 0);
        if (hit) {
          score += kw.length;
          if (matched.indexOf(tag) < 0) matched.push(tag);
          break;
        }
      }
    });
    // 社名一致はフリーテキスト検索のみ（カテゴリ検索では語ブロブとの偶発一致を避ける）
    if (!tokenized) {
      const co = item.company.replace(/[株式会社㈱㈲有限会社]/g, '').toLowerCase();
      if (co.length >= 2 && (qNorm.indexOf(co) >= 0 || co.indexOf(qNorm) >= 0)) {
        score += 20; matched.push(item.company);
      }
    }
    if (score > 0) resultMap.set(item.booth + '|' + item.company, { item, score, matched });
  });

  // ── 方式2: Fuse.js ファジー検索（誤字・略語・英語対応）──
  // カテゴリ検索では Fuse は既存ヒットの加点のみ行い、新規追加はしない（あいまい一致の漏れ防止）。
  if (fuse) {
    fuse.search(q, { limit: 20 }).forEach(r => {
      // 業種除外フィルタ
      if (excludeBusiness && excludeBusiness.indexOf(r.item.business) >= 0) return;

      const key = r.item.booth + '|' + r.item.company;
      const fs  = Math.round((1 - (r.score || 0)) * 8);
      if (resultMap.has(key)) {
        resultMap.get(key).score += fs;
      } else if (fs >= 2 && !tokenized) {
        resultMap.set(key, { item: r.item, score: fs, matched: [] });
      }
    });
  }

  const top = [...resultMap.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(r => Object.assign({}, r.item, { score: r.score, matchedTags: r.matched }));

  // ── 施設マッチ（アウトレット市・フードコーナー等）──
  const facilityHits = [];
  Object.entries(FACILITY_TAGS).forEach(([fname, tags]) => {
    for (const tag of tags) {
      if (qNorm.indexOf(tag.toLowerCase()) >= 0 || tag.toLowerCase().indexOf(qNorm) >= 0) {
        facilityHits.push(fname);
        break;
      }
    }
  });

  // アンケート用ブース履歴 & actionLog
  top.forEach(r => {
    if (visitedBooths.indexOf(r.booth) < 0) visitedBooths.push(r.booth);
    logBooth(r.booth, r.company);
  });
  logKeyword(q);

  // ログ記録（同意者のみ）
  const booths = top.map(r => r.booth).join(',');
  if (localStorage.getItem(CONSENT_KEY) === '1') {
    sendLog({ keyword: q, lang: lang, booth: booths, found: top.length > 0 ? 'あり' : 'なし', searchCount: searchCount, gyotai: visitorGyotai, qr: visitorQRCode });
  }

  // 固定追加ブース（除外フィルタの例外）
  if (fixedBooths && fixedBooths.length) {
    fixedBooths.forEach(function(bid) {
      if (top.find(r => r.booth === bid)) return; // 既にある場合はスキップ
      const item = P.find(p => p.booth === bid);
      if (item) top.push(Object.assign({}, item, { score: 1, matchedTags: item.tags || [] }));
    });
  }

  // ── 該当なし & AI ON → AIコンシェルジュにフォールバック ──
  // ただし施設ヒットがある場合はAIを呼ばず、施設カードだけ表示する
  if (top.length === 0 && AI_ENABLED) {
    showResults([], label, facilityHits);
    if (facilityHits.length > 0) return;
    // 「該当なし」メッセージの下にAI提案を追加
    callOpenAI(q).then(reply => {
      const noResEl = document.getElementById('aiSearchFallback');
      if (!noResEl) return;
      noResEl.innerHTML = '<div style="margin:12px 16px 0;background:#E1F5EE;border-radius:12px;padding:14px;font-size:13px;line-height:1.7">'
        + '<div style="font-weight:600;color:#0F6E56;margin-bottom:6px">&#x1F916; ' + tr('aiSuggestTitle') + '</div>'
        + '<div style="color:#1a1a18">' + escapeHtml(reply).replace(/\n/g,'<br>') + '</div>'
        + '</div>';
    }).catch(() => {});
    return;
  }

  showResults(top, label, facilityHits);
}


function sendLog(params) {
  const url = GAS_URL + '?action=log'
    + '&keyword=' + encodeURIComponent(params.keyword)
    + '&lang='    + encodeURIComponent(lang)
    + '&booth='   + encodeURIComponent(params.booth || '')
    + '&found='   + encodeURIComponent(params.found)
    + '&searchCount=' + (params.searchCount || 0)
    + '&session=' + SESSION_ID
    + '&gyotai='  + encodeURIComponent(params.gyotai || visitorGyotai)
    + '&qr='      + encodeURIComponent(params.qr || visitorQRCode);
  fetch(url).catch(() => {});
}
