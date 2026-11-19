function buildUI() {
  $("cbar").innerHTML = CHAR_KEYS.map(ch => `<button class="cbtn" data-ch="${ch}">${ch}</button>`).join("");
  $("ag").innerHTML = LETTERS.map(ch => `<button class="abtn" data-let="${ch}">${ch}</button>`).join("");

  $("cbar").addEventListener("click", e => {
    const btn = e.target.closest("[data-ch]");
    if (!btn) return;
    $("q").value += btn.dataset.ch;
    $("q").focus();
    doSearch();
  });

  $("ag").addEventListener("click", e => {
    const btn = e.target.closest("[data-let]");
    if (btn) browseLetter(btn.dataset.let);
  });

  $("hb").addEventListener("click", goHome);
  $("q").addEventListener("input", doSearch);
}

function goHome() {
  $("q").value = "";
  $("hb").style.display = "none";
  $("ag").style.display = "flex";
  $("pnl").style.display = "none";
  $("pnl").innerHTML = "";
  lastView = { type: "home", arg: "" };
}

function renderList(rows, bannerHtml = "") {
  $("hb").style.display = "inline-block";
  $("ag").style.display = "none";
  const pnl = $("pnl");
  pnl.style.display = "block";
  if (!rows.length) {
    pnl.innerHTML = bannerHtml + `<div class="imeta">No matching entries found.</div>`;
    return;
  }
  pnl.innerHTML = bannerHtml + rows.map(r => {
    const gen = r.at(4) ? ` (${esc(r.at(4))}.)` : "";
    return `<div class="item" data-id="${r.at(0)}">
      <div class="ihw">${esc(r.at(1))} <span class="imeta">${esc(r.at(3))}${gen}</span></div>
      <div class="imeta">${esc(snippet(r))}</div>
    </div>`;
  }).join("");
  pnl.querySelectorAll(".item[data-id]").forEach(el => {
    el.addEventListener("click", () => openEntry(Number(el.dataset.id)));
  });
}

function browseLetter(letter) {
  if (!db) return;
  lastView = { type: "letter", arg: letter };
  const n = norm(letter);
  const res = db.exec(
    `SELECT id, headword, normalized_search, pos, gender, zoega_def, cleasby_def, onp_def, wikt_def
     FROM lemmas WHERE lower(headword) LIKE ? OR normalized_search LIKE ?
     ORDER BY sort_key, headword LIMIT 150`,
    [`${letter}%`, `${n}%`]
  );
  const rows = res.length ? res.at(0).values : [];
  renderList(rows, `<div class="sec">HEADWORDS STARTING WITH "${esc(letter)}" (TOP ${rows.length})</div>`);
}

function doSearch() {
  if (!db) return;
  const raw = $("q").value.trim();
  if (!raw) { goHome(); return; }
  lastView = { type: "search", arg: raw };
  const low = raw.toLowerCase();
  const n = norm(raw);
  let banner = "";
  const seen = new Set();
  const combined = [];

  const ov = OVERRIDES[low] || OVERRIDES[n];
  if (ov) {
    banner = `<div class="prep"><b>${esc(raw)}</b> → Inflected form of <b>${esc(ov.hw)}</b> (${esc(ov.tag)})</div>`;
    const ovRes = db.exec(
      `SELECT id, headword, normalized_search, pos, gender, zoega_def, cleasby_def, onp_def, wikt_def
       FROM lemmas WHERE lower(headword) = ?`, [ov.hw.toLowerCase()]
    );
    if (ovRes.length) {
      for (const r of ovRes.at(0).values) {
        if (!seen.has(r.at(0))) { seen.add(r.at(0)); combined.push(r); }
      }
    }
  }

  const headRes = db.exec(
    `SELECT id, headword, normalized_search, pos, gender, zoega_def, cleasby_def, onp_def, wikt_def
     FROM lemmas WHERE lower(headword) LIKE ? OR normalized_search LIKE ?
     ORDER BY CASE WHEN lower(headword) = ? THEN 0 ELSE 1 END, length(headword), sort_key LIMIT 60`,
    [`${low}%`, `${n}%`, low]
  );
  if (headRes.length) {
    for (const r of headRes.at(0).values) {
      if (!seen.has(r.at(0))) { seen.add(r.at(0)); combined.push(r); }
    }
  }

  const wfRes = db.exec(
    `SELECT DISTINCT l.id, l.headword, l.normalized_search, l.pos, l.gender,
            l.zoega_def, l.cleasby_def, l.onp_def, l.wikt_def, w.case_name, w.number
     FROM wordforms w JOIN lemmas l ON w.lemma_id = l.id
     WHERE lower(w.form) = ? OR w.normalized_form = ? LIMIT 30`, [low, n]
  );
  if (wfRes.length && wfRes.at(0).values.length) {
    const first = wfRes.at(0).values.at(0);
    if (!banner && first.at(1).toLowerCase() !== low) {
      banner = `<div class="prep"><b>${esc(raw)}</b> → Form of <b>${esc(first.at(1))}</b> (${esc(first.at(9))} ${esc(first.at(10))})</div>`;
    }
    for (const r of wfRes.at(0).values) {
      if (!seen.has(r.at(0))) { seen.add(r.at(0)); combined.push(r.slice(0, 9)); }
    }
  }

  if (combined.length < 15 && low.length >= 3) {
    const defRes = db.exec(
      `SELECT id, headword, normalized_search, pos, gender, zoega_def, cleasby_def, onp_def, wikt_def
       FROM lemmas WHERE zoega_def LIKE ? OR cleasby_def LIKE ? OR wikt_def LIKE ? LIMIT 30`,
      [`%${low}%`, `%${low}%`, `%${low}%`]
    );
    if (defRes.length) {
      for (const r of defRes.at(0).values) {
        if (!seen.has(r.at(0))) { seen.add(r.at(0)); combined.push(r); }
      }
    }
  }
  renderList(combined, banner);
}

