// ============================================================
// AIコンシェルジュ（OpenAI GPT本実装）
// ============================================================
function enterAIConcierge() {
  aiHistory = [];            // 会話リセットは「入室時」のみ
  actionLog.aiQueries++;
  saveActionLog();
  showAIConcierge();
}

function showAIConcierge() {
  _currentView = showAIConcierge;   // 言語切替時はこの画面を再描画（履歴カウントは増やさない）

  const bizBadge = visitorGyotai
    ? `<div class="ai-biz-badge">${tr('aiBizBadge', escapeHtml(visitorGyotai))}</div>`
    : '';

  const examples = [tr('aiChip1'), tr('aiChip2'), tr('aiChip3'), tr('aiChip4')];

  const exHtml = examples.map(e =>
    `<button onclick="aiSendExample('${escapeJsAttr(e)}')" style="background:#f5f5f3;border:none;padding:9px 14px;border-radius:20px;font-size:13px;color:#444441;cursor:pointer;text-align:left;-webkit-tap-highlight-color:transparent">${e}</button>`
  ).join('');

  const welcome = visitorGyotai ? tr('aiWelcomeBiz', escapeHtml(visitorGyotai)) : tr('aiWelcome');

  document.getElementById('screen').innerHTML = `
  <div class="screen ai-wrap" style="height:calc(100vh - 56px);height:calc(100dvh - 56px)">
    <div class="res-hdr">
      <button class="back-btn" onclick="showHome()"><i class="ti ti-arrow-left"></i></button>
      <div class="res-q">${tr('aiTitle')}</div>
    </div>
    <div class="ai-msgs" id="aiMsgs">
      <div style="text-align:center;padding:8px 0 4px">${bizBadge}</div>
      <div class="ai-msg bot">
        <div class="ai-bubble">${welcome}</div>
        <div class="ai-time" id="aiWelcomeTime"></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">${exHtml}</div>
    </div>
    <div class="ai-input-row">
      <textarea class="ai-inp" id="aiInp" placeholder="${tr('aiPlaceholder')}" rows="1"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();aiSend()}"
        oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'"></textarea>
      <button class="ai-mic" id="aiMicBtn" onclick="toggleAiMic()" title="${tr('aiMicTitle')}"><i class="ti ti-microphone"></i></button>
      <button class="ai-send" id="aiSendBtn" onclick="aiSend()"><i class="ti ti-send"></i></button>
    </div>
  </div>`;

  document.getElementById('aiWelcomeTime').textContent =
    new Date().toLocaleTimeString('ja-JP', {hour:'2-digit',minute:'2-digit'});

  setTimeout(() => document.getElementById('aiInp') && document.getElementById('aiInp').focus(), 300);
}

function aiSendExample(text) {
  const inp = document.getElementById('aiInp');
  if (inp) inp.value = text;
  aiSend();
}

function aiSend() {
  const inp = document.getElementById('aiInp');
  if (!inp) return;

  const msg = inp.value.trim();
  if (!msg) return;

  const suggestion = findAICompanySuggestion(msg);
  if (suggestion) {
    inp.value = '';
    inp.style.height = 'auto';
    showAICompanySuggestion(msg, suggestion);
    return;
  }

  inp.value = '';
  inp.style.height = 'auto';
  sendAIMessage(msg);
}

function sendAIMessage(msg) {
  appendAiMsg('user', msg);
  aiHistory.push({role: 'user', content: msg});

  const loadId = 'aiLoad_' + Date.now();
  appendAiMsg('bot', '...', loadId);
  document.getElementById('aiSendBtn').disabled = true;

  logKeyword('[AI] ' + msg);

  callOpenAI(msg).then(reply => {
    const loadEl = document.getElementById(loadId);
    if (loadEl) loadEl.innerHTML = formatAIReply(reply);

    aiHistory.push({role: 'assistant', content: reply});
    document.getElementById('aiSendBtn').disabled = false;

    appendSearchShortcut(loadEl, msg, reply);
    scrollAiToBottom();
  }).catch(err => {
    const loadEl = document.getElementById(loadId);
    if (loadEl) loadEl.textContent = tr('aiError');
    document.getElementById('aiSendBtn').disabled = false;
  });
}

