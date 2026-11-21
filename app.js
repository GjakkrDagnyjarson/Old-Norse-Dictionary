let db = null;
const $ = id => document.getElementById(id);

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function toYoungerFuthark(word) {
  const map = {
    'a':'ᛅ','á':'ᛅ','æ':'ᛅ','e':'ᛁ','é':'ᛁ','i':'ᛁ','í':'ᛁ',
    'o':'ᚢ','ó':'ᚢ','u':'ᚢ','ú':'ᚢ','y':'ᚢ','ý':'ᚢ','ø':'ᚢ','œ':'ᚢ','ǫ':'ᚢ',
    'b':'ᛒ','p':'ᛒ','d':'ᛏ','t':'ᛏ','ð':'ᚦ','þ':'ᚦ',
    'f':'ᚠ','v':'ᚠ','g':'ᚴ','k':'ᚴ','q':'ᚴ','h':'ᚼ',
    'j':'ᛁ','l':'ᛚ','m':'ᛘ','n':'ᚾ','r':'ᚱ','ʀ':'ᛦ','s':'ᛋ','z':'ᛋ','w':'ᚢ'
  };
  return word.toLowerCase().replace(/ei/g,'ᛅᛁ').replace(/au/g,'ᛅᚢ').replace(/ey/g,'ᛅᚢ')
    .split('').map(c => map[c] || c).join('');
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderAlphaGrid() {
  const rows = [
    ['↻','a','á','b','d','ð','e','é','f'],
    ['g','h','i','í','j','k','l','m','n'],
    ['o','ó','p','r','s','t','u','ú','v'],
    ['y','ý','þ','æ','ǽ','ø','ǫ','œ']
  ];
  $('alphaGrid').innerHTML = rows.map(r =>
    `<div class="alpha-row">${r.map(l => `<button id="${l === '↻' ? 'updateBtn' : ''}" class="alpha-btn ${l === '↻' ? (window.__updReady ? 'upd-ready' : 'upd-ok') : ''}" onclick="${l === '↻' ? 'handleUpdateClick()' : `filterByLetter('${l}')`}" title="${l === '↻' ? (window.__updReady ? 'Update available — tap to reload' : 'Up to date — tap to check') : ''}">${l}</button>`).join('')}</div>`
  ).join('');
  $('root').classList.remove('open'); $('alphaGrid').style.display = 'flex';
  $('listCard').style.display = 'none';
  $('detailCard').style.display = 'none';
  $('homeBtn').style.display = 'none';
  $('subStatus').style.display = 'none';
}

function filterByLetter(letter) {
  if (!db) return showToast("Loading dictionary database...");
  const stmt = db.prepare("SELECT id, headword, pos, gender FROM lemmas WHERE SUBSTR(LTRIM(headword, '*'),1,1) = ? ORDER BY sort_key, headword");
  stmt.bind([letter.toLowerCase()]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  $('subStatus').style.display = 'block';
  $('subStatus').textContent = `Letter ${letter} (${rows.length} words)`;
  renderList(rows);
}

let CURRENT_ROWS = [], RENDERED_COUNT = 0;
function rowHTML(r) {
  const tag = [r.pos, r.gender].filter(Boolean).join(' • ');
  const mf = r.matchedForm ? r.matchedForm.replace(/'/g, "\\'") : '';
  return `<div class="word-row" onclick="openEntry(${r.id}, '${mf}')">
    <span class="wr-hw">${esc(r.headword)}</span>
    ${tag ? `<span class="wr-sub">(${esc(tag)})</span>` : ''}
    ${r.matchedForm ? `<span class="wr-sub">← ${esc(r.matchedForm)}</span>` : ''}
  </div>`;
}
function appendMoreRows() {
  if (RENDERED_COUNT >= CURRENT_ROWS.length) return;
  const next = CURRENT_ROWS.slice(RENDERED_COUNT, RENDERED_COUNT + 400);
  $('listCard').insertAdjacentHTML('beforeend', next.map(rowHTML).join(''));
  RENDERED_COUNT += next.length;
}
function renderList(rows) {
  CURRENT_ROWS = rows;
  RENDERED_COUNT = 0;
  $('alphaGrid').style.display = 'none';
  $('detailCard').style.display = 'none';
  $('homeBtn').style.display = 'inline-block';
  $('root').classList.add('open');
  $('listCard').style.display = 'block';
  $('listCard').scrollTop = 0;
  $('listCard').innerHTML = rows.length ? '' : '<div class="word-row"><span class="wr-sub">No entries found.</span></div>';
  appendMoreRows();
  $('listCard').onscroll = () => {
    const el = $('listCard');
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 250) appendMoreRows();
  };
}
function buildTableHTML(lemmaId, highlightForm) {
  const stmt = db.prepare("SELECT form, case_name, number, definiteness FROM wordforms WHERE lemma_id = ?");
  stmt.bind([lemmaId]);
  const forms = [];
  while (stmt.step()) forms.push(stmt.getAsObject());
  stmt.free();
  if (!forms.length) return '';

  const grid = { NOM: ['—','—','—','—'], ACC: ['—','—','—','—'], DAT: ['—','—','—','—'], GEN: ['—','—','—','—'] };
  let hasCase = false;

  forms.forEach(f => {
    const c = (f.case_name || '').toUpperCase().slice(0, 3);
    if (!grid[c]) return;
    hasCase = true;
    const isPl = /pl/i.test(f.number || '');
    const isDef = /def/i.test(f.definiteness || '') && !/indef/i.test(f.definiteness || '');
    const col = (isPl ? 2 : 0) + (isDef ? 1 : 0);
    grid[c][col] = grid[c][col] === '—' ? f.form : `${grid[c][col]} / ${f.form}`;
  });

  if (!hasCase) {
    // Check if verb conjugation forms exist (PRES / PAST / PART)
    const persons = ['1SG','2SG','3SG','1PL','2PL','3PL'];
    const vGrid = {};
    persons.forEach(p => vGrid[p] = { PRES: '—', PAST: '—' });
    let pp = '', hasVerb = false;
    forms.forEach(f => {
      const c = (f.case_name || '').toUpperCase();
      const n = (f.number || '').toUpperCase();
      if ((c === 'PRES' || c === 'PAST') && vGrid[n]) {
        hasVerb = true;
        vGrid[n][c] = vGrid[n][c] === '—' ? f.form : `${vGrid[n][c]} / ${f.form}`;
      } else if (c === 'PART') {
        hasVerb = true;
        pp = pp ? `${pp} / ${f.form}` : f.form;
      }
    });
    if (!hasVerb) return '';
    const hl = (highlightForm || '').toLowerCase();
    const cell = val => {
      const m = hl && val.toLowerCase().split(' / ').includes(hl);
      return `<td class="${m ? 'hl' : ''}">${esc(val)}</td>`;
    };
    return `
      <div class="tbl-title">VERB CONJUGATION TABLE</div>
      <div class="tbl-wrap">
        <table>
          <tr><th>Person</th><th>Present</th><th>Past</th></tr>
          ${persons.map(p => `<tr><th>${p}</th>${cell(vGrid[p].PRES)}${cell(vGrid[p].PAST)}</tr>`).join('')}
          ${pp ? `<tr><th>PP</th><td colspan="2" class="${hl && pp.toLowerCase().split(' / ').includes(hl) ? 'hl' : ''}">${esc(pp)}</td></tr>` : ''}
        </table>
      </div>`;
  }
  const hl = (highlightForm || '').toLowerCase();

  return `
    <div class="tbl-title">4-CASE DECLENSION TABLE</div>
    <div class="tbl-wrap">
      <table>
        <tr><th>Case</th><th>Sg Indef</th><th>Sg Def</th><th>Pl Indef</th><th>Pl Def</th></tr>
        ${['NOM','ACC','DAT','GEN'].map(c => `
          <tr>
            <th>${c}</th>
            ${grid[c].map(val => {
              const isMatch = hl && val.toLowerCase().split(' / ').includes(hl);
              return `<td class="${isMatch ? 'hl' : ''}">${esc(val)}</td>`;
            }).join('')}
          </tr>`).join('')}
      </table>
    </div>`;
}

function openEntry(id, matchedForm = '') {
  const stmt = db.prepare("SELECT * FROM lemmas WHERE id = ?");
  stmt.bind([id]);
  const r = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  if (!r) return;

  $('alphaGrid').style.display = 'none';
  $('listCard').style.display = 'none';
  $('homeBtn').style.display = 'inline-block';
  $('root').classList.add('open'); $('detailCard').style.display = 'block';

  const meta = [r.pos, r.gender].filter(Boolean).join(' • ');
  const tbl = buildTableHTML(r.id, matchedForm);

  $('detailCard').innerHTML = `
    <div class="det-top">
      <div><span class="det-hw">${esc(r.headword)}</span>${meta ? `<span class="det-pos">${esc(meta)}</span>` : ''}</div>
      <button class="back-pill" onclick="RETURN_TO_GRAMMAR ? openGrammarTool() : renderAlphaGrid()">←</button>
    </div>
    <div class="det-yf">Younger Futhark: ${toYoungerFuthark(r.headword)}</div>
    ${matchedForm ? `<div class="match-badge">Matched inflected form: ${esc(matchedForm)}</div>` : ''}
    ${tbl}
    ${r.zoega_def ? `<div class="sec-head">ZOËGA (1910)</div><div class="sec-body">${esc(r.zoega_def)}</div>` : ''}
    ${r.cleasby_def ? `<div class="sec-head">CLEASBY &amp; VIGFÚSSON (1874)</div><div class="sec-body">${esc(r.cleasby_def)}</div>` : ''}
    ${r.onp_def ? `<div class="sec-head">ONP — UNIV. OF COPENHAGEN (CC BY-SA 4.0)</div><div class="sec-body">${esc(r.onp_def)}</div>` : ''}
    ${r.wikt_def ? `<div class="sec-head">WIKTIONARY (CC BY-SA 4.0)</div><div class="sec-body">${esc(r.wikt_def)}</div>` : ''}
  `;
}

$('searchBox').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) return renderAlphaGrid();
  if (!db) return showToast("Loading dictionary database...");

  const seen = new Set();
  const onResults = [];
  const engResults = [];

  // 1. Strict Old Norse headword prefix matches
  let s1 = db.prepare("SELECT id, headword, pos, gender, sort_key FROM lemmas WHERE headword LIKE ? OR normalized_search LIKE ? ORDER BY sort_key, headword");
  s1.bind([q + '%', q + '%']);
  while (s1.step()) {
    const r = s1.getAsObject();
    if (!seen.has(r.id)) { seen.add(r.id); onResults.push(r); }
  }
  s1.free();

  // 2. Old Norse inflected wordform matches
  let s2 = db.prepare("SELECT DISTINCT l.id, l.headword, l.pos, l.gender, l.sort_key, w.form AS matchedForm FROM wordforms w JOIN lemmas l ON l.id = w.lemma_id WHERE w.form = ? OR w.normalized_form = ? ORDER BY l.sort_key");
  s2.bind([q, q]);
  while (s2.step()) {
    const r = s2.getAsObject();
    if (!seen.has(r.id)) { seen.add(r.id); onResults.push(r); }
  }
  s2.free();

  onResults.sort((x, y) => {
    const xExact = x.headword === q ? 0 : 1;
    const yExact = y.headword === q ? 0 : 1;
    if (xExact !== yExact) return xExact - yExact;
    return (x.sort_key || x.headword).localeCompare(y.sort_key || y.headword);
  });

  // 3. English whole-word definition matches (for queries >= 3 chars)
  if (q.length >= 3) {
    const wordRe = new RegExp(`(^|[^a-z])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es|ed|ing)?([^a-z]|$)`, 'i');
    let s3 = db.prepare("SELECT id, headword, pos, gender, sort_key, zoega_def, wikt_def, cleasby_def FROM lemmas WHERE LOWER(zoega_def) LIKE ? OR LOWER(wikt_def) LIKE ? OR LOWER(cleasby_def) LIKE ? LIMIT 400");
    const pat = '%' + q + '%';
    s3.bind([pat, pat, pat]);
    while (s3.step()) {
      const r = s3.getAsObject();
      if (seen.has(r.id)) continue;
      const defs = `${r.zoega_def || ''} ${r.wikt_def || ''} ${r.cleasby_def || ''}`;
      if (wordRe.test(defs)) {
        seen.add(r.id);
        // Rank entries where the English word appears early in the definition higher
        const idx = defs.toLowerCase().indexOf(q);
        r._engScore = idx >= 0 ? idx : 9999;
        engResults.push(r);
      }
    }
    s3.free();
    engResults.sort((x, y) => x._engScore - y._engScore || (x.sort_key || x.headword).localeCompare(y.sort_key || y.headword));
  }

  const results = [...onResults, ...engResults];
  const st = `${results.length} matches for "${q}"`;
  if (typeof LAST_VIEW !== 'undefined') LAST_VIEW = { type: 'list', rows: results, status: st };
  $('subStatus').style.display = 'block';
  $('subStatus').textContent = st;
  renderList(results);
});

