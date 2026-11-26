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

function stripOnDiacritics(s) {
  return String(s || '').normalize('NFC').toLowerCase()
    .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
    .replace(/[óòôöǫø]/g, 'o').replace(/[úùûü]/g, 'u').replace(/[ýỳŷÿ]/g, 'y')
    .replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ð/g, 'd').replace(/þ/g, 'th');
}

function resolveOnToken(lw, map) {
  var gm = (window._glossMap && window._glossMap.on) ? window._glossMap : { on: map || {} };
  if (!lw || !gm.on) return null;
  var w = String(lw).normalize('NFC').toLowerCase();
  if (gm.on[w]) return gm.on[w];
  if (!gm._normOn) {
    gm._normOn = {};
    var keys = Object.keys(gm.on);
    for (var ki = 0; ki < keys.length; ki++) {
      var nk = stripOnDiacritics(keys[ki]);
      if (!gm._normOn[nk]) gm._normOn[nk] = gm.on[keys[ki]];
    }
  }
  var nw = stripOnDiacritics(w);
  if (gm._normOn[nw]) return gm._normOn[nw];
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
      if (!isPl && w === 'mœðr') w = 'móðir';
    var role = m && m.at(2).indexOf('verb') !== -1 ? 'verb' : (tCas === 'NOM' ? 'subj' : 'noun');
    out.push({t:w, r:role, c:poss ? poss.c : isCap, p:poss ? '' : punct});
    if (poss) { var pForm = inflectPossessiveOn(poss.b, (m && m.at(3)) || '', tCas, isPl); out.push({t:pForm, r:'poss', c:false, p:punct}); poss = null; }
    def = false; cas = (role === 'subj') ? 'ACC' : 'NOM';
  }
  if (v2 && out.length >= 4) {
    for (var k = 1; k < out.length - 1; k++) {
      if (out.at(k).r === 'subj' && out.at(k + 1).r === 'verb') { var s = out.at(k); out.splice(k, 2, out.at(k + 1), s); break; }
    }
  }
  return out.map(function(x) { return (x.c && x.t ? x.t.charAt(0).toUpperCase() + x.t.slice(1) : x.t) + (x.p || ''); }).join(' ');
}

function inflectPossessiveOn(base, gen, cas, isPl) {
  var b = String(base || '').toLowerCase();
  var g = String(gen || 'M').toUpperCase().charAt(0);
  var c = String(cas || 'NOM').toUpperCase();
  var stems = { 'minn': 'mín', 'þinn': 'þín', 'sinn': 'sín' };
  var st = stems[b];
  if (!st) return base;
  if (isPl) {
    if (c === 'DAT') return st + 'um';
    if (c === 'GEN') return st + 'na';
    if (g === 'F') return st + 'ar';
    if (g === 'N') return st;
    return (c === 'ACC') ? st + 'a' : st + 'ir';
  }
  if (g === 'F') {
    if (c === 'ACC') return st + 'a';
    if (c === 'DAT') return st + 'ni';
    if (c === 'GEN') return st + 'nar';
    return st;
  }
  if (g === 'N') {
    if (c === 'DAT') return st + 'u';
    if (c === 'GEN') return st + 's';
    return st.replace(/í/g, 'i') + 'tt';
  }
  if (c === 'ACC') return st + 'n';
  if (c === 'DAT') return st + 'um';
  if (c === 'GEN') return st + 's';
  return st + 'n';
}

function reorderOnToEnClauses(words) {
  if (!words || words.length < 3) return words;
  var chunks = [];
  var i = 0;
  while (i < words.length) {
    var w = words[i];
    if (w.role === 'poss' || w.pos === 'adj' || w.pos === 'det') {
      var grp = [w];
      var j = i + 1;
      while (j < words.length && (words[j].role === 'poss' || words[j].pos === 'adj' || words[j].pos === 'det')) {
        grp.push(words[j]);
        j++;
      }
      if (j < words.length && (words[j].role === 'subj' || words[j].role === 'obj' || words[j].pos === 'noun')) {
        grp.push(words[j]);
        var head = words[j];
        chunks.push({ role: head.role, cas: head.cas || '', items: grp });
        i = j + 1;
        continue;
      }
    }
    chunks.push({ role: w.role, cas: w.cas || '', items: [w] });
    i++;
  }

  var c0 = chunks.at(0), c1 = chunks.at(1);
  var c0Word = (c0 && c0.items && c0.items.at(0)) ? c0.items.at(0).lw : '';
  var c0IsAmbObj = (c0 && (c0.role === 'obj' || c0.cas === 'ACC' || c0.cas === 'DAT' || c0Word === 'þat' || c0Word === 'hann' || c0Word === 'hon'));

  // Case 1: OVS (e.g., "Þat mælti mín móðir" -> [obj: Þat] [verb: mælti] [subj: mín móðir] -> SVO)
  if (chunks.length >= 3 && c0IsAmbObj && c1 && c1.role === 'verb') {
    var subjIdx = -1;
    for (var s = 2; s < chunks.length; s++) {
      if (chunks[s].role === 'subj' || chunks[s].cas === 'NOM') { subjIdx = s; break; }
    }
    if (subjIdx !== -1) {
      var objChunk = c0;
      var verbChunk = c1;
      var subjChunk = chunks[subjIdx];
      if (objChunk.items.length === 1 && objChunk.items.at(0).lw === 'þat') {
        objChunk.items.at(0).text = 'that';
      }
      var wasCap = objChunk.items.at(0).isCap;
      objChunk.items.at(0).isCap = false;
      subjChunk.items.at(0).isCap = wasCap;
      var tail = chunks.slice(2, subjIdx).concat(chunks.slice(subjIdx + 1));
      var reordered = [subjChunk, verbChunk, objChunk].concat(tail);
      var flat = [];
      for (var r = 0; r < reordered.length; r++) {
        for (var k = 0; k < reordered[r].items.length; k++) flat.push(reordered[r].items[k]);
      }
      return flat;
    }
  }

  // Case 2: Adv + V + Subj (VSO only after fronted adverbials like "Þá mælti mín móðir")
  var isFrontedAdv = (typeof ON_V2_ADV !== 'undefined' && ON_V2_ADV[c0Word]) || (c0 && c0.items && c0.items.at(0) && c0.items.at(0).pos === 'adv');
  if (chunks.length >= 3 && isFrontedAdv && c1 && c1.role === 'verb' && (chunks.at(2).role === 'subj' || chunks.at(2).cas === 'NOM')) {
    var vChunk = chunks.at(1);
    chunks = chunks.at(2);
    chunks = vChunk;
    var flat2 = [];
    for (var r2 = 0; r2 < chunks.length; r2++) {
      for (var k2 = 0; k2 < chunks[r2].items.length; k2++) flat2.push(chunks[r2].items[k2]);
    }
    return flat2;
  }
  return words;
}