function toKatakanaAI(value) {
  return String(value || '').replace(/[\u3041-\u3096]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

function normalizeAIText(value) {
  return toKatakanaAI(value)
    .replace(/株式会社|㈱|有限会社|㈲|合同会社|合資会社/g, '')
    .replace(/[\s　。、？！!?.・･ー－()（）「」『』【】\[\]\/／\-]+/g, '')
    .toLowerCase();
}

function normalizeAICompanyCore(value) {
  return normalizeAIText(value)
    .replace(/機械|食品|工業|産業|商事|製作所|製菓|製粉|化工|会社|会/g, '');
}

function extractAITerms(value) {
  const raw = String(value || '');
  const parts = raw.split(/[\s　。、？！!?.・･ー－()（）「」『』【】\[\]\/／\-]+/g);

  return Array.from(new Set(
    [raw, ...parts]
      .map(v => normalizeAIText(v))
      .filter(v => v && v.length >= 2)
  ));
}

function scoreAIProduct(p, qNorm) {
  let score = 0;

  const boothTerms = extractAITerms(p.booth);
  const companyTerms = extractAITerms(p.company);
  const businessTerms = extractAITerms(p.business);
  const tagTerms = [];
  const aliasTerms = [];

  (p.tags || []).forEach(tag => {
    extractAITerms(tag).forEach(t => tagTerms.push(t));
  });

  (p.voiceAliases || []).forEach(alias => {
    extractAITerms(alias).forEach(t => aliasTerms.push(t));
  });

  boothTerms.forEach(t => {
    if (t === qNorm) score += 1000;
    else if (qNorm.includes(t)) score += 700;
  });

  aliasTerms.forEach((t, idx) => {
    if (t === qNorm) score += 800 - idx;
    else if (qNorm.includes(t)) score += 700 - idx;
    else if (t.includes(qNorm)) score += 500 - idx;
  });

  companyTerms.forEach((t, idx) => {
    if (t === qNorm) score += 500 - idx;
    else if (qNorm.includes(t)) score += 350 - idx;
    else if (t.includes(qNorm)) score += 250 - idx;
  });

  businessTerms.forEach((t, idx) => {
    if (t === qNorm) score += 120 - idx;
    else if (qNorm.includes(t) || t.includes(qNorm)) score += 70 - idx;
  });

  tagTerms.forEach((t, idx) => {
    if (t === qNorm) score += 200 - idx;
    else if (qNorm.includes(t)) score += 120 - idx;
    else if (t.includes(qNorm)) score += 90 - idx;
  });

  return score;
}

function getAIContextBooths(userMsg) {
  const qNormAI = normalizeAIText(userMsg);
  if (!P || P.length === 0) return [];
  if (qNormAI.length < 2) return P.slice(0, 80);

  const exactBooth = P.find(p =>
    extractAITerms(p.booth).some(t => t === qNormAI)
  );

  if (exactBooth) return [exactBooth];

  const scored = P.map(p => {
    return { p, score: scoreAIProduct(p, qNormAI) };
  })
  .filter(s => s.score > 0)
  .sort((a, b) => b.score - a.score);

  return scored.map(s => s.p).slice(0, 80);
}

function findAICompanySuggestion(userMsg) {
  if (!P || P.length === 0) return null;

  const qNorm = normalizeAIText(userMsg);
  const qCore = normalizeAICompanyCore(userMsg);
  if (qNorm.length < 2 || qCore.length < 2) return null;

  // 1. 音声別名の「完全一致」を最優先する
  const exactAliasCandidates = P.map(p => {
    const aliasTerms = [];
    (p.voiceAliases || []).forEach(alias => {
      extractAITerms(alias).forEach(t => aliasTerms.push(t));
    });

    const matched = aliasTerms.some(t => t && t === qNorm);
    return matched ? { p, score: 1000 } : null;
  })
  .filter(Boolean);

  if (exactAliasCandidates.length === 1) {
    return exactAliasCandidates[0].p;
  }

  // 2. 入力が短い場合は、部分一致で拾わない
  if (qNorm.length <= 3 || qCore.length <= 3) {
    return null;
  }

  // 3. 音声別名の部分一致
  const aliasCandidates = P.map(p => {
    const aliasTerms = [];
    (p.voiceAliases || []).forEach(alias => {
      extractAITerms(alias).forEach(t => aliasTerms.push(t));
    });

    let score = 0;
    aliasTerms.forEach((t, idx) => {
      if (!t || t.length < 4) return;
      if (qNorm.includes(t)) score += 900 - idx;
      else if (t.includes(qNorm) && qNorm.length >= 4) score += 700 - idx;
    });

    return { p, score };
  })
  .filter(s => s.score > 0)
  .sort((a, b) => b.score - a.score);

  if (aliasCandidates.length > 0) {
    const top = aliasCandidates[0];
    const second = aliasCandidates[1];

    if (!second || second.score < top.score) {
      return top.p;
    }
  }

  const alreadyMatched = P.some(p => {
    const boothMatched = extractAITerms(p.booth).some(t => t === qNorm);
    const companyMatched = extractAITerms(p.company).some(t =>
      t === qNorm || qNorm.includes(t)
    );
    return boothMatched || companyMatched;
  });

  if (alreadyMatched) return null;

  const candidates = P.map(p => {
    const company = String(p.company || '').trim();
    const booth = String(p.booth || '').trim();
    if (!company) return null;

    const companyCore = normalizeAICompanyCore(company);
    if (!companyCore || companyCore.length < 2) return null;

    let score = 0;

    if (qCore.includes(companyCore)) score += 120 + companyCore.length;
    else if (companyCore.includes(qCore) && qCore.length >= 4) score += 90 + qCore.length;
    else if (qCore.length >= 4 && qCore.slice(0, 3) === companyCore.slice(0, 3)) score += 70;

    if (score <= 0) return null;
    return { p, score, company, booth };
  })
  .filter(Boolean)
  .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return null;

  const top = candidates[0];
  const second = candidates[1];

  if (top.score < 72) return null;
  if (second && second.score >= top.score - 5) return null;

  return top.p;
}

function showAICompanySuggestion(originalMsg, product) {
  const msgs = document.getElementById('aiMsgs');
  if (!msgs || !product) return;

  const cardId = 'aiSuggest_' + Date.now();
  const company = product.company || '';
  const booth = product.booth || '';

  const div = document.createElement('div');
  div.className = 'ai-msg bot';
  div.id = cardId;

  div.innerHTML = `
    <div class="ai-bubble">
      <div style="font-weight:700;margin-bottom:6px">もしかして「${escapeHtml(company)}」ですか？</div>
      <div style="font-size:13px;color:#555;margin-bottom:10px">ブース ${escapeHtml(booth)} の出展社として案内できます。</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="aiUseCompanySuggestion('${cardId}','${escapeJsAttr(company)}')" style="background:#0F6E56;color:white;border:none;border-radius:18px;padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer">はい、これです</button>
        <button onclick="aiCancelCompanySuggestion('${cardId}','${escapeJsAttr(originalMsg)}')" style="background:#f5f5f3;color:#444;border:1px solid #ddd;border-radius:18px;padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer">違います</button>
      </div>
    </div>
    <div class="ai-time">${new Date().toLocaleTimeString('ja-JP', {hour:'2-digit',minute:'2-digit'})}</div>
  `;

  msgs.appendChild(div);
  scrollAiToBottom();
}

function aiUseCompanySuggestion(cardId, company) {
  const card = document.getElementById(cardId);
  if (card) card.remove();
  sendAIMessage(company + 'について教えて');
}

function aiCancelCompanySuggestion(cardId, originalMsg) {
  const card = document.getElementById(cardId);
  if (card) card.remove();

  const inp = document.getElementById('aiInp');
  if (inp) {
    inp.value = originalMsg;
    inp.focus();
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 100) + 'px';
  }
}

async function callOpenAI(userMsg) {
  if (!AI_ENABLED) return demoAIResponse(userMsg);

  const contextBooths = getAIContextBooths(userMsg);

  const boothContext = contextBooths.map(p =>
    `${p.booth} ${p.company}：${(p.tags||[]).slice(0,5).join('、')}`
  ).join('\n');

  const seminarsContext = SEMINARS.map(s =>
    `[${s.date} ${s.time}/${s.type||'セミナー'}] ${s.title}${s.speaker ? '／登壇: '+s.speaker : ''}（${s.venue}・${s.reservation}）`
  ).join('\n');

  let aiDocContext = '';
  if (AI_DOC && AI_DOC.length > 0) {
    const byCat = {};
    AI_DOC.forEach(item => {
      if (!byCat[item.category]) byCat[item.category] = [];
      byCat[item.category].push(item);
    });

    const parts = [];
    Object.keys(byCat).forEach(cat => {
      parts.push('■ ' + cat);
      byCat[cat].forEach(item => {
        let line = '・' + item.topic + ': ' + item.content;
        if (item.hint) line += '\n  [回答時のヒント] ' + item.hint;
        parts.push(line);
      });
    });

    aiDocContext = parts.join('\n');
  }

  const gyotaiCtx = GYOTAI_CONTEXT[visitorGyotai] || GYOTAI_CONTEXT[''];

  const systemPrompt = `あなたは「丸菱グループ 第37回食品機械と原材料 総合展2026」（6/10-11、マリンメッセ福岡A館）の来場者向けAIコンシェルジュです。

【来場者情報】
業態: ${visitorGyotai || '不明'}
利用区分: ${userType || '不明'}
${gyotaiCtx}

【会場の出展社（抜粋）】
${boothContext}

【セミナー・実演スケジュール】
${seminarsContext}

${aiDocContext ? '【補助資料（運営からの追加情報）】\n' + aiDocContext + '\n' : ''}
【施設情報】
- 出入口: 南側（A出口）
- 2Fセミナー会場: 階段で上がる
- 総合案内: 会場中央
- フードコーナー・ドリンクコーナー: 北側
- アウトレット市: 北西角
- 忘れ物・緊急連絡: 総合案内へ

【回答ルール】
1. 業態に合わせた専門的なアドバイスをする（${visitorGyotai || '全業態向け'}視点）
2. 出展社を案内する際は必ずブース番号を添える（例: ホシザキ C11）
3. 複数の関連出展社があれば最大5社提案する（多いほど出展社に公平）
4. 場所を聞かれたら「MAPで見る」ことを促す
5. 見積・詳細希望には丸菱営業担当への連携を提案する
6. 回答は簡潔に。200文字以内を目安にする
7. 必ず${({ja:'日本語',en:'英語',zh:'中国語',ko:'韓国語'})[lang]||'日本語'}で回答する（来場者が選択した表示言語に合わせる）。ただしブース番号・会社名・商品名・固有名詞は原文の表記のまま記載する
8. 複数の出展社を挙げる時は、必ず1社1行で改行する（例: "- 社名 ブース番号\n- 社名 ブース番号"）。横並びで列挙しない
9. 【会場の出展社（抜粋）】に該当出展社がある場合は、「情報がない」と答えず、その出展社情報をもとに案内する`;

  const payload = {
    action: 'ai',
    messages: JSON.stringify([
      {role: 'system', content: systemPrompt},
      ...aiHistory.slice(-6),
    ]),
    gyotai:  visitorGyotai,
    qr:      visitorQRCode || '',
    session: SESSION_ID,
    userType: userType || '',
  };

  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: Object.entries(payload).map(([k,v]) => encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&'),
  });

  if (!res.ok) throw new Error('GAS proxy error: ' + res.status);

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  return data.reply || demoAIResponse(userMsg);
}