$('homeBtn').onclick = () => { $('searchBox').value = ''; renderAlphaGrid(); };
$('cred').onclick = () => { $('modalOverlay').style.display = 'flex'; };
$('modalClose').onclick = () => { $('modalOverlay').style.display = 'none'; };

window.onerror = (m, u, l) => { const st = $("subStatus"); if (st) { st.style.display = "block"; st.textContent = "JS ERR L" + l + ": " + m; } };
(async function init() {
  const st = $("subStatus"); st.style.display = "block"; st.textContent = "1/3 Loading DB...";
  try {
    const SQL = await initSqlJs({ locateFile: f => f });
    const res = await fetch('old_norse.db.gz');
    const raw = new Uint8Array(await res.arrayBuffer());
    let buf;
    if (raw[0] === 0x1f && raw[1] === 0x8b) {
      const ds = new DecompressionStream('gzip');
      buf = await new Response(new Blob([raw]).stream().pipeThrough(ds)).arrayBuffer();
    } else {
      buf = raw.buffer;
    }
    db = new SQL.Database(new Uint8Array(buf));
    renderAlphaGrid();
  } catch (err) {
    $('subStatus').style.display = 'block'; $('subStatus').textContent = 'Error loading database: ' + err.message;
  }
})();

// --- GRAMMAR & SYNTAX ANALYZER (Opened via Grammar button) ---
let LAST_GRAMMAR_TEXT = '';
let RETURN_TO_GRAMMAR = false;

