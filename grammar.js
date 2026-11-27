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

var CORE_ON_GLOSS = {
  'at': 'to', 'í': 'in', 'á': 'on', 'af': 'of', 'við': 'with', 'um': 'about', 'undir': 'under', 'yfir': 'over',
  'ok': 'and', 'en': 'but', 'eða': 'or', 'er': 'is', 'var': 'was', 'váru': 'were', 'sé': 'be',
  'þat': 'it', 'þetta': 'this', 'sá': 'that', 'sú': 'that', 'þeir': 'they', 'þær': 'they', 'þau': 'they',
  'ek': 'I', 'mik': 'me', 'mér': 'me', 'mín': 'my', 'minn': 'my', 'mitt': 'my',
  'þú': 'you', 'þik': 'you', 'þér': 'you', 'þín': 'your', 'þinn': 'your', 'þitt': 'your',
  'hann': 'he', 'hon': 'she', 'hana': 'her', 'henni': 'her', 'honum': 'him',
  'sér': 'sees', 'sjá': 'see', 'sá': 'saw', 'mælti': 'spoke', 'mælir': 'speaks', 'sagði': 'said',
  'opnast': 'opens', 'opnask': 'opens', 'birki': 'birch', 'bein': 'bone', 'beini': 'bone', 'steinn': 'stone', 'steini': 'stone'
};

function stripOnDiacritics(s) {
  return String(s || '').normalize('NFC').toLowerCase()
    .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
    .replace(/[óòôöǫø]/g, 'o').replace(/[úùûü]/g, 'u').replace(/[ýỳŷÿ]/g, 'y')
    .replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ð/g, 'd').replace(/þ/g, 'th');
}

function cleanOnGloss(raw, gm, depth) {
  if (!raw || typeof raw !== 'string') return raw;
  var s = raw.trim();
  // Follow "inflection of X" / "form of X" / "plural of X" / "past of X" recursively across all 100k+ entries
  var m = s.match(/^(?:inflection|form|plural|singular|genitive|dative|accusative|nominative|past|participle|comparative|superlative)\s+of\s+([a-záéíóúýǫøæœðþ]+)/i);
  if (m && gm && gm.on && (depth || 0) < 3) {
    var target = m.at(1).toLowerCase();
    if (gm.on[target]) return cleanOnGloss(gm.on[target], gm, (depth || 0) + 1);
  }
  // Strip dictionary meta-notes globally
  s = s.replace(/\boften spelt\b.*$/i, '')
       .replace(/\balternative form of\b.*$/i, '')
       .replace(/\bof a plant\b/gi, '')
       .replace(/\([^)]*\)/g, '')
       .replace(/\s{2,}/g, ' ')
       .split(/\s*[,;/]\s*/).at(0).replace(/[,;:\s]+$/, '')
       .trim();
  return s || raw;
}

