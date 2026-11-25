window._glossLoading = false;
function buildGlossMapFromDb() {
  if ((window._glossMap && window._glossMap.inflEn) || window._glossLoading) return;
  window._glossLoading = true;
  fetch('gloss_engine.json.gz?v=4.24')
    .then(function(r) { return r.body.pipeThrough(new DecompressionStream('gzip')); })
    .then(function(s) { return new Response(s).json(); })
    .then(function(d) {
      window._glossMap = d;
      window._glossLoading = false;
      var inp = document.getElementById('translateInput');
      if (inp && inp.value.trim() && typeof runVerticalTranslate === 'function') runVerticalTranslate(inp.value);
    })
    .catch(function(e) { window._glossLoading = false; console.error(e); });
}

function resolveOnToken(lw, map) {
  var gm = (window._glossMap && window._glossMap.on) ? window._glossMap : { on: map || {} };
  if (!lw || !gm.on) return null;
  var w = String(lw).normalize('NFC').toLowerCase();
  if (gm.on[w]) return gm.on[w];
  var strip = w.replace(/(inn|in|it|num|nar|nna|sk|st)$/, '');
  if (strip && gm.on[strip]) return gm.on[strip];
  var stems = [w.replace(/(um|ar|ir|ur|an|na)$/, ''), w.replace(/(r|s|i|u|a)$/, ''), strip.replace(/(um|ar|ir|ur|r|s|i|u|a)$/, '')];
  for (var i = 0; i < stems.length; i++) {
    var st = stems.at(i);
    if (!st || st.length < 2) continue;
    var cands = [st, st + 'r', st + 'a', st.replace(/ǫ/g, 'a'), st.replace(/ǫ/g, 'a') + 'a', st.replace(/e/g, 'a') + 'a'];
    for (var j = 0; j < cands.length; j++) {
      if (gm.on[cands.at(j)]) return gm.on[cands.at(j)];
    }
  }
  return null;
}

function lookupInflectedOn(id, cas, num, def, fb) {
  var gm = window._glossMap;
  if (!gm || !gm.inflEn || !id) return fb;
  var d = def || 'INDEF';
  return gm.inflEn[id + ':' + cas + ':' + num + ':' + d]
      || gm.inflEn[id + ':' + cas + ':' + num + ':INDEF']
      || gm.inflEn[id + ':' + cas + ':SG:' + d]
      || gm.inflEn[id + ':NOM:' + num + ':' + d]
      || fb;
}

function translateEnToOnGrammar(line, map) {
  var gm = (window._glossMap && window._glossMap.en) ? window._glossMap : { en: map || {}, meta: {} };
  var PREP = {'to':{o:'til',c:'GEN'},'from':{o:'frá',c:'DAT'},'of':{o:'af',c:'DAT'},'with':{o:'með',c:'DAT'},'in':{o:'í',c:'DAT'},'into':{o:'í',c:'ACC'},'on':{o:'á',c:'DAT'},'onto':{o:'á',c:'ACC'},'at':{o:'at',c:'DAT'},'for':{o:'fyrir',c:'DAT'},'after':{o:'eptir',c:'ACC'},'about':{o:'um',c:'ACC'},'against':{o:'við',c:'DAT'}};
  var PAST = {'went':'fór','said':'sagði','spoke':'mælti','came':'kom','saw':'sá','took':'tók','gave':'gaf','fell':'fell','died':'dó','was':'var','were':'váru','had':'hafði','knew':'vissi','stood':'stóð','walked':'gekk','rode':'reið'};
  var toks = line.trim().split(/\s+/), out = [], def = false, cas = 'NOM', poss = null, plSubj = false, v2 = false;
  for (var i = 0; i < toks.length; i++) {
    var orig = toks.at(i), pm = orig.match(/([.,!?;:]+)$/), punct = pm ? pm.at(1) : '', core = orig.replace(/[.,!?;:]+$/g, ''), lw = core.toLowerCase();
    var isCap = core && core.charAt(0) === core.charAt(0).toUpperCase() && core.charAt(0) !== core.charAt(0).toLowerCase();
    if (!lw || lw === 'a' || lw === 'an') continue;
    if (lw === 'the') { def = true; continue; }
    if (PREP[lw]) { out.push({t:PREP[lw].o, r:'prep', c:isCap, p:punct}); cas = PREP[lw].c; if (i === 0) v2 = true; continue; }
    if (typeof EN_POSS_TO_ON !== 'undefined' && EN_POSS_TO_ON[lw]) { poss = {b:EN_POSS_TO_ON[lw], c:isCap}; continue; }
    if (lw === 'they' || lw === 'we' || lw === 'you') plSubj = true;
    if ((lw === 'then' || lw === 'now' || lw === 'here' || lw === 'there') && i === 0) v2 = true;
    if (PAST[lw]) { out.push({t:PAST[lw], r:'verb', c:isCap, p:punct}); cas = 'ACC'; continue; }
    var gen = /'s$/.test(lw), stem = gen ? lw.slice(0, -2) : lw, isPl = false, m = gm.meta ? gm.meta[stem] : null;
    if (!m && stem.length > 3 && stem.endsWith('s') && gm.meta && gm.meta[stem.slice(0, -1)]) { m = gm.meta[stem.slice(0, -1)]; isPl = true; }
    var tCas = gen ? 'GEN' : cas, tNum = isPl ? 'PL' : 'SG', tDef = def ? 'DEF' : '';
    var w = m ? lookupInflectedOn(m.at(0), tCas, tNum, tDef, m.at(1)) : ((gm.en && gm.en[stem]) || core);
    var role = m && m.at(2).indexOf('verb') !== -1 ? 'verb' : (tCas === 'NOM' ? 'subj' : 'noun');
    out.push({t:w, r:role, c:poss ? poss.c : isCap, p:poss ? '' : punct});
    if (poss) { out.push({t:poss.b, r:'poss', c:false, p:punct}); poss = null; }
    def = false; cas = (role === 'subj') ? 'ACC' : 'NOM';
  }
  if (v2 && out.length >= 4) {
    for (var k = 1; k < out.length - 1; k++) {
      if (out.at(k).r === 'subj' && out.at(k + 1).r === 'verb') { var s = out.at(k); out.splice(k, 2, out.at(k + 1), s); break; }
    }
  }
  return out.map(function(x) { return (x.c && x.t ? x.t.charAt(0).toUpperCase() + x.t.slice(1) : x.t) + (x.p || ''); }).join(' ');
}