function openEntry(id) {
  if (!db) return;
  const res = db.exec(
    `SELECT id, headword, pos, gender, zoega_def, cleasby_def, onp_def, wikt_def, prep_cases
     FROM lemmas WHERE id = ?`, [id]
  );
  if (!res.length || !res.at(0).values.length) return;
  const r = res.at(0).values.at(0);
  const hw = r.at(1);
  const gen = r.at(3) ? ` (${r.at(3)}.)` : "";
  const sections = [
    ["ZOËGA", r.at(4)],
    ["CLEASBY & VIGFÚSSON", r.at(5)],
    ["ONP", r.at(6)],
    ["WIKTIONARY", r.at(7)]
  ].filter(s => s.at(1));

  const wfRes = db.exec(
    `SELECT form, case_name, number, definiteness FROM wordforms WHERE lemma_id = ? LIMIT 40`, [id]
  );
  const forms = wfRes.length ? wfRes.at(0).values : [];

  $("hb").style.display = "inline-block";
  $("ag").style.display = "none";
  const pnl = $("pnl");
  pnl.style.display = "block";
  pnl.innerHTML = `
    <div class="dhw">
      <div>
        <div>${esc(hw)} <span class="imeta">${esc(r.at(2) || "")}${esc(gen)}</span></div>
        <div class="drune">${esc(toYoungerFuthark(hw))}</div>
      </div>
      <button class="rbtn" id="backBtn">← Back</button>
    </div>
    ${r.at(8) ? `<div class="prep">Governs: <b>${esc(r.at(8))}</b></div>` : ""}
    ${sections.map(s => `<div class="sec">${s.at(0)}</div><div class="def">${esc(s.at(1))}</div>`).join("")}
    ${forms.length ? `
      <div class="sec">INFLECTED FORMS</div>
      <table><thead><tr><th>Form</th><th>Case / Tag</th><th>Number</th><th>Def</th></tr></thead>
      <tbody>${forms.map(f => `<tr><td>${esc(f.at(0))}</td><td>${esc(f.at(1))}</td><td>${esc(f.at(2))}</td><td>${esc(f.at(3))}</td></tr>`).join("")}</tbody></table>
    ` : ""}
  `;
  $("backBtn").addEventListener("click", () => {
    if (lastView.type === "letter") browseLetter(lastView.arg);
    else if (lastView.type === "search") doSearch();
    else goHome();
  });
}

buildUI();
initDictionaryDb(msg => { $("st").textContent = msg; })
  .then(database => { db = database; $("st").textContent = "111,488 Headwords Ready • 100% Offline"; $("q").disabled = false; })
  .catch(err => { $("st").textContent = "Load Error: " + err.message; });