function demoAIResponse(msg) {
  const m = msg.toLowerCase();

  if (P && P.length > 0) {
    const qNorm = normalizeAIText(msg);

    const scored = P.map(p => {
      return { p, score: scoreAIProduct(p, qNorm) };
    })
    .filter(s => s.score > 0)
    .sort((a,b) => b.score - a.score);

    if (scored.length > 0) {
      const list = scored.slice(0,5).map(s => `• ${s.p.booth} ${s.p.company}`).join('\n');
      return `「${msg}」に関連する出展社をご案内します:\n${list}\n\n詳細はブース番号でMAPをご確認ください。`;
    }
  }

  if (/セミナー|実演/.test(m)) {
    const s = SEMINARS[0];
    return s
      ? `セミナーは${s.date} ${s.time}〜「${s.title}」（${s.venue}・${s.reservation}）などがございます。セミナータブで全スケジュールをご確認ください。`
      : 'セミナー情報はセミナー・実演タブをご確認ください。';
  }

  if (/忘れ|落とした|なくし/.test(m)) {
    return '忘れ物・遺失物は会場中央の**総合案内**までお申し出ください。スタッフが対応いたします。';
  }

  if (/トイレ|wc|お手洗い/.test(m)) {
    return 'お手洗いは会場の四隅（東西の出入口付近）にございます。会場MAPでご確認いただけます。';
  }

  return `「${msg}」についてお調べします。現在AIキーが未設定のためデモモードで動作しています。「ブースを探す」から検索もご利用ください。`;
}

