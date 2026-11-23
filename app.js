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
  const grid = document.getElementById('alphaGrid');
  if (!grid) return;
  if ($('listCard')) $('listCard').style.display = 'none';
  if ($('detailCard')) $('detailCard').style.display = 'none';
  if ($('homeBtn')) $('homeBtn').style.display = 'none';
  if ($('subStatus')) { $('subStatus').style.display = 'none'; $('subStatus').textContent = ''; }
  if ($('root')) $('root').classList.remove('open');
  grid.style.display = 'block';
  const pts = [{"k": "UPD", "x": 18.21, "y": 28.37}, {"k": "a", "x": 31.37, "y": 28.37}, {"k": "á", "x": 43.77, "y": 28.37}, {"k": "b", "x": 56.4, "y": 28.37}, {"k": "d", "x": 69.62, "y": 28.37}, {"k": "ð", "x": 82.78, "y": 28.37}, {"k": "e", "x": 17.63, "y": 36.14}, {"k": "é", "x": 31.02, "y": 36.14}, {"k": "f", "x": 43.3, "y": 36.14}, {"k": "g", "x": 56.82, "y": 36.14}, {"k": "h", "x": 69.8, "y": 36.14}, {"k": "i", "x": 82.73, "y": 36.14}, {"k": "í", "x": 17.45, "y": 44.07}, {"k": "j", "x": 30.02, "y": 44.07}, {"k": "k", "x": 44.3, "y": 44.07}, {"k": "l", "x": 56.64, "y": 44.07}, {"k": "m", "x": 69.1, "y": 44.07}, {"k": "n", "x": 80.67, "y": 44.07}, {"k": "o", "x": 17.51, "y": 51.25}, {"k": "ó", "x": 30.49, "y": 51.25}, {"k": "p", "x": 43.36, "y": 51.25}, {"k": "r", "x": 57.23, "y": 51.25}, {"k": "s", "x": 69.92, "y": 51.25}, {"k": "t", "x": 82.84, "y": 51.25}, {"k": "u", "x": 18.04, "y": 58.8}, {"k": "ú", "x": 31.14, "y": 58.8}, {"k": "v", "x": 44.01, "y": 58.8}, {"k": "y", "x": 57.23, "y": 58.8}, {"k": "ý", "x": 70.39, "y": 58.8}, {"k": "þ", "x": 83.14, "y": 58.8}, {"k": "æ", "x": 24.85, "y": 65.67}, {"k": "ø", "x": 42.6, "y": 65.67}, {"k": "ǫ", "x": 58.58, "y": 65.67}, {"k": "œ", "x": 75.91, "y": 65.67}];
  grid.innerHTML = pts.map(p => {
    if (p.k === 'UPD') {
      const cls = window.__updReady ? 'upd-ready' : 'upd-ok';
      return '<button id="updateBtn" type="button" class="alpha-btn ' + cls + '" data-action="upd" style="left:' + p.x + '%;top:' + p.y + '%;" aria-label="Update"></button>';
    }
    return '<button type="button" class="alpha-btn" data-letter="' + p.k + '" style="left:' + p.x + '%;top:' + p.y + '%;" aria-label="' + p.k + '"></button>';
  }).join('');
  grid.onclick = function(e) {
    const btn = e.target.closest('.alpha-btn');
    if (!btn) return;
    if (btn.dataset.action === 'upd') {
      if (typeof handleUpdateClick === 'function') handleUpdateClick();
      return;
    }
    if (btn.dataset.letter) filterByLetter(btn.dataset.letter);
  };
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
    <span class="wr-hw">${esc(r.headword)}
    ${tag ? `<span class="wr-sub">(${esc(tag)})` : ''}
    ${r.matchedForm ? `<span class="wr-sub">← ${esc(r.matchedForm)}` : ''}
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
  $('listCard').innerHTML = rows.length ? '' : '<div class="word-row"><span class="wr-sub">No entries found.</div>';
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
      <div><span class="det-hw">${esc(r.headword)}${meta ? `<span class="det-pos">${esc(meta)}` : ''}</div>
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

  const cwMatches = q ? getCraftedWords().filter(x => x.headword.includes(q.toLowerCase()) || (x.zoega_def || "").toLowerCase().includes(q.toLowerCase())).map(x => ({ id: x.id, headword: x.headword, pos: x.pos, gender: x.gender, zoega_def: x.zoega_def })) : [];
    const results = [...cwMatches, ...onResults, ...engResults];
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
    st.style.display = 'none'; st.textContent = '';
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



const ON_INDECLINABLES = {
  'áðr':  { headword: 'áðr',  pos: 'adverb / conjunction', zoega_def: 'adv. & conj. before, ere, previously' },
  'æva':  { headword: 'æva',  pos: 'adverb', zoega_def: 'adv. never' },
  'eigi': { headword: 'eigi', pos: 'adverb', zoega_def: 'adv. not' },
  'ekki': { headword: 'ekki', pos: 'adverb / pronoun', zoega_def: 'not; nothing' },
  'svá':  { headword: 'svá',  pos: 'adverb', zoega_def: 'adv. so, thus' },
  'þó':   { headword: 'þó',   pos: 'adverb / conjunction', zoega_def: 'adv. & conj. yet, though, nevertheless' },
  'nú':   { headword: 'nú',   pos: 'adverb', zoega_def: 'adv. now' },
  'hér':  { headword: 'hér',  pos: 'adverb', zoega_def: 'adv. here' },
  'þar':  { headword: 'þar',  pos: 'adverb', zoega_def: 'adv. there' },
  'sem':  { headword: 'sem',  pos: 'conjunction', zoega_def: 'conj. as, which, who' },
  'er':   { headword: 'er',   pos: 'conjunction / verb', zoega_def: 'rel. particle who, which, when; is' },
  'en':   { headword: 'en',   pos: 'conjunction', zoega_def: 'conj. but, and; than' },
  'ok':   { headword: 'ok',   pos: 'conjunction', zoega_def: 'conj. and, also' },
  'at':   { headword: 'at',   pos: 'preposition / conjunction', zoega_def: 'to, at; that' }
};