function resolveOnToken(lw, map, _depth) {
  var gm = (window._glossMap && window._glossMap.on) ? window._glossMap : { on: map || {} };
  if (!lw || !gm.on) return null;
  var w = String(lw).normalize('NFC').toLowerCase();
  if (CORE_ON_GLOSS[w]) return CORE_ON_GLOSS[w];
  if (gm.on[w]) return cleanOnGloss(gm.on[w], gm, _depth);

  // Layer 1: Peel enclitic definite articles & middle-voice/reflexive suffixes globally
  var artMatch = w.match(/^(.{2,}?)(arnir|irnir|urnar|anar|unum|anna|inn|in|it|na|nu)$/);
  var refMatch = w.match(/^(.{2,}?)(skt|sk|st|zt)$/);
  if (refMatch && (_depth || 0) < 2) {
    var baseRef = resolveOnToken(refMatch.at(1), gm.on, (_depth || 0) + 1)
               || resolveOnToken(refMatch.at(1) + 'a', gm.on, (_depth || 0) + 1)
               || resolveOnToken(refMatch.at(1) + 'ask', gm.on, (_depth || 0) + 1);
    if (baseRef) return baseRef;
  }
  if (artMatch && (_depth || 0) < 2) {
    var baseArt = resolveOnToken(artMatch.at(1), gm.on, (_depth || 0) + 1)
               || resolveOnToken(artMatch.at(1) + 'r', gm.on, (_depth || 0) + 1);
    if (baseArt && !/^the\b/i.test(baseArt)) return 'the ' + baseArt;
    if (baseArt) return baseArt;
  }

  // Layer 2: Universal inflectional stemmer + u-umlaut restoration (ǫ -> a, ø -> o)
  var stems = [
    w,
    w.replace(/(um|ar|ir|ur|an|in|un|na|ra|ði|ti|du|tu)$/, ''),
    w.replace(/(r|s|i|u|a|t)$/, ''),
    w.replace(/(um|ar|ir|ur|an|in|un|na|r|s|i|u|a|t)$/, '')
  ];
  for (var i = 0; i < stems.length; i++) {
    var st = stems[i];
    if (!st || st.length < 2) continue;
    var unUmlaut = st.replace(/ǫ/g, 'a').replace(/ø/g, 'o');
    var cands = [
      st, st + 'r', st + 'a', st + 'i', st + 'u',
      unUmlaut, unUmlaut + 'r', unUmlaut + 'a', unUmlaut + 'i', unUmlaut + 'u'
    ];
    for (var j = 0; j < cands.length; j++) {
      if (gm.on[cands[j]]) return cleanOnGloss(gm.on[cands[j]], gm, _depth);
    }
  }

  // Layer 3: Diacritic-insensitive fallback (e.g., min -> mín, modir -> móðir)
  if (!gm._normOn) {
    gm._normOn = {};
    var keys = Object.keys(gm.on);
    for (var ki = 0; ki < keys.length; ki++) {
      var nk = stripOnDiacritics(keys[ki]);
      if (!gm._normOn[nk]) gm._normOn[nk] = gm.on[keys[ki]];
    }
  }
  var nw = stripOnDiacritics(w);
  if (gm._normOn[nw]) return cleanOnGloss(gm._normOn[nw], gm, _depth);

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
  var SUBJ = {'i':'ek','you':'þú','he':'hann','she':'hón','it':'þat','we':'vér','they':'þeir'};
  var OBJ  = {'me':'mik','you':'þik','him':'hann','her':'hana','it':'þat','us':'oss','them':'þá'};
  var PREP = {'in':{b:'í',c:'DAT'},'into':{b:'í',c:'ACC'},'on':{b:'á',c:'DAT'},'onto':{b:'á',c:'ACC'},'at':{b:'at',c:'DAT'},'for':{b:'fyrir',c:'DAT'},'after':{b:'eptir',c:'ACC'},'about':{b:'um',c:'ACC'},'with':{b:'með',c:'DAT'},'by':{b:'at',c:'DAT'},'from':{b:'af',c:'DAT'},'to':{b:'til',c:'GEN'},'of':{b:'af',c:'DAT'},'under':{b:'undir',c:'DAT'},'over':{b:'yfir',c:'DAT'}};
  var EN_3SG_ON = {'sees':'sér','opens':'opnast','speaks':'mælir','says':'segir','stands':'stendr','knows':'veit','goes':'ferr','comes':'kemr','gives':'gefr','takes':'tekr'};
  var PAST = {'went':'fór','said':'sagði','spoke':'mælti','came':'kom','saw':'sá','took':'tók','gave':'gaf','fell':'féll','died':'dó','was':'var','were':'váru','had':'hafði','knew':'vissi','stood':'stóð','walked':'gekk','rode':'reið'};
  var toks = line.trim().split(/\s+/), out = [], cas = 'NOM', pSubj = false, v2 = false;
  var def = false, poss = null;

  for (var i = 0; i < toks.length; i++) {
    var orig = toks[i], m = orig.match(/^([^.,!?;:]+)([.,!?;:]*)$/);
    var core = m ? m[1] : orig, punct = m ? m[2] : '';
    var isCap = core && core.charAt(0) === core.charAt(0).toUpperCase() && core.charAt(0) !== core.charAt(0).toLowerCase();
    var lw = core.toLowerCase();

    if (lw === 'a' || lw === 'an') continue;
    if (lw === 'the') { def = true; continue; }
    if (PREP[lw]) { out.push({t:PREP[lw].b, r:'prep', c:isCap, p:punct}); cas = PREP[lw].c; if (i === 0) v2 = true; continue; }
    if (typeof EN_POSS_TO_ON !== 'undefined' && EN_POSS_TO_ON[lw]) { poss = {b:EN_POSS_TO_ON[lw], c:isCap}; continue; }
    if (EN_3SG_ON[lw]) { out.push({t:EN_3SG_ON[lw], r:'verb', c:isCap, p:punct}); pSubj = false; continue; }
    if (lw === 'then' || lw === 'now' || lw === 'here' || lw === 'there') { if (i === 0) v2 = true; }
    if (SUBJ[lw] && (i === 0 || pSubj)) { out.push({t:SUBJ[lw], r:'subj', c:isCap, p:punct}); pSubj = false; continue; }
    if (OBJ[lw]) { out.push({t:OBJ[lw], r:'obj', c:isCap, p:punct}); cas = 'ACC'; continue; }
    if (PAST[lw]) { out.push({t:PAST[lw], r:'verb', c:isCap, p:punct}); pSubj = false; continue; }

    var gen = /'s$/.test(lw), baseLw = lw.replace(/'s$/, '');
    var isPl = baseLw.length > 3 && /s$/.test(baseLw) && !gm.meta[baseLw] && !gm.en[baseLw];
    var stem = isPl ? baseLw.slice(0, -1) : baseLw;
    var meta = gm.meta[stem] || null;
    var tCas = gen ? 'GEN' : cas, tNum = isPl ? 'PL' : 'SG', tDef = def ? 'DEF' : 'INDEF';
    var w = meta ? lookupInflectedOn(meta[0], tCas, tNum, tDef, meta[1]) : ((gm.en && gm.en[stem]) || core);
    if (!isPl && w === 'mœðr') w = 'móðir';
    var role = meta && meta[2].indexOf('verb') !== -1 ? 'verb' : (tCas === 'NOM' ? 'subj' : 'noun');

    out.push({t:w, r:role, c:isCap, p:poss ? '' : punct});
    if (poss) {
      var pForm = inflectPossessiveOn(poss.b, (meta && meta[3]) || '', tCas, isPl);
      out.push({t:pForm, r:'poss', c:false, p:punct});
      poss = null;
    }
    def = false; cas = (role === 'subj') ? 'ACC' : 'NOM';
  }

  if (v2 && out.length >= 4) {
    for (var k = 1; k < out.length - 1; k++) {
      if (out[k].r === 'subj' && out[k + 1].r === 'verb') {
        var s = out.splice(k, 2);
        out.splice(1, 0, s[0], s[1]);
        break;
      }
    }
  }
  return out.map(function(x) { return (x.c ? x.t.charAt(0).toUpperCase() + x.t.slice(1) : x.t) + (x.p || ''); }).join(' ');
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
  // Idiom: [Noun X] + (af|at) + [same Noun X] -> "X by X" (e.g. "steinn af/at steini" -> "stone by stone")
  for (var idx = 1; idx < words.length - 1; idx++) {
    var mid = (words[idx].lw || '').toLowerCase();
    if (mid === 'af' || mid === 'at') {
      var prevTxt = String(words[idx - 1].text || '').toLowerCase().trim();
      var nextTxt = String(words[idx + 1].text || '').toLowerCase().trim();
      if (prevTxt && prevTxt === nextTxt) {
        words[idx].text = 'by';
      }
    }
  }

  var chunks = [];
  var i = 0;
  while (i < words.length) {
    var w = words[i];
    // Handle post-posed possessives globally: [Noun] + [Poss] (e.g., "gǫtu þinni" -> "your path")
    if ((w.role === 'subj' || w.role === 'obj' || w.pos === 'noun') && (i + 1) < words.length && words[i + 1].role === 'poss') {
      var pTok = words[i + 1];
      chunks.push({ role: w.role, cas: w.cas || '', items: [pTok, w] });
      i += 2;
      continue;
    }
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