function appendAiMsg(role, text, id) {
  const msgs = document.getElementById('aiMsgs');
  if (!msgs) return;

  const now = new Date().toLocaleTimeString('ja-JP', {hour:'2-digit',minute:'2-digit'});
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;

  const bubbleClass = text === '...' ? 'ai-bubble loading' : 'ai-bubble';
  div.innerHTML = `<div class="${bubbleClass}"${id ? ' id="'+id+'"' : ''}>${escapeHtml(text).replace(/\n/g,'<br>')}</div><div class="ai-time">${now}</div>`;

  msgs.appendChild(div);
  scrollAiToBottom();
}

function appendSearchShortcut(afterEl, userMsg, aiReply) {
  if (!afterEl) return;
  if (/セミナー|実演|スケジュール|時間|挨拶|こんにちは|ありがとう|忘れ|トイレ/.test(userMsg)) return;

  const boothRegex = /([A-D])\s*0*([1-9][0-9]?)(?![0-9])/g;
  const foundBooths = [];
  const seen = new Set();

  if (aiReply) {
    let m;
    while ((m = boothRegex.exec(aiReply)) !== null) {
      const letter = m[1];
      const num = m[2].padStart(2, '0');
      const id = letter + num;
      if (!seen.has(id)) {
        seen.add(id);
        foundBooths.push(id);
      }
    }
  }

  if (foundBooths.length > 0) {
    const matched = foundBooths
      .map(id => P.find(p => (p.booth || '').replace(/\s/g, '').toUpperCase() === id))
      .filter(p => p);

    if (matched.length > 0) {
      const slotKey = '_aiResults_' + Date.now() + '_' + Math.floor(Math.random()*1000);
      window[slotKey] = matched;

      const btn = document.createElement('button');
      btn.style.cssText = 'margin-top:10px;width:100%;background:#fff;border:1.5px solid #0F6E56;color:#0F6E56;font-size:14px;font-weight:600;padding:12px 14px;border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;-webkit-tap-highlight-color:transparent';
      btn.innerHTML =
        '<span style="display:flex;align-items:center;gap:8px"><i class="ti ti-sparkles" style="font-size:16px"></i>' + tr('aiBoothsBtn', matched.length) + '</span>'
        + '<i class="ti ti-chevron-right" style="font-size:16px"></i>';

      btn.onclick = function() {
        const results = window[slotKey] || [];
        showResults(results, tr('aiBoothsLabel'));
      };

      afterEl.closest('.ai-msg').appendChild(btn);
      return;
    }
  }

  const matched = extractTagKeywords(userMsg + ' ' + (aiReply || ''), 2);
  if (matched.length === 0) return;

  const q = matched.join(' ');
  const btn = document.createElement('button');
  btn.style.cssText = 'margin-top:8px;background:#E1F5EE;border:1px solid #0F6E56;color:#0F6E56;font-size:12px;font-weight:600;padding:7px 14px;border-radius:20px;cursor:pointer;display:flex;align-items:center;gap:5px;-webkit-tap-highlight-color:transparent';
  btn.innerHTML = '<i class="ti ti-search" style="font-size:13px"></i> ' + tr('aiListBtn', escapeHtml(q));

  btn.onclick = function() {
    search(q, q);
  };

  afterEl.closest('.ai-msg').appendChild(btn);
}