function normTok(w) {
  return w.toLowerCase().replace(/^[.,;:!?«»"'()\-]+|[.,;:!?«»"'()\-]+$/g, '');
}

function inferGovCases(h, kind = 'prep') {
  if (kind === 'prep' && h.prep_cases) return h.prep_cases.toUpperCase();
  const z = (kind === 'verb' ? (h.zoega_def || '').slice(0, 45) : (h.zoega_def || '')).toLowerCase();
  if (kind === 'prep' && !/\bprep\b/.test(z)) return '';
  if (kind === 'verb' && !/verb/i.test(h.pos || '')) return '';
  const cases = [];
  if (/\b(with|gov\.)\s+(acc|dat\s+and\s+acc|acc\s+and\s+dat)/.test(z) || /\bb\.\s*with\s+acc/.test(z)) cases.push('ACC');
  if (/\b(with|gov\.)\s+(dat|acc\s+and\s+dat|dat\s+and\s+acc)/.test(z) || /\ba\.\s*with\s+dat/.test(z)) cases.push('DAT');
  if (/\b(with|gov\.)\s+gen/.test(z)) cases.push('GEN');
  return cases.join('/');
}

const GRAMMAR_CACHE = new Map();
const NORM_CHAR_MAP = {
  'á':'a','é':'e','í':'i','ó':'o','ú':'u','ý':'y',
  'ǫ':'o','ö':'o','ø':'o','œ':'oe','æ':'ae','ð':'d','þ':'th'
};
function foldON(str) {
  return str.toLowerCase().replace(/[áéíóúýǫöøœæðþ]/g, ch => NORM_CHAR_MAP[ch] || ch);
}

const STRONG_2SG_PAST = {
  'sátt': ['sjá', 'PAST • 2SG'],
  'vart': ['vera', 'PAST • 2SG'],
  'fórt': ['fara', 'PAST • 2SG'],
  'komt': ['koma', 'PAST • 2SG'],
  'gafst': ['gefa', 'PAST • 2SG'],
  'gaft': ['gefa', 'PAST • 2SG'],
  'tókt': ['taka', 'PAST • 2SG'],
  'kvazt': ['kveða', 'PAST • 2SG (MEDIOPASSIVE)'],
  'skalt': ['skulu', 'PRES • 2SG'],
  'munt': ['munu', 'PRES • 2SG'],
  'veizt': ['vita', 'PRES • 2SG'],
  'kant': ['kunna', 'PRES • 2SG'],
  'vill': ['vilja', 'PRES • 2SG']
};

function fastInflected(word, exactOnly = true) {
  const nf = foldON(word);
  const st = db.prepare(`
    SELECT l.id, l.headword, l.pos, l.gender, l.prep_cases, l.zoega_def,
           w.form, w.case_name, w.number, w.definiteness
    FROM wordforms w JOIN lemmas l ON l.id = w.lemma_id
    WHERE w.normalized_form = ?
  `);
  st.bind([nf]);
  const all = [];
  while (st.step()) all.push({ source: 'inflected', ...st.getAsObject() });
  st.free();
  const exact = all.filter(r => (r.form || '').toLowerCase() === word);
  return exact.length ? exact : (exactOnly ? [] : all);
}

function fastLemmas(word, posFilter = '', exactOnly = true) {
  const ns = foldON(word);
  const st = db.prepare(`
    SELECT id, headword, pos, gender, prep_cases, zoega_def
    FROM lemmas WHERE normalized_search = ?
  `);
  st.bind([ns]);
  const all = [];
  while (st.step()) {
    const row = { source: 'lemma', ...st.getAsObject() };
    if (!posFilter || (row.pos || '').toLowerCase().includes(posFilter)) all.push(row);
  }
  st.free();
  const exact = all.filter(r => (r.headword || '').toLowerCase() === word);
  return exact.length ? exact : (exactOnly ? [] : all);
}

function lookupGrammarToken(raw, depth = 0) {
  const clean = normTok(raw);
  if (!clean) return [];
  if (GRAMMAR_CACHE.has(clean)) return GRAMMAR_CACHE.get(clean).map(x => ({ ...x }));

  let hits = [];

  // 1. Indexed wordform lookup
  hits.push(...fastInflected(clean, false));

  // 2. Indexed base lemma lookup
  hits.push(...fastLemmas(clean, '', false));

  // 3. Present participle (-andi / -ndi -> verb infinitive)
  if (!hits.length && clean.endsWith('ndi') && clean.length > 4) {
    const stem = clean.endsWith('andi') ? clean.slice(0, -4) + 'a' : clean.slice(0, -3) + 'a';
    for (const r of fastLemmas(stem, 'verb')) {
      hits.push({ ...r, source: 'derived', case_name: 'PRES. PART.' });
    }
  }

  // 4. Subjunctive (-i -> infinitive -a)
  if (clean.endsWith('i') && clean.length > 3 && !hits.some(h => /verb/i.test(h.pos || ''))) {
    const inf = clean.slice(0, -1) + 'a';
    for (const r of fastLemmas(inf, 'verb')) {
      hits.push({ ...r, source: 'derived', case_name: 'SUBJ.' });
    }
  }

  // 4b. Weak & -ja verb present endings (-ir, -ið -> -a or -ja infinitive, e.g., lyftir -> lyfta, berið -> berja)
  if (!hits.length && /(ið|ir)$/.test(clean) && clean.length > 3) {
    const tag = clean.endsWith('ið') ? 'PRES/IMP • 2PL' : 'PRES • 2SG/3SG';
    for (const inf of [clean.replace(/(ið|ir)$/, 'a'), clean.replace(/(ið|ir)$/, 'ja')]) {
      for (const r of fastLemmas(inf, 'verb', true)) {
        hits.push({ ...r, source: 'derived', case_name: tag, definiteness: 'VERB' });
      }
      if (hits.length) break;
    }
  }

  // 4c. Enclitic þú (-ðu / -du / -tu) on VERBS only (sáttu -> sátt + þú, segðu -> seg + þú) & standalone 2sg imperatives
  if (!hits.length && clean.length >= 2) {
    const encliticRe = /(ðu|du|tu)$/;
    const hasEnclitic = encliticRe.test(clean) && clean.length >= 4;
    const stem = hasEnclitic ? clean.replace(encliticRe, '') : clean;

    if (hasEnclitic) {
      if (STRONG_2SG_PAST[stem]) {
        const pair = STRONG_2SG_PAST[stem];
        const vHit = fastLemmas(pair.at(0), 'verb', true).shift();
        if (vHit) {
          hits.push({ ...vHit, source: 'derived', case_name: pair.at(1), definiteness: 'VERB (+ enclitic þú)' });
        }
      }
      if (!hits.length) {
        for (const r of fastInflected(stem, true)) {
          if (/verb/i.test(r.pos || '') || /VERB/i.test(r.definiteness || '')) {
            hits.push({ ...r, source: 'derived', definiteness: `${r.definiteness || 'VERB'} (+ enclitic þú)` });
          }
        }
      }
    }
    if (!hits.length) {
      const candInfs = [...new Set([stem + 'a', stem + 'ja', stem + 'va', stem])];
      for (const inf of candInfs) {
        const vHit = fastLemmas(inf, 'verb', true).shift();
        if (vHit) {
          hits.push({
            ...vHit,
            source: 'derived',
            case_name: 'IMP',
            number: '2SG',
            definiteness: hasEnclitic ? 'VERB (+ enclitic þú)' : 'VERB'
          });
          break;
        }
      }
    }
  }

  // 4d. Mediopassive / reflexive verbs (-sk / -st: opnast, beygist, snerisk)
  if (!hits.length && /(sk|st)$/.test(clean) && clean.length >= 4) {
    const mStem = clean.slice(0, -2);
    for (const cand of [mStem, mStem + 'r', mStem + 'a', mStem + 'i']) {
      for (const r of fastInflected(cand, true)) {
        if (/verb/i.test(r.pos || '') || /VERB/i.test(r.definiteness || '')) {
          hits.push({ ...r, source: 'derived', definiteness: `${r.definiteness || 'VERB'} (MEDIOPASSIVE)` });
        }
      }
      if (hits.length) break;
    }
    if (!hits.length) {
      for (const inf of [mStem + 'a', mStem + 'ja', mStem.replace(/[ia]$/, '') + 'a', mStem.replace(/[ia]$/, '') + 'ja']) {
        const vHit = fastLemmas(inf, 'verb', true).shift();
        if (vHit) {
          hits.push({ ...vHit, source: 'derived', case_name: 'MEDIOPASSIVE (-sk/-st)', definiteness: 'VERB' });
          break;
        }
      }
    }
  }

  // 4e. Enclitic definite article on nouns (laufunum -> laufum -> lauf DAT • PL • DEF)
  if (!hits.length && depth === 0 && clean.length >= 5) {
    const defRules = [
      ['unum', 'um', 'DAT', 'PL'],
      ['inum', 'i', 'DAT', 'SG'],
      ['inni', '', 'DAT', 'SG'],
      ['inu', 'i', 'DAT', 'SG'],
      ['innar', 'ar', 'GEN', 'SG'],
      ['ins', 's', 'GEN', 'SG'],
      ['anna', 'a', 'GEN', 'PL'],
      ['arnir', 'ar', 'NOM', 'PL'],
      ['irnir', 'ir', 'NOM', 'PL'],
      ['arnar', 'ar', 'ACC', 'PL'],
      ['irnar', 'ir', 'ACC', 'PL'],
      ['inn', '', 'NOM/ACC', 'SG'],
      ['in', '', 'NOM/ACC', 'SG/PL'],
      ['it', '', 'NOM/ACC', 'SG']
    ];
    for (const rule of defRules) {
      const suf = rule.at(0);
      if (clean.endsWith(suf) && clean.length - suf.length >= 3) {
        const indefCand = clean.slice(0, -suf.length) + rule.at(1);
        const nHits = fastInflected(indefCand, true).filter(r => /noun/i.test(r.pos || ''));
        if (nHits.length) {
          for (const r of nHits) {
            hits.push({ ...r, source: 'derived', definiteness: 'DEF' });
          }
          break;
        }
        const lHit = fastLemmas(indefCand, 'noun', true).shift();
        if (lHit) {
          hits.push({ ...lHit, source: 'derived', case_name: rule.at(2), number: rule.at(3), definiteness: 'DEF' });
          break;
        }
      }
    }
  }

  // 4f. Syncopated noun stems (jaðri -> jaðarr, fingrum -> fingr, himni -> himinn)
  if (!hits.length && clean.length >= 4) {
    const syncM = clean.match(/^(.+[ðgkptvbmnsl])([rnl])(i|um|ar)$/);
    if (syncM) {
      const pre = syncM.at(1);
      const liq = syncM.at(2);
      const end = syncM.at(3);
      const cCase = end === 'i' ? 'DAT' : end === 'um' ? 'DAT' : 'NOM/ACC';
      const cNum = end === 'i' ? 'SG' : 'PL';
      const cands = [
        pre + 'a' + liq + liq,
        pre + 'i' + liq + liq,
        pre + 'u' + liq + liq,
        pre + 'a' + liq,
        pre + liq
      ];
      for (const cand of cands) {
        const lHit = fastLemmas(cand, 'noun', true).shift();
        if (lHit) {
          hits.push({ ...lHit, source: 'derived', case_name: cCase, number: cNum, definiteness: 'INDEF' });
          break;
        }
      }
    }
  }

  // 4g. Past participles & strong adjective endings (huldir, ristnum, svartnuðum, seint)
  if (!hits.length && clean.length >= 4) {
    // -nuðum / -num / -nir / -nar -> -inn / -naðr participle or adjective
    const partM = clean.match(/^(.+)(nuðum|num|nir|nar|nu)$/);
    if (partM) {
      const pStem = partM.at(1);
      const pEnd = partM.at(2);
      const cCase = (pEnd === 'nuðum' || pEnd === 'num') ? 'DAT' : 'NOM/ACC';
      const cNum = 'PL';
      for (const cand of [pStem + 'inn', pStem + 'naðr', pStem + 'a', pStem + 'ja']) {
        const hit = fastLemmas(cand, '', true).shift();
        if (hit) {
          hits.push({ ...hit, source: 'derived', case_name: `${cCase} (PART./ADJ.)`, number: cNum });
          break;
        }
      }
    }
    // Neuter -t on strong adjectives (seint -> seinn, kalt -> kaldr, hart -> harðr)
    if (!hits.length && clean.endsWith('t') && clean.length >= 4) {
      const aStem = clean.slice(0, -1);
      for (const cand of [aStem + 'r', aStem + 'nr', aStem + 'nn', aStem + 'dr', aStem + 'ðr']) {
        const aHit = fastLemmas(cand, 'adjective', true).shift();
        if (aHit) {
          hits.push({ ...aHit, source: 'derived', case_name: 'NOM/ACC • NEUT.', number: 'SG', definiteness: 'INDEF' });
          break;
        }
      }
    }
    // Dental past participle plurals (huldir -> hylja)
    if (!hits.length && /(dir|ðir|tir)$/.test(clean) && clean.length >= 5) {
      const dStem = clean.replace(/(dir|ðir|tir)$/, '');
      const uStem = dStem.replace(/u(?=[^aeiouyáéíóúýǫøœæ]+$)/, 'y');
for (const cand of [uStem + 'ja', uStem + 'a', dStem + 'ja', dStem + 'a']) {
const vHit = fastLemmas(cand, 'verb', true).shift();
if (vHit) {
hits.push({ ...vHit, source: 'derived', case_name: 'PAST PART. • NOM • PL', definiteness: 'VERB' });
break;
}
}
}
}
// 4b. Short negative/intensive prefixes (ó-, ú-, á-, ør-) with full rule recursion
if (!hits.length && depth === 0 && clean.length >= 5) {
  for (const pfx of ['ó', 'ú', 'á', 'ør']) {
    if (clean.startsWith(pfx)) {
      const rest = clean.slice(pfx.length);
      const rHits = lookupGrammarToken(rest, depth + 1);
      if (rHits.length) {
        for (const rHit of rHits.slice(0, 3)) {
          hits.push({ ...rHit, source: 'compound', headword: pfx + '- + ' + rHit.headword });
        }
        break;
      }
    }
  }
}

// 5. Fast indexed compound-word decomposition (vetrveðri -> vetr + veðri, snjófǫllum -> snjór + fǫllum)
if (!hits.length && clean.length >= 6) {
for (let split = 3; split <= clean.length - 3; split++) {
const left = clean.slice(0, split);
const right = clean.slice(split);
const lHit = fastLemmas(left, '', true).shift() || fastLemmas(left + 'r', '', true).shift() || fastInflected(left, true).shift();
if (!lHit) continue;
const rHits = fastInflected(right, true);
if (rHits.length) {
for (const rHit of rHits.slice(0, 3)) {
hits.push({ ...rHit, source: 'compound', headword: lHit.headword + " + " + rHit.headword });
}
break;
}
const rLem = fastLemmas(right, '', true).shift();
if (rLem) {
hits.push({ ...rLem, source: 'compound', headword: lHit.headword + " + " + rLem.headword });
break;
}
}
}
hits.sort((a, b) => {
const score = x => {
let sc = (x.source === 'lemma' ? 0 : x.source === 'derived' ? 1 : 2);
if (/verb|prep|pron/i.test(x.pos || '')) sc -= 1;
if (/^from\s+/i.test((x.zoega_def || '').trim())) sc += 3;
return sc;
};
return score(a) - score(b);
});
GRAMMAR_CACHE.set(clean, hits);
return hits.map(x => ({ ...x }));
}
function getPronPerson(word) {
  const w = normTok(word);
  if (w === 'ek' || w === 'eg') return '1SG';
  if (w === 'þú') return '2SG';
  if (['hann','hon','þat'].includes(w)) return '3SG';
  if (w === 'vér' || w === 'vit') return '1PL';
  if (w === 'þér' || w === 'þit') return '2PL';
  if (['þeir','þær','þau'].includes(w)) return '3PL';
  return null;
}

function detectModernScandinavian(raw) {
  const w = raw.toLowerCase().replace(/^[^a-záéíóúýæøœǫþðä]+|[^a-záéíóúýæøœǫþðä]+$/gi, '');
  if (!w) return null;

  const isDirect = {
    'ég': 'ek', 'það': 'þat', 'hvað': 'hvat', 'éta': 'eta', 'féll': 'fell',
    'maður': 'maðr', 'dagur': 'dagr', 'vetur': 'vetr', 'kunngt': 'kunnt'
  };
  if (isDirect[w]) return { lang: 'Modern Icelandic', suggestion: isDirect[w] };

  const scandDirect = {
    'jeg': 'ek', 'jag': 'ek', 'mig': 'mik', 'meg': 'mik',
    'dig': 'þik', 'deg': 'þik', 'sig': 'sik', 'seg': 'sik',
    'vi': 'vér', 'de': 'þeir', 'dem': 'þá', 'det': 'þat',
    'og': 'ok', 'och': 'ok', 'ikke': 'eigi', 'inte': 'eigi', 'ikkje': 'eigi',
    'fra': 'frá', 'från': 'frá', 'till': 'til', 'med': 'með', 'av': 'af',
    'blod': 'blóð', 'sverd': 'sverð', 'svärd': 'sverð', 'skib': 'skip', 'skepp': 'skip'
  };
  if (scandDirect[w]) return { lang: 'Modern Scandinavian', suggestion: scandDirect[w] };

  const isCands = [];
  if (/(að|ið|uð)$/.test(w)) isCands.push(w.slice(0, -1) + 't');
  if (w.endsWith('ur') && w.length > 3) isCands.push(w.slice(0, -2) + 'r');
  if (w.includes('nngt')) isCands.push(w.replace('nngt', 'nt'));
  if (w.includes('é')) isCands.push(w.replace(/é/g, 'e'), w.replace(/é/g, 'já'));

  for (const c of isCands) {
    if (c !== w && lookupGrammarToken(c).length > 0) {
      return { lang: 'Modern Icelandic', suggestion: c };
    }
  }

  const scCands = [];
  let normSc = w.replace(/aa/g, 'á').replace(/ae/g, 'æ').replace(/oe/g, 'ø').replace(/ä/g, 'æ');
  if (normSc !== w) scCands.push(normSc);
  if (normSc.endsWith('et') && normSc.length > 3) scCands.push(normSc.slice(0, -2) + 'it');
  if (normSc.endsWith('d')) scCands.push(normSc.slice(0, -1) + 'ð', normSc.slice(0, -1) + 't');
  if (normSc.endsWith('b')) scCands.push(normSc.slice(0, -1) + 'p');

  for (const c of scCands) {
    if (c !== w && lookupGrammarToken(c).length > 0) {
      return { lang: 'Modern Scandinavian', suggestion: c };
    }
  }
  return null;
}

function analyzeGrammarClause(words) {
  const parsed = words.map(t => ({ raw: t, hits: lookupGrammarToken(t), notes: [] }));
  for (let i = 0; i < parsed.length; i++) {
    const cur = parsed[i];
    if (!cur.hits.length) {
      const mod = detectModernScandinavian(cur.raw);
      if (mod) {
        cur.notes.push({ ok: false, text: `✗ ${mod.lang} spelling detected — in Old Norse use "${mod.suggestion}"` });
      } else {
        cur.notes.push({ ok: false, text: '✗ Unrecognized wordform — check spelling or diacritics' });
      }
      continue;
    }
    const subjP = getPronPerson(cur.raw);
    if (subjP) {
      const windowToks = [...parsed.slice(Math.max(0, i - 2), i), ...parsed.slice(i + 1, i + 4)];
      const verbTok = windowToks.find(t => t.hits.some(h => /^(PRES|PAST)$/i.test(h.case_name || '')));
      if (verbTok) {
        const vForms = verbTok.hits.filter(h => /^(PRES|PAST)$/i.test(h.case_name || '')).map(h => (h.number || '').toUpperCase());
        if (vForms.includes(subjP)) cur.notes.push({ ok: true, text: `✓ Subject (${subjP}) agrees with verb "${verbTok.raw}"` });
        else if (vForms.length) cur.notes.push({ ok: false, text: `✗ Subject (${subjP}) does not match verb "${verbTok.raw}" (${[...new Set(vForms)].join('/')})` });
      }
    }
    const verbGovHit = cur.hits.find(h => /^(PRES|PAST)$/i.test(h.case_name || '') && inferGovCases(h, 'verb'));
    if (verbGovHit && cur.raw.toLowerCase() !== 'ok') {
      const req = inferGovCases(verbGovHit, 'verb');
      const objTok = parsed.slice(i + 1, i + 5).find(t => t.hits.some(h => /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || '')));
      if (objTok) {
        const objCases = objTok.hits.map(h => (h.case_name || '').toUpperCase()).filter(c => /^(NOM|ACC|DAT|GEN)$/.test(c));
        if (objCases.some(c => req.includes(c))) cur.notes.push({ ok: true, text: `✓ Verb "${verbGovHit.headword}" governs ${req} (matches "${objTok.raw}")` });
        else if (objCases.length) cur.notes.push({ ok: false, text: `✗ Verb "${verbGovHit.headword}" governs ${req}, but "${objTok.raw}" is ${[...new Set(objCases)].join('/')}` });
      }
    }
    const prepHit = cur.hits.find(h => inferGovCases(h, 'prep'));
    if (prepHit && cur.raw.toLowerCase() !== 'ok') {
      const req = inferGovCases(prepHit, 'prep');
      const target = parsed.slice(i + 1, i + 4).find(t => t.hits.some(h => /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || '')));
      if (target) {
        const tCases = target.hits.map(h => (h.case_name || '').toUpperCase()).filter(c => /^(NOM|ACC|DAT|GEN)$/.test(c));
        const hasGenEnd = req.includes('GEN') && /(a|ar|s|na)$/i.test(target.raw);
        if (tCases.some(c => req.includes(c)) || hasGenEnd) cur.notes.push({ ok: true, text: `✓ Preposition "${prepHit.headword}" governs ${req} (matches "${target.raw}")` });
        else if (tCases.length) cur.notes.push({ ok: false, text: `✗ Preposition "${prepHit.headword}" governs ${req}, but "${target.raw}" is ${[...new Set(tCases)].join('/')}` });
      } else {
        cur.notes.push({ ok: false, text: `✗ Preposition "${prepHit.headword}" has no nominal object following it` });
      }
    }
    const isDet = cur.hits.some(h => /pron/i.test(h.pos || '') && /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || '') && !/^(ek|þú|hann|hon|vér|þér|þeir|þær|þau|hvat|hverr|hvárr)$/i.test(h.headword || ''));
    const nextTok = parsed[i + 1];
    if (isDet && nextTok) {
      const nextNouns = nextTok.hits.filter(h => /noun/i.test(h.pos || '') && /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || ''));
      if (nextNouns.length) {
        const detPairs = cur.hits.filter(h => /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || '')).map(h => `${h.case_name}|${h.number}`.toUpperCase());
        const shared = nextNouns.filter(h => detPairs.includes(`${h.case_name}|${h.number}`.toUpperCase()));
        if (shared.length) cur.notes.push({ ok: true, text: `✓ Agrees in case/number (${shared[0].case_name} ${shared[0].number}) with "${nextTok.raw}"` });
        else if (detPairs.some(p => p.startsWith("DAT|")) && /a$/i.test(nextTok.raw) && nextTok.hits.some(h => /adj/i.test(h.pos || ""))) cur.notes.push({ ok: true, text: `✓ Weak dative singular agreement (DAT SG) with "${nextTok.raw}"` });
        else cur.notes.push({ ok: false, text: `✗ Case/number mismatch between "${cur.raw}" and noun "${nextTok.raw}"` });
      }
    }
    if (!cur.notes.length) {
      const top = cur.hits[0];
      const morph = [top.case_name, top.number, top.definiteness].filter(Boolean).join(' • ');
      cur.notes.push({ ok: true, text: '✓ Grammatically Correct' });
    }
  }
  return parsed;
}

