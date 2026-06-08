// ============================================================
// ★ GAS Web App URL をここに設定してください
// ============================================================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyavH18rQHlhsjPkECUxr9oiyCU0AKhf0aWcG3G53FzF6r1vitTwxDRDULji2iOKU3h/exec';

// ?ai=1 のときだけOpenAI呼び出し。未指定はデモモード（APIキー不要）
let AI_ENABLED = true;
let RECEPTION_MODE = false;

// ============================================================
// 状態管理
// ============================================================
let lang        = 'ja';
let fuse        = null; // Fuse.js インスタンス
let listening   = false;
let recognition = null;
let searchCount = 0;
let visitedBooths = [];  // アンケート用：検索でヒットしたブース履歴

// マイメモ（localStorage連携）
const MEMO_KEY = 'sogoten2026_mymemos';
let myMemos = [];  // [{booth, company, memo, ts}]
let currentSearchResults = null;
let currentSearchLabel = null;

try {
  myMemos = JSON.parse(localStorage.getItem(MEMO_KEY) || '[]');
} catch(e) {
  myMemos = [];
}

function saveMemos() {
  try {
    localStorage.setItem(MEMO_KEY, JSON.stringify(myMemos));
  } catch(e) {}
}

function findMemo(booth) {
  return myMemos.find(m => m.booth === booth);
}

function addMemo(booth, company, memo) {
  const existing = findMemo(booth);
  if (existing) {
    existing.memo = memo;
    existing.ts = Date.now();
  } else {
    myMemos.push({ booth, company, memo: memo || '', ts: Date.now() });
  }
  saveMemos();
}

function deleteMemo(booth) {
  myMemos = myMemos.filter(m => m.booth !== booth);
  saveMemos();
}

// セッションID（1回の来場につき1つ）
const SESSION_ID = 'S' + Date.now().toString(36).toUpperCase();

// ============================================================
// 業態・QR・同意管理
// ============================================================
const CONSENT_KEY  = 'sogoten2026_consent';
const VISITOR_KEY  = 'sogoten2026_visitor';
const SESSION_START = Date.now();

// 業態マスタ（kd69-xxxx → 業態名）
// 実本番ではGASのSPIRAL DBと連携。現在はダミー11業態で動作
const GYOTAI_MAP = {
  'kd69-0001': 'パン製造業',
  'kd69-0002': 'ケーキ・洋菓子製造業',
  'kd69-0003': '和菓子製造業',
  'kd69-0004': '小売・流通業',
  'kd69-0005': '飲食店',
  'kd69-0006': 'ホテル・ブライダル',
  'kd69-0007': '食品卸・商社',
  'kd69-0008': '学校・給食',
  'kd69-0009': 'アイスクリーム・ジェラート',
  'kd69-0010': 'コーヒー・カフェ',
  'kd69-0011': 'その他',
};

// 業態別AIプロンプト補足
const GYOTAI_CONTEXT = {
  'パン製造業': '製パン・ベーカリーの専門家として回答。製パン工程、食パン・バゲット・クロワッサンなどの専門知識を活かす。',
  'ケーキ・洋菓子製造業': 'パティシエ・洋菓子製造の専門家として回答。デコレーション、焼成、冷凍デザートなどの専門知識を活かす。',
  '和菓子製造業': '和菓子職人の視点で回答。餡・求肥・練り切りなど和菓子素材・機械に詳しく案内する。',
  '小売・流通業': '食品小売・流通業者の視点で回答。容量・賞味期限・価格帯・POP素材など販売適性を重視する。',
  '飲食店': '飲食店経営者の視点で回答。コスト・オペレーション効率・メニュー開発に焦点を当てる。',
  'ホテル・ブライダル': 'ホテル・ウェディング業界の視点で回答。高品質・プレゼンテーション・大量調理に焦点を当てる。',
  '食品卸・商社': '食品卸・商社の視点で回答。ロット・価格・供給安定性・輸入品情報を重視する。',
  '学校・給食': '給食・集団調理の視点で回答。アレルゲン対応・大量調理・コスト管理を重視する。',
  'アイスクリーム・ジェラート': 'アイスクリーム・ジェラート製造の専門家として回答。乳脂肪・フリーザー・原料配合に詳しく案内する。',
  'コーヒー・カフェ': 'カフェ・コーヒー専門店の視点で回答。抽出機器・食材ペアリング・スイーツメニューに焦点を当てる。',
  '': '食品業界のプロとして回答する。',
};

let visitorGyotai = '';      // 判定済み業態名
let visitorQRCode = '';      // スキャン済みQRコード
let userType = '';           // visitor / visitor_no_qr / marubishi_staff / exhibitor
let appStartTime  = Date.now();

// ビジタープロフィールをsessionStorageで管理（再読込でも維持）
try {
  const vd = JSON.parse(sessionStorage.getItem(VISITOR_KEY) || '{}');
  visitorGyotai = vd.gyotai || '';
  visitorQRCode = vd.qr || '';
  userType = vd.userType || '';
} catch(e) {}

function saveVisitor() {
  try {
    sessionStorage.setItem(VISITOR_KEY, JSON.stringify({
      gyotai: visitorGyotai,
      qr: visitorQRCode,
      userType: userType
    }));
  } catch(e) {}
}

function setUserType(type) {
  userType = type || '';
  saveVisitor();
}

function getUserType() {
  return userType || '';
}

// 行動ログ（退場レポート用）
let actionLog = {
  searchKeywords: [],   // [{q, ts}]
  viewedBooths:   [],   // [{booth, company, ts}]
  aiQueries:      0,
};

try {
  const al = JSON.parse(sessionStorage.getItem('sogoten2026_actions') || '{}');
  if (al.searchKeywords) actionLog = al;
} catch(e) {}

function saveActionLog() {
  try {
    sessionStorage.setItem('sogoten2026_actions', JSON.stringify(actionLog));
  } catch(e) {}
}

function logKeyword(q) {
  if (!q || actionLog.searchKeywords.find(x => x.q === q)) return;
  actionLog.searchKeywords.push({ q, ts: Date.now() });
  saveActionLog();
}

function logBooth(booth, company) {
  if (!booth || actionLog.viewedBooths.find(x => x.booth === booth)) return;
  actionLog.viewedBooths.push({ booth, company, ts: Date.now() });
  saveActionLog();
}

// AI会話履歴
let aiHistory = [];  // [{role:'user'|'assistant', content:'...'}]

// 商品データ（GASから取得 or フォールバック）
let P = [];
let SEMINARS = [];
let AI_DOC = [];  // AI補助資料
let VENUE_SVG_INNER = '';  // venue_map.svgの中身（fetchで取得）
