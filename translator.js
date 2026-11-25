window._transDir = 'auto';
var _lemmaCols = null;

function getLemmaCols() {
  if (_lemmaCols) return _lemmaCols;
  if (typeof db === 'undefined' || !db) return null;
  var st = db.prepare("PRAGMA table_info(lemmas)"), cols = [];
  while (st.step()) cols.push(st.getAsObject().name);
  st.free();
  _lemmaCols = cols;
  return cols;
}

function getGloss(r) {
  var c = getLemmaCols() || Object.keys(r);
  var pr = ['gloss','definition','definitions','meaning','meanings','defn','english','text','body','sense','senses'];
  var rw = '';
  for (var i = 0; i < pr.length; i++) if (r[pr[i]]) { rw = String(r[pr[i]]); break; }
  if (!rw) for (var j = 0; j < c.length; j++) if (['id','headword','pos','gender','sort_key','source','sources'].indexOf(c[j]) === -1 && r[c[j]]) { rw = String(r[c[j]]); break; }
  rw = rw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!rw) return '(no definition)';
  var sg = rw.split(/[;\n]/)[0].trim();
  return sg.length > 90 ? sg.slice(0, 87) + '…' : sg;
}

function lkON(w) {
  if (typeof db === 'undefined' || !db) return null;
  var l = w.toLowerCase(), h = [];
  var s1 = db.prepare("SELECT * FROM lemmas WHERE LOWER(headword) = ? LIMIT 3");
  s1.bind([l]);
  while (s1.step()) h.push({ l: s1.getAsObject(), f: '' });
  s1.free();
  if (h.length) return h;
  var s2 = db.prepare("SELECT l.*, wf.case_name, wf.number, wf.definiteness FROM wordforms wf JOIN lemmas l ON wf.lemma_id = l.id WHERE LOWER(wf.form) = ? LIMIT 3");
  s2.bind([l]);
  while (s2.step()) { var r = s2.getAsObject(); h.push({ l: r, f: [r.case_name, r.number, r.definiteness].filter(Boolean).join(' ') }); }
  s2.free();
  return h.length ? h : null;
}