function formatAIReply(text) {
  if (!text) return '';

  let t = escapeHtml(text);
  t = t.replace(/(?:\s|^)([1-9][0-9]?\.)(?=\s*\*?\*?[^\d])/g, '\n$1');
  t = t.replace(/(?:\s)(-\s|・|•\s)/g, '\n$1');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\n/g, '<br>');

  return t;
}

function extractTagKeywords(text, limit) {
  if (!P || P.length === 0 || !text) return [];

  const tagSet = new Set();

  P.forEach(p => (p.tags || []).forEach(t => {
    if (t && t.length >= 2) tagSet.add(t);
  }));

  P.forEach(p => {
    if (p.company && p.company.length >= 2) tagSet.add(p.company);
  });

  const tags = Array.from(tagSet).sort((a, b) => b.length - a.length);

  const found = [];
  let remaining = text;

  for (const tag of tags) {
    if (found.length >= limit) break;

    if (remaining.includes(tag)) {
      found.push(tag);
      remaining = remaining.split(tag).join(' ');
    }
  }

  return found;
}

function appendLeadCard(afterEl) {
  if (!afterEl) return;

  const card = document.createElement('div');
  card.className = 'ai-lead-card';
  card.innerHTML = `<div class="ai-lead-ttl">💼 丸菱営業担当へのご連絡</div>
    <div style="font-size:12px;color:#444441">より詳しい情報・お見積もりをご希望でしたら、展示会後に担当よりご連絡いたします。</div>
    <div class="ai-lead-btns">
      <button class="ai-lead-btn ai-lead-yes" onclick="aiRequestContact()">連絡を希望する</button>
      <button class="ai-lead-btn ai-lead-no" onclick="this.closest('.ai-lead-card').remove()">いいえ</button>
    </div>`;

  afterEl.closest('.ai-msg').after(card);
  scrollAiToBottom();
}

function aiRequestContact() {
  const lastQ = aiHistory.filter(h => h.role === 'user').slice(-1)[0]?.content || '';

  sendLog({
    keyword: '[問い合わせ希望] ' + lastQ,
    lang,
    booth: '',
    found: 'あり',
    searchCount: actionLog.aiQueries,
    userType: userType
  });

  const card = document.querySelector('.ai-lead-card');
  if (card) {
    card.innerHTML = '<div style="text-align:center;color:#0F6E56;font-size:13px;padding:4px">✅ 承りました。展示会後に担当よりご連絡いたします。</div>';
  }
}

function scrollAiToBottom() {
  const msgs = document.getElementById('aiMsgs');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}
