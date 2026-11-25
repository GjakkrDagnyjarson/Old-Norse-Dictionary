window._transDir = 'on-en';
var _defCols = null;

function getDefCols() {
  if (_defCols) return _defCols;
  if (typeof db === 'undefined' || !db) return [];
  var st = db.prepare("PRAGMA table_info(lemmas)"), all = [];
  while (st.step()) all.push(st.getAsObject().name);
  st.free();
  var order = ['zoega_def', 'wiki_defs', 'wiki_def', 'cleasby_def', 'onp_def'];
  var found = order.filter(function(c) { return all.indexOf(c) !== -1; });
  if (!found.length) found = all.filter(function(c) { return /def|gloss|meaning/i.test(c); });
  _defCols = found;
  return found;
}

function ensureTranslateUI() {
  var tc = document.getElementById('translateCard');
  if (tc) tc.remove();
  tc = document.createElement('div');
  tc.id = 'translateCard';
  tc.style.cssText = 'display:none;flex-direction:column;gap:8px;height:100%;';
  tc.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;background:#1c1008;border:1px solid #6e4e26;border-radius:8px;padding:6px 8px;flex-shrink:0;">' +
      '<span id="tSrcLang" style="flex:1;text-align:center;color:#f0d3a2;font-size:12px;font-weight:bold;letter-spacing:0.5px;">OLD NORSE</span>' +
      '<button type="button" onclick="swapVerticalLangs()" style="background:#3a2210;border:1.5px solid #b88446;border-radius:6px;color:#ffe2b0;font-weight:bold;font-size:13px;padding:4px 12px;cursor:pointer;">⇄</button>' +
      '<span id="tDstLang" style="flex:1;text-align:center;color:#f0d3a2;font-size:12px;font-weight:bold;letter-spacing:0.5px;">ENGLISH</span>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;flex:1;min-height:0;">' +
      '<div style="background:#1c1008;border:1.5px solid #6e4e26;border-radius:10px;padding:10px;display:flex;flex-direction:column;min-height:0;">' +
        '<div style="display:flex;justify-content:flex-end;margin-bottom:6px;flex-shrink:0;">' +
          '<button type="button" onclick="clearVerticalTrans()" style="background:#2b190c;border:1px solid #6e4e26;border-radius:5px;color:#e6c088;font-size:11px;padding:2px 8px;cursor:pointer;">Clear</button>' +
        '</div>' +
        '<textarea id="translateInput" oninput="runVerticalTranslate(this.value)" placeholder="Type here..." style="flex:1;width:100%;box-sizing:border-box;background:transparent;border:none;outline:none;resize:none;color:#f3d6a8;font-size:15px;line-height:1.45;font-family:inherit;"></textarea>' +
      '</div>' +
      '<div style="background:#160d06;border:1.5px solid #5c3f21;border-radius:10px;padding:10px;display:flex;flex-direction:column;min-height:0;">' +
        '<div style="display:flex;justify-content:flex-end;margin-bottom:6px;flex-shrink:0;">' +
          '<button type="button" id="tCopyBtn" onclick="copyVerticalTrans()" style="background:#2b190c;border:1px solid #6e4e26;border-radius:5px;color:#e6c088;font-size:11px;padding:2px 8px;cursor:pointer;">Copy</button>' +
        '</div>' +
        '<div id="translateOutputBox" style="flex:1;overflow-y:auto;color:#8a6b43;font-size:15px;line-height:1.45;white-space:pre-wrap;word-break:break-word;">Translation</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(tc);
  return tc;
}

function cleanGlossText(r) {
  var cols = getDefCols(), rw = '';
  for (var i = 0; i < cols.length; i++) {
    if (r[cols[i]]) { rw = String(r[cols[i]]); break; }
  }
  rw = rw.replace(/<[^>]+>/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!rw) return '';
  var first = rw.split(/[;,\n]/).trim();
  return first.replace(/^(to|a|an|the)\s+/i, '').trim();
}

function translateOnWord(w) {
  if (typeof db === 'undefined' || !db) return w;
  var cols = getDefCols();
  if (!cols.length) return w;
  var sel = cols.join(', '), l = w.toLowerCase();
  var s1 = db.prepare("SELECT " + sel + " FROM lemmas WHERE LOWER(headword) = ? LIMIT 1");
  s1.bind([l]);
  var row = s1.step() ? s1.getAsObject() : null;
  s1.free();
  if (!row) {
    var lSel = cols.map(function(c) { return "l." + c; }).join(', ');
    var s2 = db.prepare("SELECT " + lSel + " FROM wordforms wf JOIN lemmas l ON wf.lemma_id = l.id WHERE LOWER(wf.form) = ? LIMIT 1");
    s2.bind([l]);
    row = s2.step() ? s2.getAsObject() : null;
    s2.free();
  }
  if (!row) return w;
  return cleanGlossText(row) || w;
}