function runGrammarAnalysis() {
  const rawText = $('gramInput').value.trim();
  LAST_GRAMMAR_TEXT = rawText;
  if (!rawText) return;
  const clauses = rawText.split(/[\n.!?]+/).map(c => c.trim()).filter(Boolean);
  const allParsed = clauses.flatMap(c => analyzeGrammarClause(c.split(/\s+/).filter(Boolean)));

  $('gramResults').innerHTML = allParsed.map(item => {
    const resolved = item.hits.map(h => {
      const copy = { ...h };
      const tagPos = /VERB/i.test(copy.definiteness || '') ? 'verb'
                   : /NOUN/i.test(copy.definiteness || '') ? 'noun'
                   : /ADJ/i.test(copy.definiteness || '') ? 'adjective' : '';
      if (tagPos && copy.pos && !copy.pos.toLowerCase().includes(tagPos)) {
        const sp = db.prepare("SELECT id, pos, gender, zoega_def FROM lemmas WHERE LOWER(headword) = ? AND LOWER(pos) LIKE ? LIMIT 1");
        sp.bind([(copy.headword || '').toLowerCase(), `%${tagPos}%`]);
        if (sp.step()) {
          const alt = sp.getAsObject();
          copy.id = alt.id; copy.pos = alt.pos; copy.gender = alt.gender;
          if (alt.zoega_def) copy.zoega_def = alt.zoega_def;
        } else {
          copy.pos = tagPos; copy.gender = '';
        }
        sp.free();
      }
      if (tagPos === 'verb' && copy.zoega_def && /\bII\)/.test(copy.zoega_def)) {
        const part2 = copy.zoega_def.split(/\bII\)/).pop() || '';
        copy.zoega_def = part2.replace(/^\s*\([^)]+\),\s*v\.\s*/i, '').trim();
      }
      return copy;
    });

    const grouped = [];
    const gMap = new Map();
    for (const h of resolved) {
      const morph = [h.case_name, h.number, h.definiteness].filter(Boolean).join(' • ') || 'base lemma';
      const gKey = `${(h.headword||'').toLowerCase()}|${h.pos||''}|${(h.zoega_def||'').slice(0, 80)}`;
      if (!gMap.has(gKey)) {
        const entry = { h, morphs: [morph] };
        gMap.set(gKey, entry);
        grouped.push(entry);
      } else if (!gMap.get(gKey).morphs.includes(morph)) {
        gMap.get(gKey).morphs.push(morph);
      }
    }

    const lines = grouped.slice(0, 5).map(({ h, morphs }) => {
      const meta = [h.pos, h.gender].filter(Boolean).join(' ');
      const gloss = (h.zoega_def || '').replace(/\s+/g, ' ').slice(0, 95);
      const mf = h.form ? h.form.replace(/'/g, "\\'") : '';
      return `<div class="g-parse">
        <span class="g-link" onclick="RETURN_TO_GRAMMAR=true; openEntry(${h.id}, '${mf}')">${esc(h.headword)}</span> ${meta ? `<em>(${esc(meta)})</em>` : ''}
        — <span style="color:#E8C988">${esc(morphs.join(' / '))}</span>
        ${gloss ? `<div style="opacity:.8">${esc(gloss)}</div>` : ''}
      </div>`;
    }).join('');

    const notesHTML = item.notes.map(n =>
      `<div style="color:${n.ok ? '#8fd998' : '#ff8a75'};font-size:11.5px;margin-top:4px">${esc(n.text)}</div>`
    ).join('');

    return `<div class="g-tok"><div class="g-word">${esc(item.raw)}</div>${lines}${notesHTML}</div>`;
  }).join('');
}

function openGrammarTool() {
  RETURN_TO_GRAMMAR = false;
  $('alphaGrid').style.display = 'none';
  $('listCard').style.display = 'none';
  $('homeBtn').style.display = 'inline-block';
  $('subStatus').style.display = 'block';
  $('subStatus').textContent = 'Sentence & Grammar Analyzer';
  $('root').classList.add('open');
  $('mainArea').style.flex = '1';
  $('detailCard').style.display = 'block';
  $('detailCard').innerHTML = `
    <div class="det-top">
      <span class="det-hw" style="font-size:18px">Grammar &amp; Syntax Analyzer</span>
      <button class="back-pill" onclick="renderAlphaGrid()">←</button>
    </div>
    <textarea id="gramInput" class="gram-area" placeholder="Enter Old Norse text (e.g. Ek held hinu fornu blóði)...">${esc(LAST_GRAMMAR_TEXT)}</textarea>
    <button class="gram-run" onclick="runGrammarAnalysis()">Analyze Sentence</button>
    <div id="gramResults"></div>
  `;
  if (LAST_GRAMMAR_TEXT) runGrammarAnalysis();
}

$('grammarBtn').onclick = openGrammarTool;
