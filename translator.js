window._transDir = 'on-en';

function ensureTranslateUI() {
  var tc = document.getElementById('translateCard');
  if (tc) tc.remove();
  tc = document.createElement('div');
  tc.id = 'translateCard';
  tc.style.cssText = 'display:none;flex-direction:column;gap:10px;height:100%;';
  tc.innerHTML =
    '<div style="flex:1;min-height:130px;background:#1c1008;border:1.5px solid #6e4e26;border-radius:12px;padding:12px;display:flex;flex-direction:column;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<span id="tSrcLang" style="color:#b8925a;font-size:12px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;">Old Norse</span>' +
        '<button type="button" onclick="clearVerticalTrans()" style="background:#2b190c;border:1px solid #6e4e26;border-radius:6px;color:#e6c088;font-size:12px;padding:3px 10px;cursor:pointer;">Clear</button>' +
      '</div>' +
      '<textarea id="translateInput" oninput="runVerticalTranslate(this.value)" placeholder="Enter Old Norse or English text..." style="flex:1;width:100%;box-sizing:border-box;background:transparent;border:none;outline:none;resize:none;color:#f3d6a8;font-size:17px;line-height:1.5;font-family:inherit;"></textarea>' +
    '</div>' +
    '<div style="display:flex;justify-content:center;align-items:center;gap:10px;">' +
      '<button type="button" onclick="swapVerticalLangs()" style="background:#3a2210;border:1.5px solid #b88446;border-radius:20px;color:#ffe2b0;font-weight:bold;font-size:13px;padding:7px 18px;cursor:pointer;">Old Norse ⇄ English</button>' +
    '</div>' +
    '<div style="flex:1;min-height:130px;background:#160d06;border:1.5px solid #5c3f21;border-radius:12px;padding:12px;display:flex;flex-direction:column;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<span id="tDstLang" style="color:#b8925a;font-size:12px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;">English</span>' +
        '<button type="button" id="tCopyBtn" onclick="copyVerticalTrans()" style="background:#2b190c;border:1px solid #6e4e26;border-radius:6px;color:#e6c088;font-size:12px;padding:3px 10px;cursor:pointer;">Copy</button>' +
      '</div>' +
      '<div id="translateOutputBox" style="flex:1;overflow-y:auto;color:#ffd096;font-size:17px;line-height:1.5;white-space:pre-wrap;">Translation</div>' +
    '</div>';
  document.body.appendChild(tc);
  return tc;
}

function cleanGlossText(r) {
  var rw = r.zoega_def || r.wiki_def || r.cleasby_def || r.onp_def || '';
  rw = String(rw).replace(/<[^>]+>/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!rw) return '';
  var first = rw.split(/[;,\n]/).trim();
  first = first.replace(/^(to|a|an|the)\s+/i, '').trim();
  return first;
}

function translateOnWord(w) {
  if (typeof db === 'undefined' || !db) return w;
  var l = w.toLowerCase();
  var s1 = db.prepare("SELECT zoega_def, wiki_def, cleasby_def, onp_def FROM lemmas WHERE LOWER(headword) = ? LIMIT 1");
  s1.bind([l]);
  var row = s1.step() ? s1.getAsObject() : null;
  s1.free();
  if (!row) {
    var s2 = db.prepare("SELECT l.zoega_def, l.wiki_def, l.cleasby_def, l.onp_def FROM wordforms wf JOIN lemmas l ON wf.lemma_id = l.id WHERE LOWER(wf.form) = ? LIMIT 1");
    s2.bind([l]);
    row = s2.step() ? s2.getAsObject() : null;
    s2.free();
  }
  if (!row) return w;
  var g = cleanGlossText(row);
  return g || w;
}

function translateEnWord(w) {
  if (typeof db === 'undefined' || !db) return w;
  var l = w.toLowerCase().replace(/[^a-z']/g, '');
  if (!l) return w;
  var sql = "SELECT headword FROM lemmas WHERE LOWER(COALESCE(zoega_def,'') || ' ' || COALESCE(wiki_def,'') || ' ' || COALESCE(cleasby_def,'')) LIKE ? " +
    "ORDER BY CASE WHEN LOWER(COALESCE(zoega_def,'')) LIKE ? THEN 0 WHEN LOWER(COALESCE(wiki_def,'')) LIKE ? THEN 1 ELSE 2 END, LENGTH(headword) ASC LIMIT 1";
  var st = db.prepare(sql);
  st.bind(['%' + l + '%', l + '%', l + '%']);
  var row = st.step() ? st.getAsObject() : null;
  st.free();
  return (row && row.headword) ? row.headword : w;
}

function swapVerticalLangs() {
  window._transDir = (window._transDir === 'on-en') ? 'en-on' : 'on-en';
  var isOnEn = window._transDir === 'on-en';
  var sL = document.getElementById('tSrcLang'), dL = document.getElementById('tDstLang');
  if (sL) sL.textContent = isOnEn ? 'Old Norse' : 'English';
  if (dL) dL.textContent = isOnEn ? 'English' : 'Old Norse';
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
  var out = document.getElementById('translateOutputBox');
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
  // Auto-switch to Old Norse -> English if special Old Norse characters are typed
  if (/[áéíóúýæœøǫþðʀÁÉÍÓÚÝÆŒØǪÞÐƦ]/.test(txt) && window._transDir !== 'on-en') {
    window._transDir = 'on-en';
    var sL = document.getElementById('tSrcLang'), dL = document.getElementById('tDstLang');
    if (sL) sL.textContent = 'Old Norse';
    if (dL) dL.textContent = 'English';
  }
  out.style.color = '#ffd096';
  var isOnEn = window._transDir === 'on-en';
  var lines = txt.split('\n').map(function(line) {
    return line.replace(/[A-Za-záéíóúýæœøǫþðʀÁÉÍÓÚÝÆŒØǪÞÐƦ']+/g, function(tok) {
      var res = isOnEn ? translateOnWord(tok) : translateEnWord(tok);
      if (tok && tok === tok.toUpperCase() && res) {
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
