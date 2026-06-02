// ============================================================
// 通路データ（ユーザー指定）
// ============================================================
const H_CORRIDORS = [
  {"y":366,"x1":11,"x2":528},
  {"y":723,"x1":13,"x2":477},
  {"y":676,"x1":14,"x2":476},
  {"y":511,"x1":108,"x2":453},
  {"y":443,"x1":108,"x2":452},
  {"y":525,"x1":452,"x2":528},
  {"y":88,"x1":40,"x2":524},
  {"y":240,"x1":42,"x2":120},
  {"y":198,"x1":118,"x2":282},
  {"y":129,"x1":118,"x2":282},
  {"y":158,"x1":282,"x2":452},
  {"y":289,"x1":283,"x2":451},
  {"y":266,"x1":118,"x2":282},
  {"y":494,"x1":39,"x2":108},
  {"y":214,"x1":449,"x2":524},
  {"y":578,"x1":39,"x2":474},
  {"y":627,"x1":39,"x2":474},
  {"y":644,"x1":474,"x2":528}
];
const V_CORRIDORS = [
  {"x":450,"y1":88,"y2":366},
  {"x":524,"y1":88,"y2":366},
  {"x":282,"y1":88,"y2":366},
  {"x":282,"y1":366,"y2":723},
  {"x":127,"y1":676,"y2":723},
  {"x":14,"y1":676,"y2":723},
  {"x":39,"y1":494,"y2":676},
  {"x":108,"y1":366,"y2":676},
  {"x":452,"y1":366,"y2":525},
  {"x":474,"y1":525,"y2":723},
  {"x":528,"y1":366,"y2":644},
  {"x":118,"y1":88,"y2":266},
  {"x":120,"y1":266,"y2":366},
  {"x":41,"y1":88,"y2":366}
];

// ============================================================
// 通路グラフ構築（起動時に1回）
// ============================================================
let CORRIDOR_GRAPH = null;
function buildCorridorGraph() {
  const nodes = []; // {x,y}
  const edges = []; // {a,b,d}
  function findOrAdd(x, y) {
    for(let i=0; i<nodes.length; i++) {
      if(Math.abs(nodes[i].x-x)<0.5 && Math.abs(nodes[i].y-y)<0.5) return i;
    }
    nodes.push({x:x, y:y});
    return nodes.length - 1;
  }

  // H通路ごとに端点+交差点をノード化、隣接エッジ
  H_CORRIDORS.forEach(function(h) {
    const pts = [{x:h.x1, y:h.y}, {x:h.x2, y:h.y}];
    V_CORRIDORS.forEach(function(v) {
      if(v.x >= h.x1 && v.x <= h.x2 && h.y >= v.y1 && h.y <= v.y2) {
        pts.push({x:v.x, y:h.y});
      }
    });
    pts.sort(function(a,b){return a.x-b.x;});
    let prev = -1;
    pts.forEach(function(p) {
      const id = findOrAdd(p.x, p.y);
      if(prev !== -1 && prev !== id) {
        edges.push({a:prev, b:id, d:Math.abs(nodes[id].x - nodes[prev].x)});
      }
      prev = id;
    });
  });

  // V通路も同様
  V_CORRIDORS.forEach(function(v) {
    const pts = [{x:v.x, y:v.y1}, {x:v.x, y:v.y2}];
    H_CORRIDORS.forEach(function(h) {
      if(v.x >= h.x1 && v.x <= h.x2 && h.y >= v.y1 && h.y <= v.y2) {
        pts.push({x:v.x, y:h.y});
      }
    });
    pts.sort(function(a,b){return a.y-b.y;});
    let prev = -1;
    pts.forEach(function(p) {
      const id = findOrAdd(p.x, p.y);
      if(prev !== -1 && prev !== id) {
        edges.push({a:prev, b:id, d:Math.abs(nodes[id].y - nodes[prev].y)});
      }
      prev = id;
    });
  });

  // 近接ノード自動接続（通路端点の僅かなズレを吸収。例:x=282/y2=721 と y=723通路）
  const TOL = 6;
  for(let i=0; i<nodes.length; i++) {
    for(let j=i+1; j<nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const d = Math.hypot(dx, dy);
      if(d > 0 && d <= TOL) {
        edges.push({a:i, b:j, d:d});
      }
    }
  }
  return {nodes:nodes, edges:edges};
}

// ブース座標から最寄り通路点の候補リストを返す（上位n個）
function nearestCorridorPoints(bx, by, n) {
  n = n || 5;
  const cands = [];
  H_CORRIDORS.forEach(function(h, i) {
    let px;
    if(bx < h.x1) px = h.x1;
    else if(bx > h.x2) px = h.x2;
    else px = bx;
    cands.push({x:px, y:h.y, type:'h', idx:i, dist:Math.hypot(bx-px, by-h.y)});
  });
  V_CORRIDORS.forEach(function(v, i) {
    let py;
    if(by < v.y1) py = v.y1;
    else if(by > v.y2) py = v.y2;
    else py = by;
    cands.push({x:v.x, y:py, type:'v', idx:i, dist:Math.hypot(bx-v.x, by-py)});
  });
  cands.sort(function(a,b){ return a.dist - b.dist; });
  return cands.slice(0, n);
}

// 旧nearestCorridorPoint（残しておく：互換用）
function nearestCorridorPoint(bx, by) {
  const list = nearestCorridorPoints(bx, by, 1);
  return list[0];
}

