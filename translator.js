window._transDir = 'auto';

function ensureTranslateUI() {
  var tc = document.getElementById('translateCard');
  if (!tc) {
    tc = document.createElement('div');
    tc.id = 'translateCard';
    tc.style.cssText = 'display:none;flex-direction:column;gap:10px;';
    tc.innerHTML = '<div style="display:flex;gap:6px;">' +
      '<button type="button" id="tModeAuto" onclick="setTransDir(\'auto\')" style="flex:1;padding:8px;border-radius:6px;border:1.5px solid #b88446;background:#3a2210;color:#ffe2b0;font-weight:bold;font-size:12px;">Auto</button>' +
      '<button type="button" id="tModeOnEn" onclick="setTransDir(\'on-en\')" style="flex:1;padding:8px;border-radius:6px;border:1px solid #4a3319;background:#1c1008;color:#a8875a;font-weight:bold;font-size:12px;">ON → Eng</button>' +
      '<button type="button" id="tModeEnOn" onclick="setTransDir(\'en-on\')" style="flex:1;padding:8px;border-radius:6px;border:1px solid #4a3319;background:#1c1008;color:#a8875a;font-weight:bold;font-size:12px;">Eng → ON</button>' +
      '</div>' +
      '<div style="position:relative;display:flex;align-items:center;">' +
      '<input id="translateInput" type="text" oninput="runOnEngTranslate(this.value)" placeholder="Type Old Norse or English..." style="width:100%;box-sizing:border-box;padding:10px 64px 10px 10px;border-radius:8px;border:1.5px solid #7d562b;background:#160d06;color:#f3d6a8;font-size:15px;">' +
      '<button type="button" onclick="document.getElementById(\'translateInput\').value=\'\';runOnEngTranslate(\'\')" style="position:absolute;right:8px;background:#2b190c;border:1px solid #6e4e26;border-radius:6px;color:#e6c088;font-size:12px;padding:4px 8px;">Clear</button>' +
      '</div>' +
      '<div id="translateSummaryBox" style="background:#1c1008;border:1px solid #5c3f21;border-radius:8px;padding:10px;min-height:48px;color:#f3d6a8;font-size:15px;line-height:1.45;">Type any Old Norse or English word or phrase above.</div>' +
      '<div id="translateBreakdown" style="display:flex;flex-direction:column;gap:8px;"></div>';
    document.body.appendChild(tc);
  }
  return tc;
}

function getGloss(r) {
  var rw = r.zoega_def || r.wiki_def || r.cleasby_def || r.onp_def || '';
  rw = String(rw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!rw) return '(no definition)';
  var parts = rw.split(/[;\n]/);
  var sg = (parts[0] || '').trim();
  return sg.length > 95 ? sg.slice(0, 92) + '…' : sg;
}

function lkON(w) {
  if (typeof db === 'undefined' || !db) return null;
  var l = w.toLowerCase(), h = [], byId = {};
  var s1 = db.prepare("SELECT * FROM lemmas WHERE LOWER(headword) = ? LIMIT 3");
  s1.bind([l]);
  while (s1.step()) {
    var r1 = s1.getAsObject();
    if (!byId[r1.id]) {
      byId[r1.id] = { l: r1, forms: [] };
      h.push(byId[r1.id]);
    }
  }
  s1.free();
  if (h.length) return h;

  var s2 = db.prepare("SELECT l.*, wf.case_name, wf.number, wf.definiteness FROM wordforms wf JOIN lemmas l ON wf.lemma_id = l.id WHERE LOWER(wf.form) = ? LIMIT 12");
  s2.bind([l]);
  while (s2.step()) {
    var r2 = s2.getAsObject();
    var tag = [r2.case_name, r2.number, r2.definiteness].filter(Boolean).join(' ');
    if (!byId[r2.id]) {
      byId[r2.id] = { l: r2, forms: tag ? [tag] : [] };
      h.push(byId[r2.id]);
    } else if (tag && byId[r2.id].forms.indexOf(tag) === -1) {
      byId[r2.id].forms.push(tag);
    }
  }
  s2.free();
  return h.length ? h.slice(0, 3) : null;
}