function translateEnWord(w) {
  if (typeof db === 'undefined' || !db) return w;
  var cols = getDefCols(), l = w.toLowerCase().replace(/[^a-z']/g, '');
  if (!cols.length || !l) return w;
  var concat = cols.map(function(c) { return "COALESCE(" + c + ",'')"; }).join(" || ' ' || ");
  var firstCol = "COALESCE(" + cols + ",'')";
  var sql = "SELECT headword FROM lemmas WHERE LOWER(" + concat + ") LIKE ? ORDER BY CASE WHEN LOWER(" + firstCol + ") LIKE ? THEN 0 WHEN LOWER(" + firstCol + ") LIKE ? THEN 1 ELSE 2 END, LENGTH(headword) ASC LIMIT 1";
  var st = db.prepare(sql);
  st.bind(['%' + l + '%', l + '%', '% ' + l + '%']);
  var row = st.step() ? st.getAsObject() : null;
  st.free();
  return (row && row.headword) ? row.headword : w;
}

function swapVerticalLangs() {
  window._transDir = (window._transDir === 'on-en') ? 'en-on' : 'on-en';
  var isOnEn = window._transDir === 'on-en';
  var sL = document.getElementById('tSrcLang'), dL = document.getElementById('tDstLang');
  if (sL) sL.textContent = isOnEn ? 'OLD NORSE' : 'ENGLISH';
  if (dL) dL.textContent = isOnEn ? 'ENGLISH' : 'OLD NORSE';
  var inp = document.getElementById('translateInput'), out = document.getElementById('translateOutputBox');
  if (inp && out && out.textContent && out.textContent !== 'Translation') {
    inp.value = out.textContent;
  }
  if (inp) runVerticalTranslate(inp.value);
}

function clearVerticalTrans() {
  var inp = document.getElementById('translateInput');
  if (inp) inp.value = '';
  runVerticalTranslate('');
}

function copyVerticalTrans() {
  var out = document.getElementById('translateOutputBox'), btn = document.getElementById('tCopyBtn');
  if (!out || !out.textContent || out.textContent === 'Translation') return;
  if (navigator.clipboard) navigator.clipboard.writeText(out.textContent);
  if (btn) { btn.textContent = 'Copied'; setTimeout(function(){ btn.textContent = 'Copy'; }, 1200); }
}

function runVerticalTranslate(raw) {
  var out = document.getElementById('translateOutputBox'), st = document.getElementById('subStatus');
  if (st) { st.textContent = ''; st.style.display = 'none'; }
  if (!out) return;
  var txt = (raw || '');
  if (!txt.trim()) {
    out.style.color = '#8a6b43';
    out.textContent = 'Translation';
    return;
  }
  if (typeof db === 'undefined' || !db) {
    out.textContent = 'Loading dictionary…';
    return;
  }
  if (/[áéíóúýæœøǫþðʀÁÉÍÓÚÝÆŒØǪÞÐƦ]/.test(txt) && window._transDir !== 'on-en') {
    window._transDir = 'on-en';
    var sL = document.getElementById('tSrcLang'), dL = document.getElementById('tDstLang');
    if (sL) sL.textContent = 'OLD NORSE';
    if (dL) dL.textContent = 'ENGLISH';
  }
  out.style.color = '#ffd096';
  var isOnEn = window._transDir === 'on-en';
  var lines = txt.split('\n').map(function(line) {
    return line.replace(/[A-Za-záéíóúýæœøǫþðʀÁÉÍÓÚÝÆŒØǪÞÐƦ']+/g, function(tok) {
      var res = isOnEn ? translateOnWord(tok) : translateEnWord(tok);
      if (tok && tok.charAt(0) === tok.charAt(0).toUpperCase() && tok.charAt(0) !== tok.charAt(0).toLowerCase() && res) {
        res = res.charAt(0).toUpperCase() + res.slice(1);
      }
      return res;
    });
  });
  out.textContent = lines.join('\n');
}

(function(){
  var oFS = window.openFullScreenView;
  window.openFullScreenView = function(v, t) {
    var tc = ensureTranslateUI(), fb = document.getElementById('fsBody');
    if (tc && fb && tc.parentElement !== fb) fb.appendChild(tc);
    if (tc) tc.style.display = 'none';
    if (typeof oFS === 'function') oFS(v, t);
    if (v === 'translate') {
      var ft = document.getElementById('fsTitle');
      if (ft) ft.textContent = 'Translate';
      if (tc) tc.style.display = 'flex';
      var i = document.getElementById('translateInput');
      if (i) setTimeout(function(){ i.focus(); }, 50);
    }
  };
})();