const ON_DETERMINERS = {
  'hinn':   [{ headword: 'hinn', pos: 'pronoun', gender: 'm.', case_name: 'NOM', number: 'SG' }, { headword: 'hinn', pos: 'pronoun', gender: 'm.', case_name: 'ACC', number: 'SG' }],
  'hin':    [{ headword: 'hinn', pos: 'pronoun', gender: 'f.', case_name: 'NOM', number: 'SG' }, { headword: 'hinn', pos: 'pronoun', gender: 'n.', case_name: 'NOM', number: 'PL' }, { headword: 'hinn', pos: 'pronoun', gender: 'n.', case_name: 'ACC', number: 'PL' }],
  'hit':    [{ headword: 'hinn', pos: 'pronoun', gender: 'n.', case_name: 'NOM', number: 'SG' }, { headword: 'hinn', pos: 'pronoun', gender: 'n.', case_name: 'ACC', number: 'SG' }],
  'hið':    [{ headword: 'hinn', pos: 'pronoun', gender: 'n.', case_name: 'NOM', number: 'SG' }, { headword: 'hinn', pos: 'pronoun', gender: 'n.', case_name: 'ACC', number: 'SG' }],
  'hina':   [{ headword: 'hinn', pos: 'pronoun', gender: 'f.', case_name: 'ACC', number: 'SG' }, { headword: 'hinn', pos: 'pronoun', gender: 'm.', case_name: 'ACC', number: 'PL' }],
  'hinni':  [{ headword: 'hinn', pos: 'pronoun', gender: 'f.', case_name: 'DAT', number: 'SG' }],
  'hinu':   [{ headword: 'hinn', pos: 'pronoun', gender: 'n.', case_name: 'DAT', number: 'SG' }],
  'hinum':  [{ headword: 'hinn', pos: 'pronoun', gender: 'm.', case_name: 'DAT', number: 'SG' }, { headword: 'hinn', pos: 'pronoun', gender: 'm.', case_name: 'DAT', number: 'PL' }, { headword: 'hinn', pos: 'pronoun', gender: 'f.', case_name: 'DAT', number: 'PL' }, { headword: 'hinn', pos: 'pronoun', gender: 'n.', case_name: 'DAT', number: 'PL' }],
  'hins':   [{ headword: 'hinn', pos: 'pronoun', gender: 'm.', case_name: 'GEN', number: 'SG' }, { headword: 'hinn', pos: 'pronoun', gender: 'n.', case_name: 'GEN', number: 'SG' }],
  'hinnar': [{ headword: 'hinn', pos: 'pronoun', gender: 'f.', case_name: 'GEN', number: 'SG' }],
  'hinna':  [{ headword: 'hinn', pos: 'pronoun', gender: 'm.', case_name: 'GEN', number: 'PL' }, { headword: 'hinn', pos: 'pronoun', gender: 'f.', case_name: 'GEN', number: 'PL' }, { headword: 'hinn', pos: 'pronoun', gender: 'n.', case_name: 'GEN', number: 'PL' }],
  'sá':      [{ headword: 'sá',  pos: 'pronoun', gender: 'm.', case_name: 'NOM', number: 'SG' }],
  'sú':      [{ headword: 'sá',  pos: 'pronoun', gender: 'f.', case_name: 'NOM', number: 'SG' }],
  'þat':     [{ headword: 'þat', pos: 'pronoun', gender: 'n.', case_name: 'NOM', number: 'SG' }, { headword: 'þat', pos: 'pronoun', gender: 'n.', case_name: 'ACC', number: 'SG' }],
  'þann':    [{ headword: 'þat', pos: 'pronoun', gender: 'm.', case_name: 'ACC', number: 'SG' }],
  'þá':      [{ headword: 'þat', pos: 'pronoun', gender: 'f.', case_name: 'ACC', number: 'SG' }, { headword: 'þat', pos: 'pronoun', gender: 'm.', case_name: 'ACC', number: 'PL' }],
  'þeim':    [{ headword: 'þat', pos: 'pronoun', gender: 'm.', case_name: 'DAT', number: 'SG' }, { headword: 'þat', pos: 'pronoun', gender: 'm.', case_name: 'DAT', number: 'PL' }, { headword: 'þat', pos: 'pronoun', gender: 'f.', case_name: 'DAT', number: 'PL' }, { headword: 'þat', pos: 'pronoun', gender: 'n.', case_name: 'DAT', number: 'PL' }],
  'þeirri':  [{ headword: 'þat', pos: 'pronoun', gender: 'f.', case_name: 'DAT', number: 'SG' }],
  'þeiri':   [{ headword: 'þat', pos: 'pronoun', gender: 'f.', case_name: 'DAT', number: 'SG' }],
  'því':     [{ headword: 'þat', pos: 'pronoun', gender: 'n.', case_name: 'DAT', number: 'SG' }],
  'þí':      [{ headword: 'þat', pos: 'pronoun', gender: 'n.', case_name: 'DAT', number: 'SG' }],
  'þess':    [{ headword: 'þat', pos: 'pronoun', gender: 'm.', case_name: 'GEN', number: 'SG' }, { headword: 'þat', pos: 'pronoun', gender: 'n.', case_name: 'GEN', number: 'SG' }],
  'þeirrar': [{ headword: 'þat', pos: 'pronoun', gender: 'f.', case_name: 'GEN', number: 'SG' }],
  'þeirar':  [{ headword: 'þat', pos: 'pronoun', gender: 'f.', case_name: 'GEN', number: 'SG' }],
  'þeir':    [{ headword: 'þat', pos: 'pronoun', gender: 'm.', case_name: 'NOM', number: 'PL' }],
  'þær':     [{ headword: 'þat', pos: 'pronoun', gender: 'f.', case_name: 'NOM', number: 'PL' }, { headword: 'þat', pos: 'pronoun', gender: 'f.', case_name: 'ACC', number: 'PL' }],
  'þau':     [{ headword: 'þat', pos: 'pronoun', gender: 'n.', case_name: 'NOM', number: 'PL' }, { headword: 'þat', pos: 'pronoun', gender: 'n.', case_name: 'ACC', number: 'PL' }],
  'þeirra':  [{ headword: 'þat', pos: 'pronoun', gender: 'm.', case_name: 'GEN', number: 'PL' }, { headword: 'þat', pos: 'pronoun', gender: 'f.', case_name: 'GEN', number: 'PL' }, { headword: 'þat', pos: 'pronoun', gender: 'n.', case_name: 'GEN', number: 'PL' }],
  'þeira':   [{ headword: 'þat', pos: 'pronoun', gender: 'm.', case_name: 'GEN', number: 'PL' }, { headword: 'þat', pos: 'pronoun', gender: 'f.', case_name: 'GEN', number: 'PL' }, { headword: 'þat', pos: 'pronoun', gender: 'n.', case_name: 'GEN', number: 'PL' }],
  'þessi':  [{ headword: 'þessi', pos: 'pronoun', gender: 'm.', case_name: 'NOM', number: 'SG' }, { headword: 'þessi', pos: 'pronoun', gender: 'f.', case_name: 'NOM', number: 'SG' }],
  'þetta':  [{ headword: 'þessi', pos: 'pronoun', gender: 'n.', case_name: 'NOM', number: 'SG' }, { headword: 'þessi', pos: 'pronoun', gender: 'n.', case_name: 'ACC', number: 'SG' }],
  'þessum': [{ headword: 'þessi', pos: 'pronoun', gender: 'm.', case_name: 'DAT', number: 'SG' }, { headword: 'þessi', pos: 'pronoun', gender: 'm.', case_name: 'DAT', number: 'PL' }, { headword: 'þessi', pos: 'pronoun', gender: 'f.', case_name: 'DAT', number: 'PL' }, { headword: 'þessi', pos: 'pronoun', gender: 'n.', case_name: 'DAT', number: 'PL' }],
  'þessu':  [{ headword: 'þessi', pos: 'pronoun', gender: 'n.', case_name: 'DAT', number: 'SG' }]
};