function lkEN(w) {
  if (typeof db === 'undefined' || !db) return null;
  var l = w.toLowerCase().replace(/[^a-z']/g, '');
  if (!l) return null;
  var sql = "SELECT * FROM lemmas WHERE LOWER(COALESCE(zoega_def,'') || ' ' || COALESCE(wiki_def,'') || ' ' || COALESCE(cleasby_def,'')) LIKE ? " +
    "ORDER BY CASE WHEN LOWER(COALESCE(zoega_def,'')) LIKE ? THEN 0 WHEN LOWER(COALESCE(wiki_def,'')) LIKE ? THEN 1 WHEN LOWER(COALESCE(zoega_def,'') || ' ' || COALESCE(wiki_def,'')) LIKE ? THEN 2 ELSE 3 END, LENGTH(headword) ASC LIMIT 4";
  var st = db.prepare(sql);
  st.bind(['%' + l + '%', l + '%', l + '%', '% ' + l + '%']);
  var h = [], byId = {}, rx = new RegExp('\\b' + l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
  while (st.step()) {
    var r = st.getAsObject();
    if (!byId[r.id] && (rx.test(getGloss(r).toLowerCase()) || !h.length)) {
      byId[r.id] = true;
      h.push(r);
    }
  }
  st.free();
  return h.length ? h : null;
}

function setTransDir(d) {
  window._transDir = d;
  var pairs = [['tModeAuto','auto'],['tModeOnEn','on-en'],['tModeEnOn','en-on']];
  for (var idx = 0; idx < pairs.length; idx++) {
    var e = document.getElementById(pairs[idx][0]);
    if (!e) continue;
    var a = d === pairs[idx][1];
    e.style.borderColor = a ? '#b88446' : '#4a3319';
    e.style.background = a ? '#3a2210' : '#1c1008';
    e.style.color = a ? '#ffe2b0' : '#a8875a';
  }
  var i = document.getElementById('translateInput');
  if (i) runOnEngTranslate(i.value);
}

function renderCardHtml(l, fNote) {
  var m = [l.pos, l.gender, fNote].filter(Boolean).join(' • ');
  return '<div onclick="if(typeof openEntry===\'function\')openEntry(' + l.id + ')" style="background:#1c1008;border:1px solid #5c3f21;border-radius:8px;padding:8px 10px;cursor:pointer;">' +
    '<strong style="color:#ffd096;">' + l.headword + '</strong> <span style="color:#a8895c;font-size:11px;">' + m + '</span>' +
    '<div style="color:#e6c088;font-size:13px;margin-top:2px;">' + getGloss(l) + '</div></div>';
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
    if (preferON && on && on[0]) {
      gl.push(getGloss(on[0].l).split(',')[0].trim());
      if (typeof toYoungerFuthark === 'function') rl.push(toYoungerFuthark(tk));
      cd.push(on.map(function(x){ return renderCardHtml(x.l, x.forms.join(' / ')); }).join(''));
    } else if (en && en[0]) {
      gl.push(en[0].headword);
      if (typeof toYoungerFuthark === 'function') rl.push(toYoungerFuthark(en[0].headword));
      cd.push(en.map(function(l){ return renderCardHtml(l, ''); }).join(''));
    } else if (on && on[0]) {
      gl.push(getGloss(on[0].l).split(',')[0].trim());
      if (typeof toYoungerFuthark === 'function') rl.push(toYoungerFuthark(tk));
      cd.push(on.map(function(x){ return renderCardHtml(x.l, x.forms.join(' / ')); }).join(''));
    } else {
      gl.push('[' + tk + ']');
    }
  });
  sb.innerHTML = '<div style="font-weight:bold;color:#f3d6a8;">' + gl.join(' · ') + '</div>' + (rl.length ? '<div style="color:#ffd096;font-size:17px;margin-top:6px;">' + rl.join(' · ') + '</div>' : '');
  bb.innerHTML = cd.join('');
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
      if (ft) ft.textContent = 'ON ↔ Eng Translator';
      if (tc) tc.style.display = 'flex';
      var i = document.getElementById('translateInput');
      if (i) setTimeout(function(){ i.focus(); }, 50);
    }
  };
})();