// エントリーポイントをグラフに追加し、そのノードIDを返す
function insertEntryNode(graph, entry) {
  // 既存ノードに同座標があれば再利用
  for(let i=0; i<graph.nodes.length; i++) {
    if(Math.abs(graph.nodes[i].x-entry.x)<0.5 && Math.abs(graph.nodes[i].y-entry.y)<0.5) return i;
  }
  const newId = graph.nodes.length;
  graph.nodes.push({x:entry.x, y:entry.y});
  // 同じ通路上の全ノードと接続（後続のダイクストラで最短が選ばれる）
  if(entry.type === 'h') {
    const h = H_CORRIDORS[entry.idx];
    graph.nodes.forEach(function(n, i) {
      if(i === newId) return;
      if(Math.abs(n.y - h.y) < 0.5 && n.x >= h.x1 - 0.5 && n.x <= h.x2 + 0.5) {
        graph.edges.push({a:newId, b:i, d:Math.abs(entry.x - n.x)});
      }
    });
  } else {
    const v = V_CORRIDORS[entry.idx];
    graph.nodes.forEach(function(n, i) {
      if(i === newId) return;
      if(Math.abs(n.x - v.x) < 0.5 && n.y >= v.y1 - 0.5 && n.y <= v.y2 + 0.5) {
        graph.edges.push({a:newId, b:i, d:Math.abs(entry.y - n.y)});
      }
    });
  }
  return newId;
}

// ============================================================
// ダイクストラ最短経路
// ============================================================
function dijkstra(graph, start, end) {
  const n = graph.nodes.length;
  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  const visited = new Array(n).fill(false);
  const adj = new Array(n).fill(null).map(function(){return [];});
  graph.edges.forEach(function(e) {
    adj[e.a].push({to:e.b, w:e.d});
    adj[e.b].push({to:e.a, w:e.d});
  });
  dist[start] = 0;
  for(let i=0; i<n; i++) {
    let u = -1, mn = Infinity;
    for(let j=0; j<n; j++) {
      if(!visited[j] && dist[j] < mn) { mn = dist[j]; u = j; }
    }
    if(u === -1 || u === end) break;
    visited[u] = true;
    adj[u].forEach(function(e) {
      if(dist[u] + e.w < dist[e.to]) {
        dist[e.to] = dist[u] + e.w;
        prev[e.to] = u;
      }
    });
  }
  if(dist[end] === Infinity) return [];
  const path = [];
  for(let cur = end; cur !== -1; cur = prev[cur]) path.unshift(cur);
  return path;
}

// 経路探索メイン：ブースから「最寄りの通路」に直角に出て、そこから通路グラフで最短探索
function findCorridorRoute(from, to) {
  if(!CORRIDOR_GRAPH) return null;
  // それぞれ最寄りの通路点（1点のみ）→ ブース→通路を必ず通る
  const fEntry = nearestCorridorPoint(from.cx, from.cy);
  const tEntry = nearestCorridorPoint(to.cx, to.cy);
  if(!fEntry || !tEntry) return null;

  // グラフをコピー（エントリーノード追加用）
  const g = {
    nodes: CORRIDOR_GRAPH.nodes.map(function(n){return {x:n.x, y:n.y};}),
    edges: CORRIDOR_GRAPH.edges.slice()
  };
  const fId = insertEntryNode(g, fEntry);
  const tId = insertEntryNode(g, tEntry);
  const path = dijkstra(g, fId, tId);
  if(path.length === 0) return null;

  // ブース→通路点を「直角」にする（斜め線でブース壁を貫通するのを防ぐ）
  function rectifyEntry(boothXY, entry) {
    if(Math.abs(boothXY.x - entry.x) < 0.5 || Math.abs(boothXY.y - entry.y) < 0.5) {
      return [boothXY, {x:entry.x, y:entry.y}];
    }
    if(entry.type === 'h') {
      return [boothXY, {x:boothXY.x, y:entry.y}, {x:entry.x, y:entry.y}];
    } else {
      return [boothXY, {x:entry.x, y:boothXY.y}, {x:entry.x, y:entry.y}];
    }
  }
  const fromPart = rectifyEntry({x:from.cx, y:from.cy}, fEntry);
  const toPart = rectifyEntry({x:to.cx, y:to.cy}, tEntry).slice().reverse();
  const midPath = path.map(function(id){ return g.nodes[id]; });

  let points = [].concat(fromPart, midPath, toPart);
  // 連続する同座標を除去
  const clean = [points[0]];
  for(let i=1; i<points.length; i++) {
    const p = points[i], last = clean[clean.length-1];
    if(Math.abs(p.x-last.x)>0.5 || Math.abs(p.y-last.y)>0.5) clean.push(p);
  }
  // 経路の両端をブース円の手前(11px)で止める
  if(clean.length >= 2) {
    const p0 = clean[0], p1 = clean[1];
    const dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.hypot(dx, dy);
    if(len > 14) clean[0] = { x: p0.x + dx/len*11, y: p0.y + dy/len*11 };
    const pN = clean[clean.length-1], pN1 = clean[clean.length-2];
    const dx2 = pN1.x - pN.x, dy2 = pN1.y - pN.y, len2 = Math.hypot(dx2, dy2);
    if(len2 > 14) clean[clean.length-1] = { x: pN.x + dx2/len2*11, y: pN.y + dy2/len2*11 };
  }
  return 'M' + clean.map(function(p){return p.x+','+p.y;}).join(' L');
}

let _mapView = { x: 0, y: 0, w: 561, h: 734 };
