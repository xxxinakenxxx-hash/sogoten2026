// ============================================================
// 言語切替 / 音声入力
// ============================================================
function setLang(l, btn) {
  lang = l;
  document.querySelectorAll('.lb').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  applyStaticI18n();                       // ヘッダーを更新
  if (typeof _currentView === 'function') {
    _currentView();                        // 今の画面を新しい言語で再描画
  } else {
    showHome();
  }
}

// AIコンシェルジュ用 音声入力
function toggleAiMic() {
  const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('aiMicBtn');
  const inp = document.getElementById('aiInp');
  if (!SR) { alert(tr('micUnsupported')); return; }
  if (listening) {
    recognition && recognition.stop();
    listening = false;
    if (btn) btn.classList.remove('rec');
    return;
  }
  recognition = new SR();
  recognition.lang = lang==='ja'?'ja-JP':lang==='zh'?'zh-CN':lang==='ko'?'ko-KR':'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = e => {
    const t = e.results[0][0].transcript;
    listening = false;
    if (btn) btn.classList.remove('rec');
    if (inp) {
      inp.value = t;
      // 自動で送信
      aiSend();
    }
  };
  recognition.onerror = recognition.onend = () => {
    listening = false;
    if (btn) btn.classList.remove('rec');
  };
  recognition.start();
  listening = true;
  if (btn) btn.classList.add('rec');
}

function toggleMic() {
  const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('mic');
  if (!SR) return;
  if (listening) {
    recognition && recognition.stop();
    listening = false;
    if (btn) btn.classList.remove('rec');
    return;
  }
  recognition = new SR();
  recognition.lang = lang==='ja'?'ja-JP':lang==='zh'?'zh-CN':lang==='ko'?'ko-KR':'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = e => {
    const t = e.results[0][0].transcript;
    listening = false;
    if (btn) btn.classList.remove('rec');
    search(t, t);
  };
  recognition.onerror = recognition.onend = () => {
    listening = false;
    if (btn) btn.classList.remove('rec');
  };
  recognition.start();
  listening = true;
  if (btn) btn.classList.add('rec');
}