function lookupGrammarToken(raw, depth = 0) {
  const __k = (raw || "").toLowerCase().replace(/^[^a-záéíóúýæøǫœþð]+|[^a-záéíóúýæøǫœþð]+$/gi, "");
  for (const __cw of getCraftedWords()) {
    const __fHits = (__cw.forms || []).filter(f => f.form === __k);
    if (__fHits.length) {
      return __fHits.map(f => ({ id: __cw.id, headword: __cw.headword, pos: __cw.pos, gender: __cw.gender, form: f.form, case_name: f.case_name || 'NOM', number: f.number || 'SG', definiteness: f.definiteness || 'INDEF', zoega_def: __cw.zoega_def }));
    }
    if (__cw.headword === __k) {
      return [{ id: __cw.id, headword: __cw.headword, pos: __cw.pos, gender: __cw.gender, form: __cw.headword, case_name: 'NOM', number: 'SG', definiteness: 'INDEF', zoega_def: __cw.zoega_def }];
    }
  }
  if (typeof ON_CLOSED_CLASS !== "undefined" && ON_CLOSED_CLASS[__k]) return ON_CLOSED_CLASS[__k];
  const __low = (raw || "").toLowerCase();
  if (ON_INDECLINABLES[__low]) {
    const x = ON_INDECLINABLES[__low];
    return [{ id: 0, headword: x.headword, pos: x.pos, gender: "", form: __low, case_name: "", number: "", definiteness: "", zoega_def: x.zoega_def }];
  }
  if (ON_DETERMINERS[__low]) {
    return ON_DETERMINERS[__low].map(d => ({ id: 0, headword: (/^þ/i.test(_low) && d.headword === 'sá') ? 'þat' : d.headword, pos: d.pos, gender: d.gender, form: __low, case_name: d.case_name, number: d.number, definiteness: "DEF", zoega_def: "demonstrative / definite article" }));
  }
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

  // 4d. Enclitic definite article suffixes (-inn, -in, -it, -unum, -inum, -num, -ins, -nna, -nir, -nar, -na, -un) BEFORE compound splitting
  if (!hits.length && depth === 0 && clean.length >= 5) {
    const defRules = [
      [/unum$/, ['', 'u'], 'DAT · PL · DEF'],
      [/inum$/, ['i', ''], 'DAT · SG · DEF'],
      [/num$/, ['', 'i', 'u'], 'DAT · SG · DEF'],
      [/ins$/, ['', 's', 'ar'], 'GEN · SG · DEF'],
      [/nna$/, ['a', ''], 'GEN · PL · DEF'],
      [/nir$/, ['r', 'ar', 'ir', ''], 'NOM · PL · DEF'],
      [/nar$/, ['r', 'ar', 'ir', ''], 'NOM/ACC · PL · DEF'],
      [/inn$/, ['r', '', 'i'], 'NOM/ACC · SG · DEF'],
      [/in$/, ['', 'a', 'i'], 'NOM/ACC · SG · DEF'],
      [/it$/, ['', 'i'], 'NOM/ACC · SG · DEF'],
      [/un$/, ['u', 'a'], 'NOM/ACC · PL · DEF'],
      [/na$/, ['', 'a', 'u'], 'ACC/GEN · DEF']
    ];
    for (const [rx, sufList, tag] of defRules) {
      if (rx.test(clean)) {
        const base = clean.replace(rx, '');
        if (base.length >= 2) {
          for (const sf of sufList) {
            const sub = lookupGrammarToken(base + sf, depth + 1).filter(h => !/verb|prep/i.test(h.pos || ''));
            if (sub.length) {
              hits.push(...sub.slice(0, 3).map(r => ({ ...r, source: 'derived', definiteness: tag })));
              break;
            }
          }
        }
        if (hits.length) break;
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
const rHits = fastInflected(right, true).filter(h => !/verb/i.test(h.pos || '') && !/^(PRES|PAST|IMP|SUBJ)$/i.test(h.case_name || ''));
if (rHits.length) {
for (const rHit of rHits.slice(0, 3)) {
hits.push({ ...rHit, source: 'compound', headword: lHit.headword + " + " + rHit.headword });
}
break;
}
const rLem = fastLemmas(right, '', true).filter(h => !/verb/i.test(h.pos || '')).shift();
if (rLem) {
hits.push({ ...rLem, source: 'compound', headword: lHit.headword + " + " + rLem.headword });
break;
}
}
}
  // 6. Universal Old Norse fallback resolver (mediopassive -sk/-st, enclitic -inn, linking compounds, orthography, -liga/-ari/-astr)
  if (!hits.length && depth === 0 && clean.length >= 3) {
    // 6a. Mediopassive / reflexive -sk / -st verbs (e.g. finnask, sýnast)
    if (/(sk|st)$/.test(clean) && clean.length >= 4) {
      const stem = clean.replace(/(sk|st)$/, '');
      for (const base of [stem, stem + 'a', stem + 'r', stem + 'i', stem + 'u', stem + 'um']) {
        const sub = lookupGrammarToken(base, depth + 1).filter(h => /verb/i.test(h.pos || '') || /^(PRES|PAST|INF|IMP)$/i.test(h.case_name || ''));
        if (sub.length) {
          hits.push(...sub.slice(0, 3).map(r => ({ ...r, source: 'derived', definiteness: (r.definiteness || 'VERB') + ' (-sk/-st mediopassive)' })));
          break;
        }
      }
    }

    // 6b. Enclitic definite article suffixes (-inn, -in, -it, -num, -ins, -nna, -nir, -nar, -na, -un)
    if (!hits.length && clean.length >= 5) {
      const defRules = [
        [/inum$/, ['i', ''], 'DAT · SG · DEF'],
        [/num$/, ['', 'i', 'u'], 'DAT · SG · DEF'],
        [/ins$/, ['', 's', 'ar'], 'GEN · SG · DEF'],
        [/nna$/, ['a', ''], 'GEN · PL · DEF'],
        [/nir$/, ['r', 'ar', 'ir', ''], 'NOM · PL · DEF'],
        [/nar$/, ['r', 'ar', 'ir', ''], 'NOM/ACC · PL · DEF'],
        [/inn$/, ['r', '', 'i'], 'NOM/ACC · SG · DEF'],
        [/in$/, ['', 'a', 'i'], 'NOM/ACC · SG · DEF'],
        [/it$/, ['', 'i'], 'NOM/ACC · SG · DEF'],
        [/un$/, ['u', 'a'], 'NOM/ACC · PL · DEF'],
        [/na$/, ['', 'a', 'u'], 'ACC/GEN · DEF']
      ];
      for (const [rx, sufList, tag] of defRules) {
        if (rx.test(clean)) {
          const base = clean.replace(rx, '');
          if (base.length >= 2) {
            for (const sf of sufList) {
              const sub = lookupGrammarToken(base + sf, depth + 1);
              if (sub.length) {
                hits.push(...sub.slice(0, 3).map(r => ({ ...r, source: 'derived', definiteness: tag })));
                break;
              }
            }
          }
          if (hits.length) break;
        }
      }
    }

    // 6c. Adverbial -liga / -la and Comparative/Superlative -ari / -astr / -ast
    if (!hits.length && clean.length >= 5) {
      if (/(liga|la)$/.test(clean)) {
        const stem = clean.replace(/(liga|la)$/, '');
        for (const cand of [stem + 'r', stem + 'ligr', stem, stem + 'a', stem + 'i']) {
          const sub = lookupGrammarToken(cand, depth + 1);
          if (sub.length) { hits.push({ ...sub, pos: 'adv.', case_name: 'ADV', number: '', definiteness: 'ADV (-liga)', source: 'derived' }); break; }
        }
      } else if (/(ari|ara|aru|astr|ast|asta|astu|asti)$/.test(clean)) {
        const stem = clean.replace(/(ari|ara|aru|astr|ast|asta|astu|asti)$/, '');
        const deg = /ast/.test(clean) ? 'SUPERL' : 'COMP';
        for (const cand of [stem + 'r', stem, stem + 'a', stem + 'i']) {
          const sub = lookupGrammarToken(cand, depth + 1).filter(h => /adj|adv/i.test(h.pos || ''));
          if (sub.length) { hits.push({ ...sub, definiteness: deg, source: 'derived' }); break; }
        }
      }
    }

    // 6d. Compound decomposition with linking connectors (-s-, -a-, -u-, -i-, or dropped -r)
    if (!hits.length && clean.length >= 6) {
      for (let split = 3; split <= clean.length - 3; split++) {
        const left = clean.slice(0, split);
        const right = clean.slice(split);
        const rHits = fastInflected(right, true).filter(h => !/verb/i.test(h.pos || '') && !/^(PRES|PAST|IMP|SUBJ)$/i.test(h.case_name || ''));
        const rLem = rHits.length ? null : fastLemmas(right, '', true).shift();
        if (!rHits.length && !rLem) continue;
        const leftCands = [left, left + 'r', left + 'a', left + 'i', left + 'u', left.replace(/[saui]$/, ''), left.replace(/[saui]$/, '') + 'r'].filter(x => x.length >= 2);
        let lHit = null;
        for (const lc of leftCands) {
          lHit = fastLemmas(lc, '', true).shift() || fastInflected(lc, true).shift();
          if (lHit) break;
        }
        if (lHit) {
          if (rHits.length) hits.push(...rHits.slice(0, 3).map(r => ({ ...r, source: 'compound', headword: lHit.headword + ' + ' + r.headword })));
          else hits.push({ ...rLem, source: 'compound', headword: lHit.headword + ' + ' + rLem.headword });
          break;
        }
      }
    }

    // 6e. Orthographic normalization (ö/ǫ, ø/œ, æ/ǽ, ð/d, þ/th, unaccented -> accented vowels)
    if (!hits.length) {
      const orthoVars = new Set([
        clean.replace(/ö/g, 'ǫ').replace(/ø/g, 'œ').replace(/ǽ/g, 'æ'),
        clean.replace(/ǫ/g, 'ö').replace(/œ/g, 'ø'),
        clean.replace(/th/g, 'þ').replace(/d/g, 'ð'),
        clean.replace(/j/g, 'i').replace(/v/g, 'u')
      ]);
      const accMap = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', y: 'ý' };
      for (let idx = 0; idx < clean.length; idx++) {
        if (accMap[clean[idx]]) orthoVars.add(clean.slice(0, idx) + accMap[clean[idx]] + clean.slice(idx + 1));
      }
      orthoVars.delete(clean);
      for (const v of orthoVars) {
        const sub = lookupGrammarToken(v, depth + 1);
        if (sub.length) {
          hits.push(...sub.slice(0, 4).map(r => ({ ...r, source: 'derived' })));
          break;
        }
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


function suggestFormForTok(tok, reqCases, reqNum, reqGender, reqDef = '') {
  if (tok && /^þat$/i.test(tok.raw || '') && (reqGender || '').toLowerCase().startsWith('m') && (reqNum || '').toUpperCase() === 'SG') return 'hinn';
  if (!tok || !tok.hits || !tok.hits.length) return '';
  const rawCases = Array.isArray(reqCases) ? reqCases : (reqCases ? String(reqCases).split(/[\s,/]+/) : []);
  const cases = rawCases.map(c => c.toUpperCase()).filter(Boolean);
  const num = (reqNum || '').toUpperCase();
  const gen = (reqGender || '').toLowerCase().replace(/[^mfn]/g, '');
  const def = (reqDef || '').toUpperCase();
  const hws = [...new Set(tok.hits.map(h => h.headword).filter(Boolean))];
  const mDef = (d) => !def || (d || '').toUpperCase() === def;

  for (const cw of getCraftedWords()) {
    if (hws.includes(cw.headword)) {
      const f = (cw.forms || []).find(x => (!cases.length || cases.includes((x.case_name || '').toUpperCase())) && (!num || (x.number || '').toUpperCase() === num) && mDef(x.definiteness)) ||
                (cw.forms || []).find(x => (!cases.length || cases.includes((x.case_name || '').toUpperCase())) && (!num || (x.number || '').toUpperCase() === num));
      if (f) return f.form;
    }
  }
  if (typeof ON_CLOSED_CLASS !== 'undefined') {
    for (const k of Object.keys(ON_CLOSED_CLASS)) {
      const m = ON_CLOSED_CLASS[k].find(x => hws.includes(x.headword) && (!cases.length || cases.includes((x.case_name || '').toUpperCase())) && (!num || (x.number || '').toUpperCase() === num) && (!gen || !x.gender || x.gender.toLowerCase().replace(/[^mfn]/g, '') === gen) && mDef(x.definiteness)) ||
                ON_CLOSED_CLASS[k].find(x => hws.includes(x.headword) && (!cases.length || cases.includes((x.case_name || '').toUpperCase())) && (!num || (x.number || '').toUpperCase() === num) && (!gen || !x.gender || x.gender.toLowerCase().replace(/[^mfn]/g, '') === gen));
      if (m) return m.form;
    }
  }
  const lids = [...new Set(tok.hits.map(h => h.id).filter(id => id > 0))];
  if (lids.length && typeof db !== 'undefined' && db) {
    try {
      const clist = cases.map(c => `'${c}'`).join(',');
      const w = `WHERE lemma_id IN (${lids.join(',')})` + (clist ? ` AND UPPER(case_name) IN (${clist})` : '') + (num ? ` AND UPPER(number)='${num}'` : '');
      if (def) {
        const r1 = db.exec(`SELECT form FROM wordforms ${w} AND UPPER(definiteness)='${def}' LIMIT 1`);
        if (r1.length && r1[0].values.length) return String(r1[0].values[0][0]);
      }
      const r2 = db.exec(`SELECT form FROM wordforms ${w} LIMIT 1`);
      if (r2.length && r2[0].values.length) return String(r2[0].values[0][0]);
    } catch (_) {}
  }
  return '';
}

function analyzeGrammarClause(words) {
  const parsed = words.map(t => ({ raw: t, hits: lookupGrammarToken(t), notes: [] }));
  const normG = (g, pos = '') => { const raw = (g || '').toLowerCase().replace(/[^mfn]/g, ''); if (raw) return raw; const pm = (pos || '').match(/\b([mfn])\./i); return pm ? pm[1].toLowerCase() : ''; };
  const isNounHit = (h) => /noun|\b[mfn]\./i.test(h.pos || '') && !/adj|pron|verb|prep/i.test(h.pos || '');
  const isAdjHit = (h) => /adj/i.test(h.pos || '');
  const isPrepHit = (h) => /prep/i.test(h.pos || '');
  const isVerbHit = (h) => /^(PRES|PAST)$/i.test(h.case_name || '');
  const isDetHit = (h) => (/pron/i.test(h.pos || '') && /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || '') && !/^(ek|þú|hann|hon|hón|henni|hennar|honum|hans|vér|þér|þeir|þær|þau|þeira|þeirra|þeim|mik|þik|sik|mér|þér|sér|mín|þín|sín|hvat|hverr|hvárr)$/i.test(h.headword || '') && !/^(hon|hón|henni|hennar|honum|hans)$/i.test(h.form || '')) || /^(hinn|sá|þessi|minn|þinn|sinn|várr|yðarr|einn|báðir|allr|margr|sumr|enginn|engi|nokkurr)$/i.test(h.headword || '');
  const isDefTrig = (h) => /^(hinn|sá|þessi|minn|þinn|sinn|várr|yðarr)$/i.test(h.headword || '');

  parsed.forEach(tok => {
    if (tok.hits && tok.hits.length > 1) {
      const inf = tok.hits.filter(h => h.source !== 'lemma' || !/base lemma/i.test(h.case_name || ''));
      if (inf.length) tok.hits = inf;
    }
  });

  const TWO_WAY = new Set(['í', 'á', 'undir', 'yfir', 'fyrir', 'at', 'við', 'með', 'eptir', 'eftir']);
  const IMPERS = new Set(['langa', 'þykkja', 'dreyma', 'minna', 'lysta', 'sýnast', 'skorta', 'hungra', 'þyrsta']);
  const COPULA = new Set(['vera', 'verða', 'heita', 'þykkja']);
  const govReq = new Array(parsed.length).fill(null);
  let activeGov = null;

  for (let i = 0; i < parsed.length; i++) {
    const tok = parsed[i];
    if (!tok.hits.length) continue;
    const rawLow = tok.raw.toLowerCase();
    const pHit = tok.hits.find(h => isPrepHit(h) && (TWO_WAY.has(rawLow) || inferGovCases(h, 'prep')));
    if (pHit && rawLow !== 'ok') {
      activeGov = { cases: TWO_WAY.has(rawLow) ? ['ACC', 'DAT'] : inferGovCases(pHit, 'prep'), source: 'prep', headword: pHit.headword };
      continue;
    }
    const vHit = tok.hits.find(isVerbHit);
    if (vHit) {
      const hw = (vHit.headword || '').toLowerCase();
      if (COPULA.has(hw)) activeGov = { cases: ['NOM'], source: 'copula', headword: vHit.headword };
      else {
        const vcRaw = inferGovCases(vHit, 'verb');
        const vc = Array.isArray(vcRaw) ? vcRaw : (vcRaw ? String(vcRaw).split(/[\s,/]+/).filter(Boolean) : []);
        activeGov = vc.length ? { cases: vc, source: 'verb', headword: vHit.headword } : null;
      }
      continue;
    }
    if (/^(ok|en|eða|heldr|því|at|ef|er|sem)$/i.test(rawLow) && !tok.hits.some(h => isNounHit(h) || isAdjHit(h) || isDetHit(h))) {
      activeGov = null;
      continue;
    }
    if (activeGov && tok.hits.some(h => /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || ''))) {
      const verbAhead = parsed.slice(i + 1).some(t => t.hits.some(isVerbHit));
      const isNomPron = tok.hits.some(h => /^(ek|þú|hann|hon|hón|þat|vér|þér|þeir|þær|þau)$/i.test(tok.raw) && (h.case_name || '').toUpperCase() === 'NOM');
      if (!(verbAhead && isNomPron)) govReq[i] = activeGov;
      if (tok.hits.some(isNounHit) && !tok.hits.some(isAdjHit) && !tok.hits.some(isDetHit)) activeGov = null;
    }
  }

  const has3rdSubj = parsed.some(t => t.hits.some(h => (/^(hann|hon|hón|þat|þeir|þær|þau)$/i.test(t.raw) || isNounHit(h)) && (h.case_name || '').toUpperCase() === 'NOM'));
  const has12Subj = parsed.some(t => t.hits.some(h => /^(ek|þú|vér|þér)$/i.test(t.raw) && (h.case_name || '').toUpperCase() === 'NOM'));

  for (let i = 0; i < parsed.length; i++) {
    const cur = parsed[i];
    if (!cur.hits.length) {
      const mod = detectModernScandinavian(cur.raw);
      cur.notes.push(mod ? { ok: false, text: `✗ ${mod.lang} spelling detected — in Old Norse use "${mod.suggestion}"` } : { ok: false, text: `✗ Unrecognized wordform — check spelling or diacritics` });
      continue;
    }
    const cleanTyped = cur.raw.toLowerCase().replace(/^[^a-záéíóúýæœǫþð]+|[^a-záéíóúýæœǫþð]+$/gi, '');
    const normOrtho = (s) => (s || '').toLowerCase().replace(/ö/g, 'ǫ');
    const exactOrtho = cur.hits.some(h => h.source === 'derived' || h.source === 'compound' || (h.headword && h.headword.includes(' + ')) || normOrtho(h.form) === normOrtho(cleanTyped) || normOrtho(h.headword) === normOrtho(cleanTyped));
    if (!exactOrtho) {
      const pHit = cur.hits.find(h => h.form && normOrtho(h.form) !== normOrtho(cleanTyped)) || cur.hits.find(Boolean);
      const pForm = pHit ? (pHit.form || pHit.headword) : '';
      if (pForm) cur.notes.push({ ok: false, text: `✗ Spelling / orthography error ("${cur.raw}") — use "${pForm}"` });
    }
    if (/^(sik|sér|sín)$/i.test(cur.raw)) {
      cur.notes.push((has12Subj && !has3rdSubj)
        ? { ok: false, text: `✗ Reflexive "${cur.raw}" requires a 3rd-person subject` }
        : { ok: true, text: `✓ Reflexive pronoun "${cur.raw}" refers to 3rd-person subject` });
      continue;
    }
    const subjP = getPronPerson(cur.raw);
    if (subjP) {
      const win = [...parsed.slice(Math.max(0, i - 2), i), ...parsed.slice(i + 1, i + 5)];
      const vTok = win.find(t => t.hits.some(isVerbHit));
      if (vTok) {
        const vHits = vTok.hits.filter(isVerbHit);
        const vForms = vHits.map(h => (h.number || '').toUpperCase());
        const impHit = vHits.find(h => IMPERS.has((h.headword || '').toLowerCase()));
        if (impHit && (cur.hits[0].case_name || '').toUpperCase() === 'NOM') {
          const sugE = suggestFormForTok(cur, ['ACC', 'DAT'], subjP.slice(1));
          cur.notes.push({ ok: false, text: `✗ Impersonal verb "${impHit.headword}" takes ACC/DAT experiencer, not NOM${sugE ? ` — use "${sugE}"` : ''}` });
        } else if (vForms.includes(subjP)) {
          cur.notes.push({ ok: true, text: `✓ Grammatically correct — agrees with verb "${vTok.raw}" (${subjP})` });
        } else if (vForms.some(v => /^(SG|PL)$/.test(v))) {
          const sugV = suggestFormForTok(vTok, [subjP], subjP.slice(-2));
          cur.notes.push({ ok: false, text: `✗ Subject (${subjP}) does not match verb "${vTok.raw}" (${[...new Set(vForms.filter(v => /^(SG|PL)$/.test(v)))].join('/')})${sugV ? ` — use "${sugV}"` : ''}` });
        }
      }
    }
    const vGov = govReq[i] ? null : cur.hits.find(isVerbHit);
    if (vGov && !/^(ok|hvat)$/i.test(cur.raw)) {
      if (i >= 2 && !/^(hvat|hverr|hvar|hvé|hví|ef|at|er|sem)$/i.test(parsed[0].raw)) {
        const prev = parsed[i - 1], first = parsed[0];
        const firstAdv = first.hits.some(h => /adv|prep/i.test(h.pos || '')) && !first.hits.some(h => /^(ek|þú|hann|hon|hón|þat|vér|þér|þeir|þær|þau)$/i.test(first.raw));
        const prevSubj = prev && prev.hits.some(h => (h.case_name || '').toUpperCase() === 'NOM' && (/^(ek|þú|hann|hon|hón|þat|vér|þér|þeir|þær|þau)$/i.test(prev.raw) || isNounHit(h)));
        if (firstAdv && prevSubj) cur.notes.push({ ok: false, text: `✗ V2 word-order rule: invert verb "${cur.raw}" before subject "${prev.raw}"` });
      }
      const req = inferGovCases(vGov, 'verb');
      if (req) {
        const obj = parsed.slice(i + 1, i + 6).find(t => !t.hits.some(isPrepHit) && t.hits.some(h => /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || '')));
        if (obj) {
          const oCases = [...new Set(obj.hits.map(h => (h.case_name || '').toUpperCase()).filter(c => /^(NOM|ACC|DAT|GEN)$/.test(c)))];
          if (oCases.some(c => req.includes(c))) cur.notes.push({ ok: true, text: `✓ Verb "${vGov.headword}" governs ${req} (matches "${obj.raw}")` });
          else if (oCases.length) cur.notes.push({ ok: false, text: `✗ Verb "${vGov.headword}" governs ${req}, but "${obj.raw}" is ${oCases.join('/')}` });
        }
      }
    }
    const pHit = cur.hits.find(h => isPrepHit(h) && (TWO_WAY.has(cur.raw.toLowerCase()) || inferGovCases(h, 'prep')));
    if (pHit && cur.raw.toLowerCase() !== 'ok') {
      const pRaw2 = inferGovCases(pHit, 'prep');
      const req = TWO_WAY.has(cur.raw.toLowerCase()) ? ['ACC', 'DAT'] : (Array.isArray(pRaw2) ? pRaw2 : String(pRaw2 || '').split(/[\s,/]+/).filter(Boolean));
      const tgt = parsed.slice(i + 1, i + 5).find(t => t.hits.some(h => /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || ''))) ||
                  parsed.slice(Math.max(0, i - 3), i).reverse().find(t => t.hits.some(h => isNounHit(h) && /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || '')));
      if (tgt) {
        const tCases = [...new Set(tgt.hits.map(h => (h.case_name || '').toUpperCase()).filter(c => /^(NOM|ACC|DAT|GEN)$/.test(c)))];
        if (tCases.some(c => req.includes(c)) || (req.includes('GEN') && /(ajar|s|na)$/i.test(tgt.raw))) {
          cur.notes.push({ ok: true, text: `✓ Preposition "${pHit.headword}" governs ${req.join('/')} (matches "${tgt.raw}")` });
        } else if (tCases.length) {
          cur.notes.push({ ok: false, text: `✗ Preposition "${pHit.headword}" governs ${req.join('/')}, but "${tgt.raw}" is ${tCases.join('/')}` });
        }
      }
    }
    let nounTok = null;
    for (let j = i + 1; j < Math.min(parsed.length, i + 5); j++) {
      if (parsed[j].hits.some(h => isVerbHit(h) || isPrepHit(h))) break;
      const pureNoun = parsed[j].hits.some(h => isNounHit(h) && !isAdjHit(h) && !isDetHit(h) && /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || ''));
      const anyAdj = parsed[j].hits.some(isAdjHit);
      if (pureNoun && !anyAdj) { nounTok = parsed[j]; }
      else if (pureNoun && !nounTok) { nounTok = parsed[j]; }
    }
    const isDet = !(/^þat$/i.test(cur.raw) && parsed.slice(i + 1, i + 2).some(t => t.hits.some(isVerbHit))) && cur.hits.some(h => isDetHit(h) && /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || ''));
    if (isDet && nounTok) {
      const detHits = cur.hits.filter(h => /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || ''));
      const nounHits = nounTok.hits.filter(h => isNounHit(h) && /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || ''));
      const gov = govReq[i];
      const full = detHits.find(d => nounHits.some(n => (d.case_name || '').toUpperCase() === (n.case_name || '').toUpperCase() && (d.number || '').toUpperCase() === (n.number || '').toUpperCase() && (!normG(d.gender, d.pos) || !normG(n.gender, n.pos) || normG(d.gender, d.pos) === normG(n.gender, n.pos)) && (!gov || gov.cases.includes((d.case_name || '').toUpperCase()))));
      if (full) {
        cur.notes.push({ ok: true, text: `✓ Grammatically correct — agrees with "${nounTok.raw}" (${normG(full.gender, full.pos) ? normG(full.gender, full.pos) + '. ' : ''}${full.case_name.toUpperCase()} ${full.number.toUpperCase()})` });
      } else {
        const n0 = nounHits.find(Boolean);
        const tCases = gov ? gov.cases : (n0 ? [n0.case_name.toUpperCase()] : []);
        const sug = suggestFormForTok(cur, tCases, n0 ? n0.number : '', n0 ? normG(n0.gender, n0.pos) : '');
        if (gov && !detHits.some(d => gov.cases.includes((d.case_name || '').toUpperCase()))) {
          cur.notes.push({ ok: false, text: `✗ ${gov.source === 'prep' ? 'Preposition' : 'Verb'} "${gov.headword}" requires ${gov.cases.join('/')} on "${cur.raw}"${sug ? ` — use "${sug}"` : ''}` });
        } else {
          cur.notes.push({ ok: false, text: `✗ Case/number/gender mismatch between "${cur.raw}" and "${nounTok.raw}"${sug ? ` — use "${sug}"` : ''}` });
        }
      }
    }

    const isAdj = !isDet && !vGov && cur.hits.some(h => isAdjHit(h) && /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || ''));
    if (isAdj && !cur.notes.length) {
      const adjHits = cur.hits.filter(h => isAdjHit(h) && /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || ''));
      const gov = govReq[i];
      const prevDet = parsed.slice(Math.max(0, i - 2), i).find(t => t.hits.some(isDefTrig));
      const nounDef = nounTok && nounTok.hits.some(h => (h.definiteness || '').toUpperCase() === 'DEF');
      const reqDef = (prevDet || nounDef) ? 'WEAK' : 'INDEF';

      if (nounTok) {
        const nounHits = nounTok.hits.filter(h => isNounHit(h) && /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || ''));
        const cng = adjHits.filter(a => nounHits.some(n => (a.case_name || '').toUpperCase() === (n.case_name || '').toUpperCase() && (a.number || '').toUpperCase() === (n.number || '').toUpperCase() && (!normG(a.gender, a.pos) || !normG(n.gender, n.pos) || normG(a.gender, a.pos) === normG(n.gender, n.pos)) && (!gov || gov.cases.includes((a.case_name || '').toUpperCase()))));
        const full = cng.find(a => !a.definiteness || a.definiteness.toUpperCase() === reqDef);
        const n0 = nounHits.find(Boolean);
        const tCases = gov ? gov.cases : (n0 ? [n0.case_name.toUpperCase()] : []);
        const sug = suggestFormForTok(cur, tCases, n0 ? n0.number : '', n0 ? normG(n0.gender, n0.pos) : '', reqDef);

        if (full) {
          cur.notes.push({ ok: true, text: `✓ Grammatically correct — agrees with "${nounTok.raw}" (${normG(full.gender, full.pos) ? normG(full.gender, full.pos) + '. ' : ''}${full.case_name.toUpperCase()} ${full.number.toUpperCase()} ${reqDef})` });
        } else if (cng.length) {
          cur.notes.push({ ok: false, text: reqDef === 'WEAK'
            ? `✗ Weak adjective declension required after "${prevDet ? prevDet.raw : nounTok.raw}"${sug ? ` — use "${sug}"` : ''}`
            : `✗ Strong (indefinite) adjective declension required without definite article${sug ? ` — use "${sug}"` : ''}` });
        } else if (gov && !adjHits.some(a => gov.cases.includes((a.case_name || '').toUpperCase()))) {
          cur.notes.push({ ok: false, text: `✗ ${gov.source === 'prep' ? 'Preposition' : 'Verb'} "${gov.headword}" requires ${gov.cases.join('/')} on adjective "${cur.raw}"${sug ? ` — use "${sug}"` : ''}` });
        } else {
          cur.notes.push({ ok: false, text: `✗ Adjective "${cur.raw}" does not agree with noun "${nounTok.raw}"${sug ? ` — use "${sug}"` : ''}` });
        }
      }
    }

    const isNounOnly = cur.hits.some(isNounHit) && !isAdj && !isDet;
    if (isNounOnly && !cur.notes.length) {
      const nounHits = cur.hits.filter(h => isNounHit(h) && /^(NOM|ACC|DAT|GEN)$/i.test(h.case_name || ''));
      const gov = govReq[i];
      if (gov && nounHits.length) {
        const gMatch = nounHits.find(n => gov.cases.includes((n.case_name || '').toUpperCase()));
        if (gMatch) cur.notes.push({ ok: true, text: `✓ Grammatically correct — ${gMatch.case_name.toUpperCase()} ${gMatch.number.toUpperCase()} governed by "${gov.headword}"` });
        else {
          const n0 = nounHits[0];
          const sugN = suggestFormForTok(cur, gov.cases, n0.number, normG(n0.gender, n0.pos));
          cur.notes.push({ ok: false, text: `✗ ${gov.source === 'prep' ? 'Preposition' : 'Verb'} "${gov.headword}" governs ${gov.cases.join('/')}, but "${cur.raw}" is ${[...new Set(nounHits.map(n => n.case_name.toUpperCase()))].join('/')}${sugN ? ` — use "${sugN}"` : ''}` });
        }
      } else if (!gov && nounHits.some(n => (n.case_name || '').toUpperCase() === 'NOM')) {
        const vTok = parsed.find((t, idx) => idx !== i && !govReq[idx] && t.hits.some(isVerbHit));
        if (vTok) {
          const nNums = [...new Set(nounHits.filter(n => (n.case_name || '').toUpperCase() === 'NOM').map(n => (n.number || '').toUpperCase()))];
          const vPers = [...new Set(vTok.hits.filter(isVerbHit).map(v => (v.number || '').toUpperCase()))];
          const exp3 = nNums.map(num => `3${num}`);
          if (exp3.some(p => vPers.includes(p))) {
            cur.notes.push({ ok: true, text: `✓ Subject noun agrees with verb "${vTok.raw}" (${exp3.filter(p => vPers.includes(p)).join('/')})` });
          }
        }
      }
    }

    if (!cur.notes.length) {
      const top = cur.hits[0];
      const g = (top.gender || '').toLowerCase().replace(/[^mfn]/g, '');
      const _det = [(g ? g + '.' : ''), top.case_name, top.number].filter(Boolean).join(' ');
      const _prev = parsed.slice(Math.max(0, i - 3), i).reverse().find(t => t.hits && t.hits.some(h => /pron|adj|verb|prep/i.test(h.pos || '')));
      cur.notes.push({ ok: true, text: _prev && _det ? `✓ Grammatically correct — agrees with "${_prev.raw}" (${_det})` : (_det ? `✓ Grammatically correct (${_det})` : '✓ Grammatically correct') });
    }
  }
  return parsed;
}

