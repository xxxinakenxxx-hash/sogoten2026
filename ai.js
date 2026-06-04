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

  document.getElementById('aiWelcomeTime').textContent = new Date().toLocaleTimeString('ja-JP', {hour:'2-digit',minute:'2-digit'});
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
  inp.value = '';
  inp.style.height = 'auto';

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

async function callOpenAI(userMsg) {
  if (!AI_ENABLED) return demoAIResponse(userMsg);

  const qNormAI = userMsg.replace(/[\s　。、？！]+/g, '').toLowerCase();
  let contextBooths = [];
  if (qNormAI.length >= 2) {
    const scored = P.map(p => {
      const tags = p.tags || [];
      let score = 0;
      tags.forEach((tag, idx) => {
        const t = tag.toLowerCase();
        if (t === qNormAI) score += 100 - idx;
        else if (t.includes(qNormAI)) score += 50 - idx;
        else if (qNormAI.includes(t) && t.length >= 2) score += 20 - idx;
      });
      return { p, score };
    });
    scored.sort((a, b) => b.score - a.score);
    contextBooths = scored.map(s => s.p).slice(0, 80);
  } else {
    contextBooths = P.slice(0, 80);
  }

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
8. 複数の出展社を挙げる時は、必ず1社1行で改行する（例: "- 社名 ブース番号\n- 社名 ブース番号"）。横並びで列挙しない`;

  const payload = {
    action: 'ai',
    messages: JSON.stringify([
      {role: 'system', content: systemPrompt},
      ...aiHistory.slice(-6),
    ]),
    gyotai:  visitorGyotai,
    qr:      visitorQRCode || '',
    session: SESSION_ID,
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
    const qNorm = msg.replace(/[　\s]/g,'').toLowerCase();
    const scored = P.map(p => {
      let score = 0;
      (p.tags||[]).forEach((tag, idx) => {
        const t = tag.toLowerCase();
        if (t === qNorm)            score += 100 - idx;
        else if (t.includes(qNorm)) score += 50 - idx;
        else if (qNorm.includes(t) && t.length >= 2) score += 20 - idx;
      });
      return { p, score };
    }).filter(s => s.score > 0).sort((a,b) => b.score - a.score);
    if (scored.length > 0) {
      const list = scored.slice(0,5).map(s => `• ${s.p.booth} ${s.p.company}`).join('\n');
      return `「${msg}」に関連する出展社をご案内します:\n${list}\n\n詳細はブース番号でMAPをご確認ください。`;
    }
  }
  if (/セミナー|実演/.test(m)) {
    const s = SEMINARS[0];
    return s ? `セミナーは${s.date} ${s.time}〜「${s.title}」（${s.venue}・${s.reservation}）などがございます。セミナータブで全スケジュールをご確認ください。` : 'セミナー情報はセミナー・実演タブをご確認ください。';
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
  btn.onclick = function() { search(q, q); };
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
  P.forEach(p => { if (p.company && p.company.length >= 2) tagSet.add(p.company); });

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
  const lastQ = aiHistory.filter(h=>h.role==='user').slice(-1)[0]?.content || '';
  sendLog({ keyword: '[問い合わせ希望] ' + lastQ, lang, booth: '', found: 'あり', searchCount: actionLog.aiQueries });
  const card = document.querySelector('.ai-lead-card');
  if (card) card.innerHTML = '<div style="text-align:center;color:#0F6E56;font-size:13px;padding:4px">✅ 承りました。展示会後に担当よりご連絡いたします。</div>';
}

function scrollAiToBottom() {
  const msgs = document.getElementById('aiMsgs');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}
