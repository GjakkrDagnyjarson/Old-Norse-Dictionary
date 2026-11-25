function buildGlossMapFromDb() {
  if ((window._glossMap && window._glossMap.meta) || typeof db === 'undefined' || !db) return;
  try {
    var stop = {a:1,an:1,the:1,to:1,of:1,in:1,on:1,at:1,by:1,for:1,with:1,from:1,as:1,or:1,and:1,be:1,is:1,are:1,was:1,were:1,it:1,that:1,this:1,m:1,f:1,n:1,v:1,adj:1,adv:1,prep:1,conj:1,pron:1,pl:1,sg:1,nom:1,acc:1,dat:1,gen:1,pp:1,imp:1,pret:1,pres:1};
    var normOn = {}, normEn = {}, enMeta = {}, prepGov = {};
    var st = db.prepare("SELECT id, headword, pos, gender, zoega_def, cleasby_def, wikt_def, prep_cases FROM lemmas");
    while (st.step()) {
      var r = st.getAsObject();
      if (!r.headword) continue;
      var hw = String(r.headword).normalize('NFC').toLowerCase();
      if (r.prep_cases) prepGov[hw] = String(r.prep_cases).toUpperCase();
      var raw = [r.wikt_def, r.zoega_def, r.cleasby_def].filter(Boolean).join(' ').replace(/<[^>]*>/g, ' ').replace(/\([^)]*\)/g, ' ');
      var words = raw.match(/[a-zA-Z]{2,}/g) || [];
      for (var i = 0; i < words.length; i++) {
        var wl = words.at(i).toLowerCase();
        if (!stop[wl]) {
          if (!normOn[hw]) normOn[hw] = wl;
          if (!normEn[wl] || hw.length < normEn[wl].length) {
            normEn[wl] = hw;
            enMeta[wl] = { id: r.id, hw: hw, pos: String(r.pos || '').toLowerCase(), gender: String(r.gender || '').toLowerCase() };
          }
          break;
        }
      }
    }
    st.free();
    try {
      var wf = db.prepare("SELECT wf.form, l.headword FROM wordforms wf JOIN lemmas l ON wf.lemma_id = l.id");
      while (wf.step()) {
        var wr = wf.getAsObject();
        var fLow = String(wr.form || '').normalize('NFC').toLowerCase();
        var hLow = String(wr.headword || '').normalize('NFC').toLowerCase();
        if (fLow && !normOn[fLow] && normOn[hLow]) normOn[fLow] = normOn[hLow];
      }
      wf.free();
    } catch (e2) {}
    var core = {'ek':'I','mik':'me','mér':'me','mín':'my','minn':'my','þú':'you','þik':'you','þér':'you','þinn':'your','hann':'he','hon':'she','þat':'it','þeir':'they','þá':'then','en':'but','eða':'or','ef':'if','í':'in','á':'on','til':'to','af':'of','frá':'from','með':'with','við':'against','um':'about','eptir':'after','fyrir':'for','er':'is','var':'was','váru':'were','vera':'be','hafa':'have','hafði':'had','eigi':'not','ekki':'not','faðir':'father','móðir':'mother','bróðir':'brother','systir':'sister','sonr':'son','dóttir':'daughter','konungr':'king','hestr':'horse','skip':'ship','maðr':'man','kona':'woman','land':'land','sverð':'sword'};
    Object.keys(core).forEach(function(k) {
      normOn[k] = core[k];
      var enK = core[k].toLowerCase();
      normEn[enK] = k;
    });
    window._glossMap = { on: normOn, en: normEn, meta: enMeta, prepGov: prepGov };
  } catch (e) { console.error(e); }
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
    if (gm.on[st]) return gm.on[st];
    if (gm.on[st + 'r']) return gm.on[st + 'r'];
    if (gm.on[st + 'a']) return gm.on[st + 'a'];
    var unUmlaut = st.replace(/ǫ/g, 'a').replace(/ö/g, 'a');
    if (unUmlaut !== st) {
      if (gm.on[unUmlaut]) return gm.on[unUmlaut];
      if (gm.on[unUmlaut + 'r']) return gm.on[unUmlaut + 'r'];
      if (gm.on[unUmlaut + 'a']) return gm.on[unUmlaut + 'a'];
    }
  }
  return null;
}

function lookupInflectedOn(id, cas, num, def, fb) {
  if (typeof db === 'undefined' || !db || !id) return fb;
  try {
    var st = db.prepare("SELECT form, case_name, number, definiteness FROM wordforms WHERE lemma_id = ?");
    st.bind([id]);
    var best = null, bestScore = -1;
    while (st.step()) {
      var r = st.getAsObject();
      var score = (cas && String(r.case_name || '').toUpperCase() === cas ? 4 : 0) +
                  (num && String(r.number || '').toUpperCase() === num ? 2 : 0) +
                  (def && String(r.definiteness || '').toUpperCase() === def ? 3 : (!def && !r.definiteness ? 1 : 0));
      if (score > bestScore && r.form) { bestScore = score; best = r.form; }
    }
    st.free();
    return best || fb;
  } catch (e) { return fb; }
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
    var gen = /'s$/.test(lw), stem = gen ? lw.slice(0, -2) : lw, isPl = false, meta = gm.meta ? gm.meta[stem] : null;
    if (!meta && stem.length > 3 && stem.endsWith('s') && gm.meta && gm.meta[stem.slice(0, -1)]) { meta = gm.meta[stem.slice(0, -1)]; isPl = true; }
    var tCas = gen ? 'GEN' : cas, tNum = isPl ? 'PL' : 'SG', tDef = def ? 'DEF' : '';
    var w = meta ? lookupInflectedOn(meta.id, tCas, tNum, tDef, meta.hw) : ((gm.en && gm.en[stem]) || core);
    var role = meta && meta.pos.indexOf('verb') !== -1 ? 'verb' : (tCas === 'NOM' ? 'subj' : 'noun');
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