function detectOldNorseMutation(surface, headword) {
  const s = (surface || '').toLowerCase().replace(/^[^a-záéíóúýæœøǫþð]+|[^a-záéíóúýæœøǫþð]+$/gi, '').replace(/ö/g, 'ǫ');
  const h = (headword || '').toLowerCase().split(' + ').pop().replace(/[^a-záéíóúýæœøǫþð]/gi, '').replace(/ö/g, 'ǫ');
  if (!s || !h || s === h || s.length < 3 || h.length < 3) return '';
  const stemH = h.slice(0, Math.min(5, h.length));
  const stemS = s.slice(0, Math.min(5, s.length));
  if (/a/.test(stemH) && /ǫ/.test(stemS) && !/ǫ/.test(stemH)) return 'u-umlaut (a → ǫ)';
  const iRules = [
    [/a/, /e/, 'i-umlaut (a → e)'],
    [/á/, /æ/, 'i-umlaut (á → æ)'],
    [/o/, /ø/, 'i-umlaut (o → ø)'],
    [/ó/, /œ/, 'i-umlaut (ó → œ)'],
    [/u/, /y/, 'i-umlaut (u → y)'],
    [/ú/, /ý/, 'i-umlaut (ú → ý)'],
    [/au/, /ey/, 'i-umlaut (au → ey)'],
    [/j[úó]/, /ý/, 'i-umlaut (jú/jó → ý)']
  ];
  for (const [rFrom, rTo, label] of iRules) {
    if (rFrom.test(stemH) && rTo.test(stemS) && !rTo.test(stemH)) return label;
  }
  if (/e/.test(stemH) && /jǫ/.test(stemS) && !/jǫ/.test(stemH)) return 'breaking + u-umlaut (e → jǫ)';
  if (/e/.test(stemH) && /ja/.test(stemS) && !/ja/.test(stemH)) return 'breaking (e → ja)';
  return '';
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
        <span class="g-link" onclick="RETURN_TO_GRAMMAR=true; openEntry(${h.id}, '${mf}')">${esc(h.headword)} ${meta ? `<em>(${esc(meta)})</em>` : ''}
        — <span style="color:#E8C988">${esc(morphs.join(' / '))}
        ${gloss ? `<div style="opacity:.8">${esc(gloss)}</div>` : ''}
      </div>`;
    }).join('');

    const notesHTML = item.notes.map(n =>
      `<div style="color:${n.ok ? '#8fd998' : '#ff8a75'};font-size:11.5px;margin-top:4px">${esc(n.text)}</div>`
    ).join('');

    const topHit = resolved.find(Boolean) || {};
      const mutLabel = detectOldNorseMutation(item.raw, topHit.headword);
      const mutBadge = mutLabel ? `<span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:4px;font-size:10px;background:#2a2138;color:#d8b4fe;border:1px solid #6b46c1;vertical-align:middle">${esc(mutLabel)}</span>` : '';
    const allOk = item.notes.length && item.notes.every(n => n.ok);
    const isCraftable = allOk && topHit.headword && topHit.headword.includes(' + ');
    const alreadySaved = getCraftedWords().some(x => x.headword === item.raw.toLowerCase().replace(/[^a-záéíóúýæøǫœþð]/gi, ''));
    const saveBtn = isCraftable
      ? (alreadySaved
          ? `<div style="margin-top:6px;font-size:11px;color:#E8C988">★ Saved in Crafted Coinages</div>`
          : `<button onclick="saveCraftedCompound('${esc(item.raw)}','${esc(topHit.headword)}','${esc(topHit.pos || 'noun')}','${esc(topHit.gender || '')}','${esc((topHit.zoega_def || '').replace(/'/g, ''))}')" style="margin-top:6px;padding:4px 9px;font-size:11px;background:#3a2415;color:#E8C988;border:1px solid #8c6239;border-radius:6px;cursor:pointer">+ Save Crafted Compound</button>`)
      : '';
    return `<div class="g-tok"><div class="g-word">${esc(item.raw)}${mutBadge}</div>${lines}${notesHTML}${saveBtn}</div>`;
  }).join('');
}