function lkEN(w) {
  if (typeof db === 'undefined' || !db) return null;
  var c = (getLemmaCols() || []).filter(function(x){ return ['id','headword','pos','gender','sort_key','source','sources'].indexOf(x) === -1; });
  if (!c.length) return null;
  var col = c[0], l = w.toLowerCase().replace(/[^a-z']/g, '');
  if (!l) return null;
  var st = db.prepare("SELECT * FROM lemmas WHERE LOWER(" + col + ") LIKE ? ORDER BY CASE WHEN LOWER(" + col + ") LIKE ? THEN 0 WHEN LOWER(" + col + ") LIKE ? THEN 1 ELSE 2 END, LENGTH(headword) ASC LIMIT 4");
  st.bind(['%' + l + '%', l + '%', '% ' + l + '%']);
  var h = [], rx = new RegExp('\\b' + l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
  while (st.step()) { var r = st.getAsObject(); if (rx.test(getGloss(r).toLowerCase()) || !h.length) h.push(r); }
  st.free();
  return h.length ? h : null;
}

function setTransDir(d) {
  window._transDir = d;
  [['tModeAuto','auto'],['tModeOnEn','on-en'],['tModeEnOn','en-on']].forEach(function(x) {
    var e = document.getElementById(x[0]);
    if (!e) return;
    var a = d === x[1];
    e.style.borderColor = a ? '#b88446' : '#4a3319';
    e.style.background = a ? '#3a2210' : '#1c1008';
    e.style.color = a ? '#ffe2b0' : '#a8875a';
  });
  var i = document.getElementById('translateInput');
  if (i) runOnEngTranslate(i.value);
}

function runOnEngTranslate(t) {
  var sb = document.getElementById('translateSummaryBox'), bb = document.getElementById('translateBreakdown');
  if (!sb || !bb) return;
  var s = (t || '').trim();
  if (!s) { sb.innerHTML = 'Type any Old Norse or English word or phrase above.'; bb.innerHTML = ''; return; }
  if (typeof db === 'undefined' || !db) { sb.textContent = 'Loading Old Norse dictionary database…'; return; }
  var toks = s.split(/\s+/).map(function(x){ return x.replace(/^[.,!?;:"'()[\]]+|[.,!?;:"'()[\]]+$/g, ''); }).filter(Boolean);
  var hasON = /[áéíóúýæœøǫþðʀÁÉÍÓÚÝÆŒØǪÞÐƦ]/.test(s), dir = window._transDir, gl = [], rl = [], cd = [];
  toks.forEach(function(tk) {
    var on = dir !== 'en-on' ? lkON(tk) : null;
    var en = (dir !== 'on-en' && (!on || dir === 'en-on' || !hasON)) ? lkEN(tk) : null;
    var preferON = (dir === 'on-en') || (dir === 'auto' && hasON && on);
    if (preferON && on) {
      gl.push(getGloss(on[0].l).split(',')[0].trim());
      if (typeof toYoungerFuthark === 'function') rl.push(toYoungerFuthark(tk));
      cd.push(on.map(function(x){ var l = x.l, m = [l.pos, l.gender, x.f].filter(Boolean).join(' • '); return '<div onclick="if(typeof openEntry===\'function\')openEntry(' + l.id + ')" style="background:#1c1008;border:1px solid #5c3f21;border-radius:8px;padding:8px 10px;cursor:pointer;"><strong style="color:#ffd096;">' + l.headword + '</strong> <span style="color:#a8895c;font-size:11px;">' + m + '</span><div style="color:#e6c088;font-size:13px;">' + getGloss(l) + '</div></div>'; }).join(''));
    } else if (en && en.length) {
      gl.push(en[0].headword);
      if (typeof toYoungerFuthark === 'function') rl.push(toYoungerFuthark(en[0].headword));
      cd.push(en.map(function(l){ var m = [l.pos, l.gender].filter(Boolean).join(' • '); return '<div onclick="if(typeof openEntry===\'function\')openEntry(' + l.id + ')" style="background:#1c1008;border:1px solid #5c3f21;border-radius:8px;padding:8px 10px;cursor:pointer;"><strong style="color:#ffd096;">' + l.headword + '</strong> <span style="color:#a8895c;font-size:11px;">' + m + '</span><div style="color:#e6c088;font-size:13px;">' + getGloss(l) + '</div></div>'; }).join(''));
    } else if (on && on.length) {
      gl.push(getGloss(on[0].l).split(',')[0].trim());
      if (typeof toYoungerFuthark === 'function') rl.push(toYoungerFuthark(tk));
    } else {
      gl.push('[' + tk + ']');
    }
  });
  sb.innerHTML = '<div style="font-weight:bold;color:#f3d6a8;">' + gl.join(' ') + '</div>' + (rl.length ? '<div style="color:#ffd096;font-size:17px;margin-top:6px;">' + rl.join(' · ') + '</div>' : '');
  bb.innerHTML = cd.join('');
}

(function(){
  var oFS = window.openFullScreenView;
  window.openFullScreenView = function(v, t) {
    var tc = document.getElementById('translateCard'), fb = document.getElementById('fsBody');
    if (tc && fb && tc.parentElement !== fb) fb.appendChild(tc);
    if (tc) tc.style.display = 'none';
    if (typeof oFS === 'function') oFS(v, t);
    if (v === 'translate') {
      var ft = document.getElementById('fsTitle');
      if (ft) ft.textContent = 'ON ↔ Eng Translator';
      if (tc) tc.style.display = 'flex';
      var i = document.getElementById('translateInput');
      if (i) setTimeout(function(){ i.focus(); }, 50);
    }
  };
})();
