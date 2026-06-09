// ============================================================
// QRスキャン画面（入場証読み取り）
// ============================================================
let qrScanner = null;

function showQRScreen() {
  _currentView = showQRScreen;
  stopQRCamera();

  document.getElementById('screen').innerHTML = `
  <div class="screen">
    <div class="qr-wrap">
      <div class="qr-icon">📷</div>
      <div class="qr-ttl">${tr('qrTitle')}</div>
      <div class="qr-sub">${tr('qrSub')}</div>
      <div class="qr-scan-area" id="qrScanArea">
        <div class="qr-corner tl"></div><div class="qr-corner tr"></div>
        <div class="qr-corner bl"></div><div class="qr-corner br"></div>
        <div class="qr-scan-line"></div>
        <div id="qrReader" style="width:100%;height:100%;border-radius:14px;overflow:hidden"></div>
      </div>
      <div style="margin-top:8px">
        <button class="qr-skip" onclick="skipQR()">${tr('qrSkip')}</button>
      </div>
    </div>
  </div>`;

  startQRCamera();
}

function startQRCamera() {
  const video = document.createElement('video');
  video.setAttribute('playsinline', true);
  video.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:14px';

  const reader = document.getElementById('qrReader');
  if (!reader) return;

  reader.appendChild(video);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let scanning = true;

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      video.srcObject = stream;
      video.play();
      window._qrStream = stream;
      requestAnimationFrame(scanFrame);
    })
    .catch(() => {
      if (reader) {
        reader.innerHTML =
          '<div style="color:#888780;font-size:13px;padding:20px;text-align:center">' +
          tr('qrCamUnavailable') +
          '</div>';
      }
    });

  function scanFrame() {
    if (!scanning || !document.getElementById('qrReader')) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (typeof jsQR !== 'undefined') {
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          scanning = false;
          stopQRCamera();
          processQRCode(code.data);
          return;
        }
      }
    }

    requestAnimationFrame(scanFrame);
  }
}

function stopQRCamera() {
  if (window._qrStream) {
    window._qrStream.getTracks().forEach(t => t.stop());
    window._qrStream = null;
  }
}

function skipQR() {
  stopQRCamera();
  visitorGyotai = '';
  visitorQRCode = '';
  userType = '';
  saveVisitor();
  showUserTypeScreen();
}

function showUserTypeScreen() {
  _currentView = showUserTypeScreen;

  document.getElementById('screen').innerHTML = `
  <div class="screen" style="padding:34px 22px;display:flex;flex-direction:column;gap:14px;text-align:center">
    <div style="font-size:48px">👤</div>
    <div style="font-size:20px;font-weight:800;color:#1a1a18">利用区分を選択</div>
    <div style="font-size:13px;color:#73726c;line-height:1.6">
      QRなしで利用する場合は、該当する区分を選んでください。
    </div>

    <button onclick="selectUserType('visitor_no_qr')" style="width:100%;padding:16px;background:#0F6E56;color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer">
      QRなしの来場者
    </button>

    <button onclick="selectUserType('marubishi_staff')" style="width:100%;padding:16px;background:#534AB7;color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer">
      QRなしの丸菱
    </button>

    <button onclick="selectUserType('exhibitor')" style="width:100%;padding:16px;background:#A36B00;color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer">
      QRなしの出展社
    </button>

    <button onclick="showQRScreen()" style="width:100%;padding:13px;background:#f1f0eb;color:#444;border:none;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px">
      QR読み取りに戻る
    </button>
  </div>`;
}

function selectUserType(type) {
  visitorQRCode = '';
  visitorGyotai = '';
  userType = type;
  saveVisitor();

  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === '1') {
    recordEntryExit('入場');
  }

  showHome();
}

function processQRCode(code) {
  const normalized = code.trim().toLowerCase();
  const gyotai = GYOTAI_MAP[normalized] || null;

  stopQRCamera();
  visitorQRCode = normalized;
  visitorGyotai = gyotai || '';
  userType = 'visitor';
  saveVisitor();

  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === '1') {
    sendLog({
      keyword: '[QR入場]',
      lang: lang,
      booth: normalized,
      found: gyotai ? 'あり' : 'なし',
      searchCount: 0
    });

    recordEntryExit('入場');
  }

  showGyotaiConfirm(gyotai, normalized);
}

function showGyotaiConfirm(gyotai, qr) {
  _currentView = () => showGyotaiConfirm(gyotai, qr);

  document.getElementById('screen').innerHTML = `
  <div class="screen" style="padding:40px 24px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center">
    <div style="font-size:56px">✅</div>

    <div style="font-size:20px;font-weight:700;color:#1a1a18">
      ${tr('gcConfirmed')}
    </div>

    <div style="font-size:14px;color:#73726c">
      ${tr('gcQr', escapeHtml(qr))}
    </div>

    ${
      gyotai
        ? `<div>
            <div style="font-size:13px;color:#73726c;margin-bottom:6px">${tr('gcYourBiz')}</div>
            <span class="business-tag" style="font-size:15px;padding:6px 18px">${escapeHtml(gyotai)}</span>
          </div>`
        : `<div style="font-size:13px;color:#E24B4A">${tr('gcUndetected')}</div>`
    }

    <div style="font-size:12px;color:#888780;line-height:1.6">
      ${tr('gcAiNote')}
    </div>

    <button onclick="showHome()" style="width:100%;max-width:300px;padding:15px;background:#0F6E56;color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:600;cursor:pointer;margin-top:8px">
      <i class="ti ti-arrow-right"></i> ${tr('gcStart')}
    </button>
  </div>`;
}