function buildCraftedParadigm(cleanWord, roots, pos, gender) {
  const parts = (roots || '').split('+').map(s => s.trim().toLowerCase()).filter(Boolean);
  const headRoot = parts.length > 1 ? parts.pop() : '';
  const prefix = headRoot && cleanWord.endsWith(headRoot)
    ? cleanWord.slice(0, cleanWord.length - headRoot.length)
    : (parts.join('') || '');
  const forms = [];
  const seen = new Set();
  const addF = (f, c, n, d) => {
    const key = `${f}|${c}|${n}|${d}`;
    if (!f || seen.has(key)) return;
    seen.add(key);
    forms.push({ form: f, case_name: c || '', number: n || '', definiteness: d || '' });
  };
  addF(cleanWord, /verb/i.test(pos) ? 'INF' : 'NOM', /verb/i.test(pos) ? '' : 'SG', /verb/i.test(pos) ? '' : 'INDEF');
  if (headRoot && typeof db !== 'undefined' && db) {
    try {
      const st = db.prepare("SELECT w.form, w.case_name, w.number, w.definiteness FROM wordforms w JOIN lemmas l ON l.id = w.lemma_id WHERE LOWER(l.headword) = ? LIMIT 80");
      st.bind([headRoot]);
      while (st.step()) {
        const r = st.getAsObject();
        if (r.form) addF(prefix + r.form.toLowerCase(), r.case_name, r.number, r.definiteness);
      }
      st.free();
    } catch (_) {}
  }
  return forms;
}
function getCraftedWords() {
  try { return JSON.parse(localStorage.getItem('on_crafted_words') || '[]'); } catch (_) { return []; }
}
function deleteCraftedWord(word) {
  const list = getCraftedWords().filter(x => x.headword !== word);
  localStorage.setItem('on_crafted_words', JSON.stringify(list));
  renderAlphaGrid();
}
function saveCraftedCompound(word, roots, pos, gender, autoGloss) {
  const clean = (word || '').toLowerCase().replace(/^[^a-záéíóúýæøǫœþð]+|[^a-záéíóúýæøǫœþð]+$/gi, '');
  if (!clean) return;
  const def = prompt(`Add definition for crafted Old Norse word "${clean}" (${roots}):`, autoGloss || `Crafted compound (${roots})`);
  if (def === null) return;
  const forms = buildCraftedParadigm(clean, roots, pos, gender);
  const list = getCraftedWords().filter(x => x.headword !== clean);
  list.unshift({
    id: -Date.now(),
    headword: clean,
    pos: pos || 'noun',
    gender: gender || '',
    roots: roots || '',
    forms,
    zoega_def: `[Crafted Coinage · ${roots}] ${def.trim()}`
  });
  localStorage.setItem('on_crafted_words', JSON.stringify(list));
  runGrammarAnalysis();
}
function openCraftedEntry(word) {
  const item = getCraftedWords().find(x => x.headword === word || (x.forms || []).some(f => f.form === word));
  if (!item) return;
  $('alphaGrid').style.display = 'none';
  $('listCard').style.display = 'none';
  $('homeBtn').style.display = 'inline-block';
  $('subStatus').style.display = 'block';
  $('subStatus').textContent = 'Crafted Old Norse Coinage';
  $('root').classList.add('open');
  $('mainArea').style.flex = '1';
  $('detailCard').style.display = 'block';
  const rows = (item.forms || []).slice(0, 24).map(f =>
    `<tr><td style="padding:4px 8px;color:#E8C988">${esc(f.form)}</td><td style="padding:4px 8px;opacity:.85">${esc([f.case_name, f.number, f.definiteness].filter(Boolean).join(' · '))}</td></tr>`
  ).join('');
  const tableHTML = rows ? `<div class="dict-sec"><h4>Inflected Variants (${item.forms.length} forms)</h4><table style="width:100%;border-collapse:collapse;font-size:13px">${rows}</table></div>` : '';
  $('detailCard').innerHTML = `<div class="det-top"><div><div class="det-word">${esc(item.headword)}</div><div class="det-meta">${esc([item.pos, item.gender].filter(Boolean).join(' · '))} · <span style="color:#E8C988">Crafted Coinage</span></div></div><button class="back-btn" onclick="renderAlphaGrid()">← Back</button></div><div class="dict-sec"><h4>Crafted Coinage (${esc(item.roots)})</h4><p>${esc(item.zoega_def)}</p></div>${tableHTML}<button onclick="deleteCraftedWord('${esc(item.headword)}')" style="margin-top:10px;padding:6px 12px;font-size:12px;background:#3a1815;color:#ff8a75;border:1px solid #7a352c;border-radius:6px;cursor:pointer">Delete Crafted Word</button>`;
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
      <span class="det-hw" style="font-size:18px">Grammar &amp; Syntax Analyzer
      <button class="back-pill" onclick="renderAlphaGrid()">←</button>
    </div>
    <textarea id="gramInput" class="gram-area" placeholder="Enter Old Norse text (e.g. Ek held hinu fornu blóði)...">${esc(LAST_GRAMMAR_TEXT)}</textarea>
    <button class="gram-run" onclick="runGrammarAnalysis()">Analyze Sentence</button>
    <div id="gramResults"></div>
  `;
  if (LAST_GRAMMAR_TEXT) runGrammarAnalysis();
}

$('grammarBtn').onclick = openGrammarTool;


async function handleUpdateClick() {
  const toastEl = $('toast');
  const notify = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => { toastEl.style.display = 'none'; }, 2600);
  };
  try {
    notify('Checking for updates...');
    const res = await fetch('sw.js?t=' + Date.now(), { cache: 'no-store' });
    const txt = await res.text();
    const m = txt.match(/old-norse-ui-v([0-9.]+)/);
    const remoteVer = m ? m[1] : null;
    const curEl = $('appVersion');
    const curVer = curEl ? curEl.textContent.trim() : '';
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    }
    if (remoteVer && remoteVer !== curVer) {
      notify('Updating to v' + remoteVer + '...');
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith('old-norse-ui-')).map(k => caches.delete(k)));
      setTimeout(() => location.reload(), 600);
    } else {
      notify('Up to date (Version ' + (remoteVer || curVer) + ')');
    }
  } catch (err) {
    notify('Offline — using cached Version ' + ($('appVersion') ? $('appVersion').textContent : ''));
  }
}
