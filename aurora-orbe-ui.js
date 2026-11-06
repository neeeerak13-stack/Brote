/* Aurora · interfaz Orbe v1.4.0
 * Conecta la interfaz aprobada con el estado real (localStorage 'brote2'), el motor académico
 * (AuroraLegacyBridge), la Biblioteca (IndexedDB 'brote'), el asistente con voz y la app completa.
 */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v, d = 1) => (v == null || !Number.isFinite(Number(v))) ? '—' : Number(v).toFixed(d);
  const uid = () => Math.random().toString(36).slice(2, 9);
  const pad = n => String(n).padStart(2, '0');
  const iso = d => { d = d || new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const YT = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//;
  const LT = ['Semilla', 'Aurora', 'Planta', 'Árbol', 'Bosque'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fmtDate = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? `${+m[3]} ${MESES[+m[2] - 1]}` : ''; };

  /* ---------- Estado compartido con la app completa (brote2) ---------- */
  let S = { name: 'Karen', on: false, subjects: [], sessions: [], xp: 0, lib: [], archive: [], set: { mpd: 45, key: '' } };
  try { const r = localStorage.getItem('brote2'); if (r) S = Object.assign(S, JSON.parse(r)); } catch (e) { console.warn('Estado local inválido', e); }
  const COLORS = ['mint', 'blue', 'pink', 'yel', 'lil'];
  function normalize() {
    if (!S || typeof S !== 'object') S = {};
    if (!Array.isArray(S.subjects)) S.subjects = [];
    if (!Array.isArray(S.archive)) S.archive = [];
    if (!Array.isArray(S.lib)) S.lib = [];
    if (!Array.isArray(S.sessions)) S.sessions = [];
    if (!Array.isArray(S.tasks)) S.tasks = [];
    if (typeof S.xp !== 'number') S.xp = 0;
    if (!S.set || typeof S.set !== 'object') S.set = { mpd: 45, key: '' };
    if (!S.name) S.name = 'Karen';
    const fix = (s, i) => { if (!s || typeof s !== 'object') return; if (!Array.isArray(s.topics)) s.topics = []; if (!Array.isArray(s.sources)) s.sources = []; if (!COLORS.includes(s.color)) s.color = COLORS[i % 5]; if (s.exam == null) s.exam = ''; if (s.goal == null) s.goal = ''; };
    S.subjects.forEach(fix);
    S.archive.forEach(a => { if (a && !a.date && a.archivedAt) a.date = String(a.archivedAt).slice(0, 10); ((a && a.subjects) || []).forEach(fix); });
  }
  normalize();
  S.on = true; // evita que la app completa muestre su bienvenida inicial
  function save() { try { localStorage.setItem('brote2', JSON.stringify(S)); return true; } catch (e) { toast('No se pudo guardar en este dispositivo'); return false; } }
  const legacy = { getState: () => S, save, getSemesterName: () => S.currentSemesterName || 'Semestre actual' };
  const API = window.AuroraLegacyBridge.connect(legacy);
  const A = window.AuroraOrbeAssistant;
  /* Migración única y no destructiva desde los prototipos anteriores (brote_app y brote_data). */
  (function migratePrototype() {
    if (S.subjects.length || (S.archive || []).length) return;
    for (const key of ['brote_app', 'brote_data']) {
      try {
        const old = JSON.parse(localStorage.getItem(key) || 'null'); if (!old || !Array.isArray(old.courses) || !old.courses.length) continue;
        old.courses.forEach(c => { const subj = API.createSubject({ name: String(c.name || 'Materia').slice(0, 40), credits: Math.min(30, Math.max(1, Math.round(Number(c.credits)) || 1)) });
          (c.grades || []).forEach(g => { const w = Number(g.weight), v = Number(g.val != null ? g.val : g.value); if (!(w > 0 && w <= 100)) return; try { const a = API.addAssessment(subj.id, { name: g.name || 'Evaluación', weight: w }); if (Number.isFinite(v) && v >= 0 && v <= 5) API.updateAssessment(subj.id, a.id, { score: v }); } catch (e) {} }); });
        if (old.semestre && !S.currentSemesterName) S.currentSemesterName = String(old.semestre).slice(0, 30);
        save(); break;
      } catch (e) { console.warn('No se pudo migrar ' + key, e); }
    }
  })();
  const sub = id => S.subjects.find(s => s.id === id);
  const allS = () => S.subjects.concat((S.archive || []).flatMap(a => a.subjects || []));
  const lvl = () => Math.floor((S.xp || 0) / 200) + 1;

  /* ---------- Avisos ---------- */
  let toastT, shown = {};
  function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
  const toastOnce = m => { if (!shown[m]) { shown[m] = 1; toast(m); } };
  function addXP(n) { const a = lvl(); S.xp = (S.xp || 0) + n; save(); updLevel(); if (lvl() > a) { toast('¡Subiste al nivel ' + lvl() + '!'); vib([30, 50, 30]); } }
  function updLevel() { const e = $('lvl-t'); if (e) e.textContent = 'Nvl ' + lvl(); }

  /* ---------- Fondo ---------- */
  (function stars() {
    const W = innerWidth, H = innerHeight, box = $('stars');
    [[60, 1, '255,255,255'], [22, 1.8, '199,248,254']].forEach(([n, s, rgb]) => {
      const i = document.createElement('i'); i.style.width = i.style.height = s + 'px'; const a = [];
      for (let k = 0; k < n; k++) a.push(`${(Math.random() * W) | 0}px ${(Math.random() * H) | 0}px ${s > 1.5 ? 2 : 0}px rgba(${rgb},${(.5 + Math.random() * .5).toFixed(2)})`);
      i.style.boxShadow = a.join(','); box.appendChild(i);
    });
    for (let k = 0; k < 9; k++) { const d = document.createElement('i'); d.className = 'tw1'; d.style.left = (Math.random() * W | 0) + 'px'; d.style.top = (Math.random() * H * .7 | 0) + 'px'; d.style.animationDelay = (-Math.random() * 3).toFixed(2) + 's'; d.style.animationDuration = (2.2 + Math.random() * 3).toFixed(1) + 's'; box.appendChild(d); }
    const sh = $('shoot');
    (function go() { setTimeout(() => { sh.style.left = (10 + Math.random() * 50) + 'vw'; sh.style.top = (5 + Math.random() * 30) + 'vh'; sh.classList.remove('go'); void sh.offsetWidth; sh.classList.add('go'); go(); }, 11000 + Math.random() * 14000); })();
  })();

  /* ---------- Ojos del Orbe ---------- */
  const EMOS = ['reposo', 'escuchando', 'pensando', 'hablando', 'feliz', 'triste', 'enojada', 'sorprendida', 'loca', 'enamorada', 'estrellas', 'risa', 'mareada'];
  const COL = { feliz: [141, 247, 200], enojada: [255, 138, 122], enamorada: [255, 156, 203], estrellas: [255, 224, 138], triste: [140, 184, 255], mareada: [199, 248, 254] };
  (function buildEyes() {
    let sp = 'M0 0'; for (let t = .3; t <= 12; t += .3) { const r = t * 1.1; sp += ` L${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`; }
    let st = ''; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 5.6 : 13; st += (k ? 'L' : 'M') + (r * Math.cos(a)).toFixed(1) + ' ' + (r * Math.sin(a)).toFixed(1); } st += 'Z';
    const heart = 'M0 10 C-15 0 -13 -12 -6 -12 C-3 -12 -1 -10 0 -8 C1 -10 3 -12 6 -12 C13 -12 15 0 0 10Z'; let h = '';
    [['L', 72, 'M-7 -11 L8 0 L-7 11'], ['R', 128, 'M7 -11 L-8 0 L7 11']].forEach(([s, x, ch]) => {
      h += `<g transform="translate(${x} 104)"><g class="eye ${s}"><g class="lid"><g class="shape"><rect class="sh pill" x="-9" y="-19" width="18" height="38" rx="6"/><path class="sh heart" d="${heart}"/><path class="sh star" d="${st}"/><path class="sh arc2" d="M-13 7 Q0 -15 13 7"/><path class="sh chev" d="${ch}"/><path class="sh xx" d="M-9 -9 L9 9 M9 -9 L-9 9"/><g class="spin"><path class="sh spiral" d="${sp}"/></g></g></g><path class="brow" d="M-15 0 L15 0"/></g></g>`;
    });
    $('look').innerHTML = h;
  })();
  const eyes = $('orb-eyes'), orb = $('aurora-orb'), ind = $('listen-indicator'), msgEl = $('mensaje-orbe'), card = $('msg'), tilt = $('tilt'), zone = $('orb-zone'), stage = $('tab-inicio');
  let emo = 'reposo', busy = false, touching = false, asleep = true, greeted = false, tt, onHome = true, zr = null, idleT;
  const NOBLINK = ['feliz', 'loca', 'enamorada', 'estrellas', 'risa', 'mareada'];
  function setOrbEmotion(n) {
    if (!EMOS.includes(n)) n = 'reposo';
    EMOS.forEach(e => eyes.classList.remove('e-' + e)); eyes.classList.add('e-' + n); emo = n;
    const c = COL[n] || [80, 232, 244], s = zone.style; s.setProperty('--er', c[0]); s.setProperty('--eg', c[1]); s.setProperty('--eb', c[2]);
    orb.classList.toggle('listening', n === 'escuchando'); orb.classList.toggle('thinking', n === 'pensando'); orb.classList.toggle('speaking', n === 'hablando');
  }
  window.setOrbEmotion = setOrbEmotion;
  (function blink() {
    if (onHome && !asleep && !NOBLINK.includes(emo)) { eyes.classList.add('blinking'); setTimeout(() => eyes.classList.remove('blinking'), 130); if (Math.random() < .22) setTimeout(() => { eyes.classList.add('blinking'); setTimeout(() => eyes.classList.remove('blinking'), 120); }, 260); }
    setTimeout(blink, 2600 + Math.random() * 2800);
  })();
  function lookAt(x, y) { eyes.style.transform = `translate3d(${(x * .5).toFixed(1)}%,${(y * .5).toFixed(1)}%,0)`; }
  setInterval(() => { if (onHome && emo === 'reposo' && !touching && !asleep) lookAt((Math.random() * 14 - 7).toFixed(1), (Math.random() * 6 - 3).toFixed(1)); }, 2400);
  const cacheRect = () => { zr = zone.getBoundingClientRect(); };
  addEventListener('resize', cacheRect);
  let raf = 0, px = 0, py = 0, lt = 0;
  function track(e) {
    if (!onHome || (e.target.closest && e.target.closest('.nav'))) return; px = e.clientX; py = e.clientY;
    const nw = performance.now(); if (e.type === 'pointermove' && nw - lt < 50) return; lt = nw; if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; if (!zr) cacheRect();
      const dx = Math.max(-1, Math.min(1, (px - (zr.left + zr.width / 2)) / (innerWidth / 2))), dy = Math.max(-1, Math.min(1, (py - (zr.top + zr.height / 2)) / (innerHeight / 2)));
      lookAt((dx * 10).toFixed(1), (dy * 6).toFixed(1)); tilt.style.transform = `translate3d(${(dx * 7).toFixed(1)}px,${(dy * 5).toFixed(1)}px,0)`;
      touching = true; document.body.classList.add('tch'); clearTimeout(tt); tt = setTimeout(() => { touching = false; document.body.classList.remove('tch'); tilt.style.transform = ''; lookAt(0, 0); }, 2200); });
  }
  addEventListener('pointermove', track, { passive: true }); addEventListener('pointerdown', track, { passive: true });

  /* ---------- Mensaje de Aurora ---------- */
  let tw = 0, hideT, lastMsg = '', lastEmo = 'reposo', lastGreeting = '';
  function showMsg(t) {
    const id = ++tw; clearTimeout(hideT); card.classList.add('on'); msgEl.textContent = ''; let i = 0;
    (function s() { if (id !== tw) return; msgEl.textContent = t.slice(0, ++i); if (i < t.length) setTimeout(s, 14); else hideT = setTimeout(() => card.classList.remove('on'), 9000 + t.length * 45); })();
  }
  function setState(t, w) { ind.textContent = t; stage.classList.toggle('wv', !!w); }
  const SHOWN_WHILE_SPEAKING = ['feliz', 'enamorada', 'estrellas', 'risa', 'sorprendida', 'triste', 'enojada'];
  function idle(e) { busy = false; setState('Toca el orbe para hablar'); const em = e && e !== 'reposo' && e !== 'pensando' ? e : 'reposo'; clearTimeout(idleT); setOrbEmotion(em); if (em !== 'reposo') idleT = setTimeout(() => { if (!busy) setOrbEmotion('reposo'); }, 2400); }
  let wakeOn = false;
  const uiHooks = {
    say(text, role, e) { if (role === 'model') { lastMsg = text; lastEmo = e || 'reposo'; showMsg(text); } if ($('modal-chat').classList.contains('open')) paintChat(); },
    state(st, e) {
      clearTimeout(idleT);
      if (st === 'listening') { busy = true; setOrbEmotion('escuchando'); setState('Te escucho', 1); }
      else if (st === 'thinking') { busy = true; setOrbEmotion('pensando'); setState('Pensando…'); }
      else if (st === 'speaking') { busy = true; setOrbEmotion(SHOWN_WHILE_SPEAKING.includes(e) ? e : 'hablando'); setState('Aurora responde', 1); }
      else idle(e);
    },
    level(v) { zone.style.setProperty('--amp', (+v || 0).toFixed(2)); },
    listening(on) { wakeOn = on; if (curSub === 'profile') repaint(); },
    notice(m) { toast(m); },
    voiceFallback() { toastOnce('Uso la voz del dispositivo: la voz natural no está disponible ahora'); }
  };

  /* ---------- Navegación ---------- */
  let navIdx = 1, dirty = { materias: true, analisis: true };
  function switchTab(tabId, index) {
    closeAllOverlays();
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('on')); $('tab-' + tabId).classList.add('on');
    document.querySelectorAll('.tabb').forEach(b => b.classList.remove('on')); $('btn-' + tabId).classList.add('on');
    onHome = tabId === 'inicio'; if (onHome) setTimeout(cacheRect, 50);
    if (index !== navIdx) { const d = $('dropin'); d.style.transformOrigin = index > navIdx ? 'left center' : 'right center'; d.classList.remove('st'); void d.offsetWidth; d.classList.add('st'); $('drop').style.transform = `translateX(${index * 100}%)`; vib(8); navIdx = index; }
    requestAnimationFrame(() => requestAnimationFrame(() => { if (tabId === 'materias' && dirty.materias) renderCourses(); if (tabId === 'analisis') enterAnalysis(); if (tabId === 'inicio') setTimeout(reaccion, 500); }));
  }
  document.querySelectorAll('.tabb').forEach(b => b.addEventListener('pointerdown', e => {
    const r = b.getBoundingClientRect(), s = document.createElement('span'); s.className = 'rp'; s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px'; b.appendChild(s); setTimeout(() => s.remove(), 620);
  }));
  const syncCov = () => document.body.classList.toggle('cov', !!document.querySelector('.ov.open'));
  function closeAllOverlays() { document.querySelectorAll('.ov.open,.sheet.open').forEach(o => o.classList.remove('open')); $('sub-fab').style.display = 'none'; curSub = null; syncCov(); }

  /* ---------- Materias ---------- */
  const CIRC = 2 * Math.PI * 24;
  const toneOf = st => st === 'target-reached' ? 'ok' : (st === 'target-missed' || st === 'impossible') ? 'bad' : st === 'high-risk' ? 'warn' : '';
  function statusLabel(r) {
    const m = { 'no-data': 'Sin notas todavía', invalid: 'Revisa los porcentajes', 'target-reached': 'Meta alcanzada', 'target-missed': 'Meta no alcanzada', impossible: 'No alcanza el 3.0' };
    if (m[r.status]) return m[r.status];
    if (r.requiredGrade != null) return r.status === 'high-risk' ? `Necesitas ${fmt(r.requiredGrade)}: nota alta` : `Necesitas ${fmt(r.requiredGrade)} para pasar`;
    return 'En seguimiento';
  }
  const creditsOf = s => Number(s.credits != null ? s.credits : s.academic && s.academic.credits) || 0;
  const calc = (id, target) => { try { return API.calculateSubject(id, target); } catch (e) { return { accumulated: 0, evaluatedWeight: 0, remainingWeight: 100, requiredGrade: null, status: 'invalid', configuredWeight: 0, errors: [e.message], assessments: [] }; } };
  const emptyHTML = (icon, title, text, btn) => `<div class="empty"><div class="ico"><svg viewBox="0 0 24 24">${IC[icon]}</svg></div><h3>${title}</h3><p>${text}</p>${btn || ''}</div>`;
  const IC = {
    leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-13 15M5 19c2-4 5-7 9-9"/>', cal: '<path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2zM4 10h16M8 3v4M16 3v4"/>',
    lib: '<path d="M5 4h4v16H5zM11 4h4v16h-4zM17 6l3-1 1 15-3 1z"/>', hist: '<path d="M3 12a9 9 0 109-9M3 4v5h5M12 7v5l3 2"/>', star: '<path d="M12 3l2.8 5.9 6.2.8-4.6 4.3 1.2 6.3L12 17.3 6.4 20.3l1.2-6.3L3 9.7l6.2-.8z"/>',
    folder: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>', calc: '<path d="M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01"/>',
    cloud: '<path d="M7 18a4 4 0 010-8 5 5 0 019.6-1A4.5 4.5 0 0117 18z"/>', down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', up: '<path d="M12 19V6M6 11l6-6 6 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', chev: '<path d="M9 5l7 7-7 7"/>',
    pdf: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M9.5 14h5M9.5 17h5"/>', doc: '<path d="M7 3h7l5 5v13H7zM14 3v5h5"/>', img: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M4 17l5-4 4 3 3-2 4 3"/>',
    note: '<path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h3"/>', link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>', play: '<path d="M8 5l11 7-11 7z"/>',
    check: '<path d="M5 12l5 5 9-10"/>', left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>', flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>', clock: '<path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2"/>', book: '<path d="M5 4h10a4 4 0 014 4v12H9a4 4 0 01-4-4zM5 16a4 4 0 014-4h10"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>'
  };
  const svg = (n, c) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${c ? ` class="${c}"` : ''}>${IC[n]}</svg>`;

  function renderCourses() {
    dirty.materias = false; const list = $('courses-list'); list.innerHTML = '';
    const n = S.subjects.length, cr = S.subjects.reduce((a, c) => a + creditsOf(c), 0);
    $('msum').innerHTML = n ? `<span>${n} ${n === 1 ? 'materia' : 'materias'}</span><span>${cr} créditos</span>` : '';
    if (!n) { list.innerHTML = emptyHTML('leaf', 'Aún no hay materias', 'Agrega la primera para empezar a seguir tu PAPA.', '<button class="btn" onclick="AU.openModal(\'modal-add-course\')">Agregar materia</button>'); return; }
    const f = document.createDocumentFragment();
    S.subjects.forEach((c, i) => {
      const r = calc(c.id), t = toneOf(r.status), off = CIRC * (1 - Math.min(Math.max(r.accumulated, 0) / 5, 1));
      const d = document.createElement('div'); d.className = 'cc ' + t; d.style.setProperty('--i', Math.min(i, 8)); d.setAttribute('role', 'button'); d.tabIndex = 0; d.onclick = () => openCourse(c.id);
      d.onkeydown = e => { if (e.key === 'Enter') openCourse(c.id); };
      d.innerHTML = `<div class="ring"><svg viewBox="0 0 56 56"><circle class="tr" cx="28" cy="28" r="24"/><circle class="fg" cx="28" cy="28" r="24" stroke-dasharray="${CIRC.toFixed(1)}" style="--o:${off.toFixed(1)}"/></svg><b>${fmt(r.accumulated)}</b></div><div class="ci"><h4>${esc(c.name)}</h4><div class="meta"><span class="tag">${creditsOf(c)} CR</span><span class="st">${esc(statusLabel(r))}</span></div><div class="pbar"><i style="--p:${Math.min(r.evaluatedWeight / 100, 1)}"></i></div></div>${svg('chev', 'chev')}`;
      f.appendChild(d);
    });
    list.appendChild(f);
  }
  let curId = null;
  function openCourse(id) {
    const c = sub(id); if (!c) return; curId = id; const r = calc(id), t = toneOf(r.status), off = CIRC * (1 - Math.min(Math.max(r.accumulated, 0) / 5, 1)), rgb = t === 'ok' ? '92,242,160' : t === 'bad' ? '248,113,113' : t === 'warn' ? '251,191,36' : '80,232,244';
    $('details-course-name').textContent = c.name; $('details-course-grade').textContent = fmt(r.accumulated);
    $('details-course-percentage').textContent = `${fmt(r.evaluatedWeight)}% evaluado · ${creditsOf(c)} créditos`; $('details-course-message').textContent = statusLabel(r);
    $('hero').style.setProperty('--c', rgb);
    $('d-svg').innerHTML = `<svg viewBox="0 0 56 56"><circle class="tr" cx="28" cy="28" r="24"/><circle class="fg" cx="28" cy="28" r="24" stroke-dasharray="${CIRC.toFixed(1)}" style="--o:${off.toFixed(1)}"/></svg>`;
    const list = $('grades-list'); list.innerHTML = '';
    let as = []; try { as = API.getSubject(id).subject.academic.assessments || []; } catch (e) {}
    if (!as.length) list.innerHTML = '<div class="minip">Aún no hay evaluaciones. Toca “+ Evaluación” para registrar la primera.</div>';
    as.forEach((a, i) => {
      const d = document.createElement('div'); d.className = 'ev'; d.style.setProperty('--i', Math.min(i, 8)); d.style.setProperty('--w', a.weight == null ? 0 : a.weight); d.style.cursor = 'pointer'; d.setAttribute('role', 'button'); d.tabIndex = 0;
      d.onclick = () => openEval(a.id); d.onkeydown = e => { if (e.key === 'Enter') openEval(a.id); };
      d.innerHTML = `<div><h5>${esc(a.name)}</h5><small>${a.weight == null ? 'Porcentaje pendiente' : fmt(a.weight, a.weight % 1 ? 1 : 0) + '%'}${a.date ? ' · ' + fmtDate(a.date) : ''}</small></div><span class="v">${a.score == null ? '—' : fmt(a.score)}</span><button class="x" aria-label="Eliminar evaluación">${svg('trash')}</button><i class="w"></i>`;
      d.querySelector('.x').onclick = ev => { ev.stopPropagation(); arm(ev.currentTarget, () => removeEval(a.id)); };
      list.appendChild(d);
    });
    armReset($('del-btn'), 'Eliminar materia'); openModal('modal-course-details');
  }
  function arm(btn, fn) {
    if (btn.dataset.a) { clearTimeout(btn._t); delete btn.dataset.a; btn.classList.remove('armed'); fn(); return; }
    btn.dataset.a = 1; btn.classList.add('armed'); vib(15); if (btn.tagName === 'BUTTON' && !btn.classList.contains('x')) { btn._txt = btn.textContent; btn.textContent = 'Toca otra vez para confirmar'; }
    btn._t = setTimeout(() => armReset(btn), 2600);
  }
  function armReset(btn, txt) { if (!btn) return; clearTimeout(btn._t); delete btn.dataset.a; btn.classList.remove('armed'); if (txt) btn.textContent = txt; else if (btn._txt) { btn.textContent = btn._txt; btn._txt = null; } }
  function removeEval(aid) { try { API.removeAssessment(curId, aid); } catch (e) { return toast(e.message); } refresh(); openCourse(curId); toast('Evaluación eliminada'); }
  function deleteCurrentCourse() {
    arm($('del-btn'), () => {
      const id = curId; if (!id) return;
      S.lib.filter(x => x.sid === id && x.file).forEach(x => IDB.del(x.id).catch(() => {}));
      S.subjects = S.subjects.filter(x => x.id !== id); S.sessions = S.sessions.filter(x => x.sid !== id); S.lib = S.lib.filter(x => x.sid !== id); S.tasks = S.tasks.filter(x => x.sid !== id);
      save(); curId = null; closeModal('modal-course-details'); refresh(); toast('Materia eliminada');
    });
  }
  function setCr(n) { $('input-course-credits').value = n; vib(6); }
  function sheetErr(id, msg) { const s = $(id), b = s.querySelector('.sbox'), e = s.querySelector('.err'); if (e) e.textContent = msg; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); vib([20, 40, 20]); }
  function addCourse() {
    const name = $('input-course-name').value.trim(), cr = Number($('input-course-credits').value);
    if (!name || !Number.isInteger(cr) || cr < 1 || cr > 30) return sheetErr('modal-add-course', 'Escribe el nombre y los créditos (número entero de 1 a 30).');
    try { API.createSubject({ name, credits: cr }); } catch (e) { return sheetErr('modal-add-course', e.message); }
    $('input-course-name').value = ''; $('input-course-credits').value = ''; $('err-course').textContent = ''; closeModal('modal-add-course'); vib(12); refresh(); toast('Materia añadida');
  }
  function editCourse() { const c = sub(curId); if (!c) return; $('edit-course-name').value = c.name; $('edit-course-credits').value = creditsOf(c) || ''; $('err-edit-course').textContent = ''; openModal('modal-edit-course'); }
  function saveCourse() {
    const name = $('edit-course-name').value.trim(), cr = Number($('edit-course-credits').value);
    if (!name || !Number.isInteger(cr) || cr < 1 || cr > 30) return sheetErr('modal-edit-course', 'Revisa el nombre y los créditos (1 a 30).');
    try { API.updateSubject(curId, { name, credits: cr }); } catch (e) { return sheetErr('modal-edit-course', e.message); }
    closeModal('modal-edit-course'); refresh(); openCourse(curId); toast('Materia actualizada');
  }
  /* Evaluaciones */
  let editingEval = null;
  function openEval(aid) {
    editingEval = aid || null; let a = null;
    if (aid) { try { a = API.getSubject(curId).subject.academic.assessments.find(x => x.id === aid); } catch (e) {} }
    $('eval-title').textContent = a ? 'Editar evaluación' : 'Nueva evaluación';
    $('eval-name').value = a ? a.name : ''; $('eval-weight').value = a && a.weight != null ? a.weight : ''; $('eval-score').value = a && a.score != null ? a.score : ''; $('eval-date').value = a && a.date ? a.date : '';
    $('err-eval').textContent = ''; previewEval(); openModal('modal-eval');
  }
  function previewEval() {
    if (!curId) return; const r = calc(curId); let old = 0;
    if (editingEval) { const a = (r.assessments || []).find(x => x.id === editingEval); old = a && a.weight || 0; }
    const rem = Math.max(0, 100 - (r.configuredWeight - old)), w = parseFloat($('eval-weight').value), s = parseFloat($('eval-score').value);
    $('eval-hint').textContent = (Number.isFinite(w) && Number.isFinite(s) && w > 0) ? `Esta nota aportaría ${(s * w / 100).toFixed(2)} al acumulado · quedan ${fmt(Math.max(0, rem - w))}% por asignar` : `Te queda ${fmt(rem)}% por asignar`;
  }
  function saveEval() {
    const name = $('eval-name').value.trim(), wRaw = $('eval-weight').value.trim(), sRaw = $('eval-score').value.trim(), date = $('eval-date').value;
    const w = Number(wRaw), s = sRaw === '' ? null : Number(sRaw);
    if (!name) return sheetErr('modal-eval', 'Escribe el nombre de la evaluación.');
    if (wRaw === '' || !Number.isFinite(w) || w <= 0 || w > 100) return sheetErr('modal-eval', 'El porcentaje debe ser mayor que 0 y hasta 100.');
    if (s !== null && (!Number.isFinite(s) || s < 0 || s > 5)) return sheetErr('modal-eval', 'La nota debe estar entre 0.0 y 5.0.');
    const r = calc(curId); let old = 0; if (editingEval) { const a = (r.assessments || []).find(x => x.id === editingEval); old = a && a.weight || 0; }
    if (r.configuredWeight - old + w > 100 + 1e-9) return sheetErr('modal-eval', `Solo te queda ${fmt(Math.max(0, 100 - (r.configuredWeight - old)))}% por asignar.`);
    try {
      if (editingEval) API.updateAssessment(curId, editingEval, { name, weight: w, score: s, date: date || null, dateStatus: date ? 'confirmed' : 'pending', dateConfirmedBy: date ? 'user' : null });
      else { const a = API.addAssessment(curId, { name, weight: w, date: date || undefined, dateStatus: date ? 'confirmed' : undefined }); if (s !== null) API.updateAssessment(curId, a.id, { score: s }); }
    } catch (e) { return sheetErr('modal-eval', e.message); }
    closeModal('modal-eval'); vib(12); refresh(); openCourse(curId); toast(editingEval ? 'Evaluación actualizada' : 'Evaluación añadida');
  }
  function saveSemestre() { S.currentSemesterName = $('input-semestre').value.trim() || 'Semestre actual'; save(); dirty.analisis = true; }

  /* ---------- Biblioteca ---------- */
  const IDB = (() => { let db; const open = () => db ? Promise.resolve(db) : new Promise((res, rej) => { const r = indexedDB.open('brote', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => { db = r.result; res(db); }; r.onerror = () => rej(r.error); });
    const tx = (m, fn) => open().then(d => new Promise((res, rej) => { const t = d.transaction('f', m), rq = fn(t.objectStore('f')); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); }));
    return { put: (k, v) => tx('readwrite', s => s.put(v, k)), get: k => tx('readonly', s => s.get(k)), del: k => tx('readwrite', s => s.delete(k)) }; })();
  async function addFile(f, sid, title) {
    const id = uid(), n = f.name || 'archivo', mime = f.type || (/\.pdf$/i.test(n) ? 'application/pdf' : /\.(txt|md|csv)$/i.test(n) ? 'text/plain' : '');
    if (/^text\//.test(mime) || /\.(txt|md|csv)$/i.test(n)) { const t = await f.text(); if (!t.trim()) throw new Error('El archivo está vacío.'); S.lib.push({ id, sid, kind: 'Apuntes', title: title || n, body: t.slice(0, 200000) }); return; }
    if (mime === 'application/pdf' || /^image\/(png|jpe?g|webp|heic|heif)$/.test(mime)) { if (f.size > 15e6) throw new Error('El archivo pesa más de 15 MB.'); await IDB.put(id, f); S.lib.push({ id, sid, kind: mime === 'application/pdf' ? 'PDF' : 'Imagen', title: title || n, body: '', file: { mime, size: f.size } }); return; }
    throw new Error('Formato no compatible. Usa PDF, imagen o texto.');
  }
  let libF = 'Todos', libQ = '';
  const KIND_ICON = { PDF: 'pdf', Documento: 'doc', Imagen: 'img', Apuntes: 'note', Enlace: 'link', Video: 'play', Drive: 'cloud' };
  const KIND_T = { PDF: 'pdf', Imagen: 'img' };
  const libShell = () => `<input class="fld srch" id="lib-q" placeholder="Buscar en tu biblioteca…" autocomplete="off" oninput="AU.libSearch(this.value)"><div class="chips" id="lib-chips"></div><div id="lib-list"></div>`;
  const libSid = () => curSub === 'materials' ? curId : null;
  function paintLib() {
    const cs = libSid(), F = ['Todos', 'PDF', 'Imagen', 'Apuntes', 'Enlace', 'Video'];
    $('lib-chips').innerHTML = F.map(f => `<button class="pl${libF === f ? ' on' : ''}" onclick="AU.libFilter('${f}')">${f}</button>`).join('');
    const q = libQ.toLowerCase(), all = S.lib.filter(x => !cs || x.sid === cs);
    const items = all.filter(x => (libF === 'Todos' || x.kind === libF) && (!q || String(x.title).toLowerCase().includes(q)));
    $('lib-list').innerHTML = items.length ? items.map((x, i) => `<div class="fi" style="--i:${Math.min(i, 8)}" role="button" tabindex="0" onclick="AU.openSource('${x.id}')"><div class="th" data-t="${KIND_T[x.kind] || ''}" data-fid="${x.file && x.kind === 'Imagen' ? x.id : ''}">${svg(KIND_ICON[x.kind] || 'doc')}</div><div class="fm"><h5>${esc(x.title)}</h5><small>${esc(x.kind)}${x.file ? ' · ' + Math.max(1, Math.round(x.file.size / 1024)) + ' KB' : ''}${cs ? '' : ' · ' + esc((sub(x.sid) || {}).name || 'Sin materia')}</small></div><button class="sw${x.off ? '' : ' on'}" role="switch" aria-checked="${x.off ? 'false' : 'true'}" aria-label="Usar como fuente de Aurora" onclick="event.stopPropagation();AU.toggleSource('${x.id}')"></button><button class="x" aria-label="Eliminar" onclick="event.stopPropagation();AU.delSource('${x.id}',this)">${svg('trash')}</button></div>`).join('') :
      (all.length ? '<div class="minip">No hay resultados.</div>' : emptyHTML(cs ? 'folder' : 'lib', cs ? 'Sin materiales' : 'Tu biblioteca está vacía', 'Toca + para subir un PDF, una foto de tus apuntes, un texto o un enlace. Aurora los usará como fuentes.'));
    $('lib-list').querySelectorAll('.th[data-fid]').forEach(el => { if (!el.dataset.fid) return; IDB.get(el.dataset.fid).then(b => { if (b) el.style.backgroundImage = `url(${URL.createObjectURL(b)})`; }).catch(() => {}); });
  }
  function openAddSource() {
    if (!S.subjects.length) return toast('Primero crea una materia');
    $('src-subject').innerHTML = S.subjects.map(s => `<option value="${esc(s.id)}"${s.id === (libSid() || curId) ? ' selected' : ''}>${esc(s.name)}</option>`).join(''); $('src-title').value = ''; $('src-body').value = ''; $('err-src').textContent = ''; openModal('modal-add-file');
  }
  async function onFiles(inp) {
    const fs = [...inp.files]; inp.value = ''; if (!fs.length) return; const sid = $('src-subject').value, title = fs.length === 1 ? $('src-title').value.trim() : ''; let ok = 0;
    for (const f of fs) { try { await addFile(f, sid, title); ok++; } catch (e) { toast(e.message); } }
    if (ok) { save(); closeModal('modal-add-file'); vib(12); toast(ok === 1 ? 'Fuente añadida' : ok + ' fuentes añadidas'); if (curSub === 'library' || curSub === 'materials') paintLib(); }
  }
  function saveTextSource() {
    const sid = $('src-subject').value, b = $('src-body').value.trim(); let t = $('src-title').value.trim();
    if (!b) return sheetErr('modal-add-file', 'Pega un texto o un enlace, o elige un archivo arriba.');
    if (!t) t = YT.test(b) ? 'Video' : /^https?:\/\/\S+$/.test(b) ? 'Enlace' : b.slice(0, 40);
    S.lib.push({ id: uid(), sid, kind: YT.test(b) ? 'Video' : /^https?:\/\/\S+$/.test(b) ? 'Enlace' : 'Apuntes', title: t, body: b }); save(); closeModal('modal-add-file'); vib(12); toast('Fuente añadida'); if (curSub === 'library' || curSub === 'materials') paintLib();
  }
  function toggleSource(id) { const x = S.lib.find(y => y.id === id); if (!x) return; x.off = !x.off; save(); paintLib(); toast(x.off ? 'Aurora ya no usará esta fuente' : 'Aurora usará esta fuente'); }
  function delSource(id, btn) { arm(btn, () => { const x = S.lib.find(y => y.id === id); if (x && x.file) IDB.del(id).catch(() => {}); S.lib = S.lib.filter(y => y.id !== id); save(); paintLib(); toast('Fuente eliminada'); }); }
  async function openSource(id) {
    const x = S.lib.find(y => y.id === id); if (!x) return;
    if (x.file) {
      let b = null; try { b = await IDB.get(id); } catch (e) {} if (!b) return toast('El archivo ya no está en este dispositivo. Vuelve a subirlo.');
      const u = URL.createObjectURL(b);
      if (x.kind === 'Imagen') return showViewer(x.title, `<img src="${u}" alt="${esc(x.title)}" style="width:100%;border-radius:18px">`);
      const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); return toast('Aurora ya puede leer este archivo aunque tu teléfono no lo abra aquí');
    }
    if (/^https?:\/\/\S+$/.test((x.body || '').trim())) { const url = x.body.trim(), B = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser; if (B) B.open({ url }); else window.open(url, '_blank', 'noopener'); return; }
    showViewer(x.title, `<div class="note" style="white-space:pre-wrap;font-size:14px;color:#fff">${esc(x.body)}</div>`);
  }
  function showViewer(title, html) { curSub = 'viewer'; $('sub-title').textContent = title; $('sub-body').innerHTML = html; $('sub-fab').style.display = 'none'; $('modal-sub').classList.add('open'); syncCov(); }

  /* ---------- Planificador ---------- */
  let plOff = 0, plSel = null;
  function itemsOn(day) {
    const out = [];
    S.tasks.filter(t => t.date === day).forEach(t => out.push({ kind: 'task', id: t.id, title: t.title, sid: t.sid, done: !!t.done }));
    S.subjects.forEach(s => {
      ((s.academic && s.academic.assessments) || []).forEach(a => { if (a.date === day && (a.score == null)) out.push({ kind: 'eval', title: `${s.name}: ${a.name}`, sid: s.id, done: false }); });
      if (s.exam === day) out.push({ kind: 'exam', title: `Examen de ${s.name}`, sid: s.id, done: false });
    });
    S.sessions.filter(x => x.date === day).forEach(x => out.push({ kind: 'session', title: `Estudio${(sub(x.sid) || {}).name ? ': ' + sub(x.sid).name : ''} · ${x.min} min`, sid: x.sid, done: true }));
    return out;
  }
  function rel(s) { const t = new Date(); t.setHours(0, 0, 0, 0); const d = new Date(s + 'T00:00:00'), n = Math.round((d - t) / 864e5); return n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : n === -1 ? 'Ayer' : n > 1 ? `En ${n} días` : `Venció hace ${-n} días`; }
  const TAG = { task: 'Pendiente', eval: 'Evaluación', exam: 'Examen', session: 'Sesión' };
  function itemRow(t, i, day) {
    const late = !t.done && day < iso(), cn = (sub(t.sid) || {}).name;
    const ck = t.kind === 'task' ? `<button class="ck${t.done ? ' on' : ''}" aria-label="Completar" onclick="AU.toggleTask('${t.id}')">${svg('check')}</button>` : `<span class="ck${t.done ? ' on' : ''}" style="border-style:dashed;cursor:default">${t.done ? svg('check') : ''}</span>`;
    return `<div class="tr2${t.done ? ' dn' : ''}" style="--i:${Math.min(i, 8)}">${ck}<div class="m"><h5>${esc(t.title)}</h5><small class="${late ? 'late' : ''}">${TAG[t.kind]}${t.kind === 'task' && cn ? ' · ' + esc(cn) : ''} · ${rel(day)}</small></div>${t.kind === 'task' ? `<button class="x" aria-label="Eliminar" onclick="AU.deleteTask('${t.id}',this)">${svg('trash')}</button>` : ''}</div>`;
  }
  function paintPlanner() {
    const today = iso(); plSel = plSel || today; const b = new Date(); b.setDate(b.getDate() - ((b.getDay() + 6) % 7) + plOff * 7); const dn = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; let w = '';
    for (let i = 0; i < 7; i++) { const d = new Date(b); d.setDate(b.getDate() + i); const s = iso(d), has = itemsOn(s).some(x => !x.done); w += `<div class="day${s === today ? ' today' : ''}${s === plSel ? ' sel' : ''}" role="button" tabindex="0" onclick="AU.selDay('${s}')">${dn[d.getDay()]}<b>${d.getDate()}</b>${has ? '<i></i>' : ''}</div>`; }
    const day = itemsOn(plSel).sort((a, b) => a.done - b.done);
    const up = []; for (let k = 1; k <= 21 && up.length < 5; k++) { const d = new Date(); d.setDate(d.getDate() + k - 1); const s = iso(d); if (s === plSel) continue; itemsOn(s).filter(x => !x.done).forEach(x => up.length < 5 && up.push({ x, s })); }
    $('pl-wrap').innerHTML = `<div class="wk"><button aria-label="Semana anterior" onclick="AU.planWeek(-1)">${svg('left')}</button><b>${b.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</b><button aria-label="Semana siguiente" onclick="AU.planWeek(1)">${svg('right')}</button></div><div class="week">${w}</div>` +
      `<div class="lab">${plSel === today ? 'Hoy' : new Date(plSel + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</div>` + (day.length ? day.map((t, i) => itemRow(t, i, plSel)).join('') : '<div class="minip">Sin pendientes este día.</div>') +
      (up.length ? `<div class="lab">Próximamente</div>` + up.map((o, i) => itemRow(o.x, i, o.s)).join('') : '');
  }
  function prepTask() { $('input-task-date').value = (curSub === 'planner' && plSel) ? plSel : iso(); $('input-task-course').innerHTML = '<option value="">Sin materia</option>' + S.subjects.map(c => `<option value="${esc(c.id)}"${curSub === 'dates' && c.id === curId ? ' selected' : ''}>${esc(c.name)}</option>`).join(''); $('err-task').textContent = ''; }
  function addTask() {
    const t = $('input-task-title').value.trim(), d = $('input-task-date').value; if (!t || !d) return sheetErr('modal-add-task', 'Escribe qué debes hacer y la fecha.');
    S.tasks.push({ id: uid(), title: t, date: d, sid: $('input-task-course').value || null, done: false }); save(); $('input-task-title').value = ''; closeModal('modal-add-task'); vib(12); toast('Pendiente guardado'); repaint();
  }
  function toggleTask(id) { const t = S.tasks.find(x => x.id === id); if (!t) return; t.done = !t.done; save(); if (t.done) { addXP(5); vib(10); } repaint(); }
  function deleteTask(id, btn) { arm(btn, () => { S.tasks = S.tasks.filter(x => x.id !== id); save(); repaint(); }); }
  function paintDates() {
    const c = sub(curId); if (!c) return; const rows = [];
    ((c.academic && c.academic.assessments) || []).forEach(a => { if (a.date) rows.push({ date: a.date, title: a.name + (a.score != null ? ` · nota ${fmt(a.score)}` : ''), kind: 'eval', done: a.score != null }); });
    if (c.exam) rows.push({ date: c.exam, title: 'Examen', kind: 'exam', done: false });
    S.tasks.filter(t => t.sid === curId).forEach(t => rows.push({ date: t.date, title: t.title, kind: 'task', id: t.id, done: !!t.done }));
    rows.sort((a, b) => a.date.localeCompare(b.date));
    $('dt-list').innerHTML = `<div class="lab" style="margin-top:0">Fecha del examen</div><input class="fld" type="date" value="${esc(c.exam || '')}" onchange="AU.setExam(this.value)">` + (rows.length ? '<div class="lab">Fechas de esta materia</div>' + rows.map((t, i) => itemRow(t, i, t.date)).join('') : emptyHTML('cal', 'Sin fechas registradas', 'Agrega la fecha del examen, la de tus evaluaciones o un pendiente con +.'));
  }

  /* ---------- Historial ---------- */
  function paintHistory() {
    let sems = []; try { sems = API.listSemesters(); } catch (e) {}
    const active = sems[0], archived = sems.slice(1).reverse();
    const stat = s => { let c = {}; try { c = API.calculateSemester(s.id); } catch (e) {} return c; };
    const node = (s, cur) => { const c = stat(s), av = semAvgOf(c), avg = av.v; return `<div class="nd" style="margin-bottom:12px"><span class="pv" style="${cur ? '' : 'color:#C7F8FE'}">${avg == null ? '—' : fmt(avg)}</span><h5>${esc(s.name)}${cur ? ' · actual' : ''}</h5><small>${c.subjectCount || 0} materias · ${c.totalCredits || 0} créditos${c.atRiskSubjects ? ' · ' + c.atRiskSubjects + ' en riesgo' : ''}${av.kind === 'partial' ? ' · promedio parcial' : ''}</small>${cur ? '' : `<div style="margin-top:12px"><button class="addn" onclick="AU.restoreSemester('${esc(s.id)}')">Restaurar</button></div>`}</div>`; };
    $('hs-wrap').innerHTML = '<div class="tl">' + (active ? node(active, true) : '') + archived.map(s => node(s, false)).join('') + '</div>' + (archived.length ? '' : '<div class="minip">Los semestres anteriores aparecerán aquí.</div>') +
      '<button class="btn danger" style="width:100%;margin-top:16px" onclick="AU.closeSemester()">Cerrar semestre</button><p class="note">Al cerrar el semestre, tus materias pasan al historial y el PAPA estimado las incluye con sus definitivas.</p>';
  }
  function closeSemester() { if (!S.subjects.length) return toast('No hay materias para archivar'); $('close-sem-name').value = S.currentSemesterName || ''; $('err-close-sem').textContent = ''; openModal('modal-close-sem'); }
  function confirmCloseSemester() {
    const n = $('close-sem-name').value.trim() || S.currentSemesterName || 'Semestre anterior';
    try { API.archiveCurrentSemester(n); } catch (e) { return sheetErr('modal-close-sem', e.message); }
    $('input-semestre').value = S.currentSemesterName || 'Semestre actual'; closeModal('modal-close-sem'); refresh(); repaint(); toast('Semestre archivado'); vib([20, 40, 20]);
  }
  function restoreSemester(id) { try { API.restoreSemester(id); } catch (e) { return toast(e.message); } $('input-semestre').value = S.currentSemesterName || 'Semestre actual'; refresh(); repaint(); toast('Semestre restaurado'); }

  /* ---------- Retos, niveles e insignias (misma lógica de la app completa) ---------- */
  function streak() { const days = new Set(S.sessions.map(x => x.date)); let n = 0, d = new Date(); if (!days.has(iso(d))) d.setDate(d.getDate() - 1); while (days.has(iso(d))) { n++; d.setDate(d.getDate() - 1); } return n; }
  function badges() {
    const A2 = allS(), done = A2.reduce((a, s) => a + (s.topics || []).filter(t => t.status === 'done').length, 0), hrs = S.sessions.reduce((a, x) => a + (x.min || 0), 0) / 60, src = S.lib.length;
    const pct = s => (s.topics || []).length ? Math.round(s.topics.filter(t => t.status === 'done').length / s.topics.length * 100) : 0;
    return [{ n: 'Primer nivel', d: 'Completa 1 nivel', cur: Math.min(done, 1), max: 1, ic: 'check' }, { n: 'Racha de 7 días', d: 'Estudia 7 días seguidos', cur: Math.min(streak(), 7), max: 7, ic: 'flame' }, { n: 'Exploradora', d: 'Crea 3 materias', cur: Math.min(A2.length, 3), max: 3, ic: 'book' }, { n: 'Biblioteca viva', d: 'Añade 5 fuentes', cur: Math.min(src, 5), max: 5, ic: 'link' },
      { n: 'Maratón', d: 'Estudia 10 horas', cur: Math.min(Math.floor(hrs), 10), max: 10, ic: 'clock' }, { n: 'Constante', d: 'Registra 20 sesiones', cur: Math.min(S.sessions.length, 20), max: 20, ic: 'cal' }, { n: 'Materia al 100 %', d: 'Completa todos los temas de una materia', cur: A2.some(s => (s.topics || []).length && pct(s) === 100) ? 1 : 0, max: 1, ic: 'star' }, { n: '500 XP', d: 'Gana 500 XP', cur: Math.min(S.xp, 500), max: 500, ic: 'star' }];
  }
  function paintChallenges() {
    const l = lvl(), x = S.xp % 200, B = badges(), hrs = (S.sessions.reduce((a, s) => a + (s.min || 0), 0) / 60).toFixed(1);
    $('ch-wrap').innerHTML = `<div class="lvl"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-linejoin="round">${IC.star}</svg><h3>Nivel ${l} · ${LT[Math.min(l, 5) - 1]}</h3><div class="xpb"><i style="--p:${x / 200}"></i></div><small style="display:block;margin-top:8px;font:500 12px Inter;color:rgba(199,248,254,.65)">${x} / 200 XP para el siguiente nivel</small></div>` +
      `<div class="grid2" style="margin-bottom:16px"><div class="stat" style="--i:0;animation-delay:0s"><b>${streak()}</b><span>Días de racha</span></div><div class="stat" style="--i:0;animation-delay:.05s"><b>${hrs}</b><span>Horas de estudio</span></div></div><div class="lab" style="margin-top:0">Insignias</div>` +
      B.map(b => { const ok = b.cur >= b.max; return `<div class="badge ${ok ? 'ok' : 'no'}"><div class="bi">${svg(b.ic)}</div><div style="flex:1;min-width:0"><h5>${b.n}</h5><small>${b.d}</small><div class="xpb" style="margin-top:8px;height:5px"><i style="--p:${b.cur / b.max}"></i></div></div><small>${ok ? '¡Lista!' : b.cur + '/' + b.max}</small></div>`; }).join('') +
      `<a class="link" href="index.html?go=inicio" style="margin-top:6px">${svg('flame')}<span>Reto diario y niveles de estudio<small>Se completan en la app completa de Aurora</small></span>${svg('chev')}</a>`;
  }

  /* ---------- Calculadora ---------- */
  let calcT = 3;
  function paintCalc() {
    const T = [3, 3.5, 4, 4.5];
    $('cc-wrap').innerHTML = '<div class="lab" style="margin-top:0">Nota final que quieres sacar</div><div class="rowc">' + T.map(t => `<button class="pl${t === calcT ? ' on' : ''}" onclick="AU.setTarget(${t})">${t.toFixed(1)}</button>`).join('') + '</div><div style="height:10px"></div>' +
      (S.subjects.length ? S.subjects.map((c, i) => {
        const r = calc(c.id, calcT), rem = r.remainingWeight; let m, col = '#50E8F4';
        if (r.status === 'invalid') { m = 'Revisa los porcentajes de esta materia'; col = '#FBBF24'; }
        else if (rem <= 1e-8) { m = r.accumulated + 1e-8 >= calcT ? 'Ya lo lograste' : 'Ya no es posible con las notas registradas'; col = r.accumulated + 1e-8 >= calcT ? '#5CF2A0' : '#F87171'; }
        else if (r.requiredGrade <= 0) { m = 'Ya lo lograste'; col = '#5CF2A0'; }
        else if (r.requiredGrade > 5) { m = `No es alcanzable: el máximo posible es ${fmt(r.maximumPossible, 2)}`; col = '#F87171'; }
        else m = `Necesitas ${fmt(r.requiredGrade, 2)} en el ${fmt(rem)}% restante`;
        return `<div class="fi" style="--i:${Math.min(i, 8)};cursor:default"><div class="fm"><h5>${esc(c.name)}</h5><small style="color:${col}">${m}</small></div><b style="font:700 20px 'Space Grotesk'">${fmt(r.accumulated, 2)}</b></div>`;
      }).join('') : emptyHTML('calc', 'Sin materias', 'Agrega materias para calcular qué nota necesitas.'));
  }

  /* ---------- Perfil y ajustes ---------- */
  const PERF_KEY = 'aurora_perf';
  const getPerf = () => { try { return localStorage.getItem(PERF_KEY) || 'auto'; } catch (e) { return 'auto'; } };
  let autoLite = false;
  function applyPerf() { const m = getPerf(); document.body.classList.toggle('lite', m === 'ligero' || (m === 'auto' && autoLite)); }
  function autoPerf() { if (getPerf() !== 'auto') return; let n = 0, t0 = 0, sum = 0; (function f(ts) { if (t0) { sum += ts - t0; n++; } t0 = ts; if (n < 70) return requestAnimationFrame(f); if (sum / n > 24) { autoLite = true; applyPerf(); } })(performance.now()); }
  function setPerf(m) { try { localStorage.setItem(PERF_KEY, m); } catch (e) {} applyPerf(); repaint(); }
  function setSet(k, v) { S.set[k] = v; save(); }
  function profileHTML() {
    const p = getPerf(), set = S.set, mode = A.speechMode ? A.speechMode() : 'device';
    const seg = (name, cur, opts) => `<div class="rowc">${opts.map(o => `<button class="pl${cur === o[0] ? ' on' : ''}" onclick="${name}">${o[1]}</button>`.replace(name, name.replace('%v', o[0]))).join('')}</div>`;
    return `<div class="lab" style="margin-top:0">Tu nombre</div><input class="fld" value="${esc(S.name)}" maxlength="24" onchange="AU.setName(this.value)">` +
      `<div class="lab">Aurora (Gemini)</div><input class="fld" type="password" id="pk" placeholder="Llave de Gemini" value="${esc(set.key || '')}" autocomplete="off" onchange="AU.setSet('key',this.value.trim())"><input class="fld" id="pmo" placeholder="Modelo (gemini-2.5-flash)" value="${esc(set.model || '')}" onchange="AU.setSet('model',this.value.trim()||'gemini-2.5-flash')"><button class="btn ghost" style="width:100%;margin-bottom:6px" onclick="AU.testKey(this)">Probar conexión</button><p class="note">La llave se guarda solo en este dispositivo. Consíguela gratis en aistudio.google.com.</p>` +
      `<div class="lab">Voz de Aurora</div>` + seg("AU.setSet('tts','%v');AU.repaint()", mode, [['gemini', 'Natural'], ['device', 'Del dispositivo'], ['off', 'Silencio']]) +
      `<div class="lab" style="margin-top:6px">Tono de voz</div><div class="rowc">${A.voices.map(v => `<button class="pl${(set.voice || 'Sulafat') === v[0] ? ' on' : ''}" onclick="AU.setSet('voice','${v[0]}');AU.repaint()">${v[1]}</button>`).join('')}</div>` +
      `<button class="btn ghost" style="width:100%;margin:10px 0 4px" onclick="AU.testVoice()">Escuchar la voz de Aurora</button>` +
      `<div class="row" style="cursor:default"><span>Responder con voz cuando escribo</span><button class="sw${set.speakTyped ? ' on' : ''}" role="switch" aria-checked="${!!set.speakTyped}" aria-label="Responder con voz cuando escribo" onclick="AU.setSet('speakTyped',!S_.set.speakTyped);AU.repaint()"></button></div>` +
      `<div class="row" style="cursor:default"><span>Escuchar «Hablemos, Aurora»<small>${A.wakeSupported() ? 'Mientras la app esté abierta' : 'No disponible en la app instalada: usa el micrófono'}</small></span><button class="sw${wakeOn ? ' on' : ''}" role="switch" aria-checked="${wakeOn}" aria-label="Escuchar la frase de activación" onclick="AU.toggleWake()"></button></div>` +
      `<div class="lab">Estudio</div><input class="fld" type="number" inputmode="numeric" min="5" max="600" value="${+set.mpd || 45}" onchange="AU.setSet('mpd',Math.max(5,Math.min(600,+this.value||45)))"><p class="note" style="margin-top:-4px">Minutos de estudio que quieres lograr por día.</p>` +
      `<div class="lab">Rendimiento</div>${seg("AU.setPerf('%v')", p, [['auto', 'Automático'], ['alta', 'Alta calidad'], ['ligero', 'Ligero']])}<p class="note">Ligero quita efectos para que todo corra más fluido en celulares lentos.</p>` +
      `<div class="lab">Más de Aurora</div><a class="link" href="index.html?go=conex">${svg('cloud')}<span>Conexiones con Google<small>Drive, Classroom, Calendar y Gmail</small></span>${svg('chev')}</a><a class="link" href="index.html?go=perfil">${svg('down')}<span>Respaldo, CSV e importación de historial<small>Exportar, importar y restaurar tus datos</small></span>${svg('chev')}</a><a class="link" href="index.html?full=1">${svg('book')}<span>Abrir todas las funciones de Aurora<small>Niveles de estudio, quices, plan y más</small></span>${svg('chev')}</a>`;
  }
  async function testKey(btn) { const t = btn.textContent; btn.textContent = 'Probando…'; const r = await A.testKey(); btn.textContent = t; toast(r.message); }

  /* ---------- Subpantallas ---------- */
  let curSub = null;
  const SUBT = {
    planner: ['Planificador', () => '<div id="pl-wrap"></div>', paintPlanner, () => openModal('modal-add-task')],
    library: ['Biblioteca', libShell, paintLib, openAddSource], materials: ['Materiales', libShell, paintLib, openAddSource],
    dates: ['Fechas', () => '<div id="dt-list"></div>', paintDates, () => openModal('modal-add-task')],
    history: ['Historial', () => '<div id="hs-wrap"></div>', paintHistory], challenges: ['Retos y niveles', () => '<div id="ch-wrap"></div>', paintChallenges],
    calculator: ['Calculadora de notas', () => '<div id="cc-wrap"></div>', paintCalc], profile: ['Perfil y ajustes', profileHTML]
  };
  const SUBS = { 'modal-planner': 'planner', 'modal-library': 'library', 'modal-history': 'history', 'modal-challenges': 'challenges', 'modal-profile': 'profile', 'modal-materials': 'materials', 'modal-dates': 'dates', 'modal-calculator': 'calculator' };
  function openSub(kind) {
    const s = SUBT[kind]; if (!s) return; curSub = kind; $('sub-title').textContent = s[0]; $('sub-body').innerHTML = s[1](); $('sub-body').scrollTop = 0;
    const f = $('sub-fab'); f.style.display = s[3] ? 'grid' : 'none'; f.onclick = s[3] || null; s[2] && s[2](); $('modal-sub').classList.add('open'); syncCov();
  }
  function repaint() { const s = SUBT[curSub]; if (!s) return; const b = $('sub-body'), y = b.scrollTop; if (!s[2]) b.innerHTML = s[1](); else s[2](); if (curSub === 'profile') b.innerHTML = s[1](); b.scrollTop = y; }
  function closeSub() { $('modal-sub').classList.remove('open'); $('sub-fab').style.display = 'none'; curSub = null; syncCov(); }
  function openModal(id) {
    if (SUBS[id]) return openSub(SUBS[id]); const m = $(id); if (!m) return;
    if (id === 'modal-add-task') prepTask(); if (id === 'modal-chat') paintChat();
    m.classList.add('open'); syncCov(); if (id === 'modal-add-course') setTimeout(() => $('input-course-name').focus(), 380);
  }
  function closeModal(id) { if (SUBS[id] || id === 'modal-sub') return closeSub(); const m = $(id); if (m) { m.classList.remove('open'); if (m.classList.contains('sheet') && document.activeElement) document.activeElement.blur(); } syncCov(); }
  const selDay = d => { plSel = d; paintPlanner(); };
  const planWeek = n => { plOff += n; paintPlanner(); };

  /* ---------- Análisis ---------- */
  let lastPapa = 0;
  function animateValue(id, a, b, d) { const o = $(id); if (!o) return; let t0 = null; const f = ts => { if (!t0) t0 = ts; const p = Math.min((ts - t0) / d, 1), e = 1 - Math.pow(1 - p, 3); o.textContent = (a + (b - a) * e).toFixed(1); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
  /* Promedio de un semestre: definitivo si todas las materias están al 100 %; si no, parcial con lo evaluado hasta hoy. */
  function semAvgOf(c) {
    if (c && c.provisionalCreditWeightedAverage != null) return { v: c.provisionalCreditWeightedAverage, kind: 'final' };
    const cr = {}; allS().forEach(x => { cr[x.id] = creditsOf(x); });
    const ss = ((c && c.subjects) || []).filter(x => x.evaluatedWeight > 0 && x.currentAverage != null && cr[x.subjectId] > 0), tot = ss.reduce((a, x) => a + cr[x.subjectId], 0);
    return tot ? { v: ss.reduce((a, x) => a + x.currentAverage * cr[x.subjectId], 0) / tot, kind: 'partial' } : { v: null, kind: 'none' };
  }
  function snapshot() {
    let snap = null; try { snap = API.getAcademicSnapshot(); } catch (e) { return null; }
    const active = snap.semesters[0], sem = (() => { try { return API.calculateSemester(active.id); } catch (e) { return { subjects: [], totalCredits: 0, atRiskSubjects: 0, provisionalCreditWeightedAverage: null }; } })();
    return { snap, active, sem, papa: snap.papa && snap.papa.value, part: semAvgOf(sem) };
  }
  function renderAnalysis() {
    dirty.analisis = false; const d = snapshot(); if (!d) return null;
    const { snap, active, sem } = d; let val = 0, kind = 'none'; if (d.papa != null) { val = d.papa; kind = 'papa'; } else if (d.part.v != null) { val = d.part.v; kind = d.part.kind === 'final' ? 'sem' : 'part'; }
    const col = val >= 3.5 ? '#5CF2A0' : val >= 3 ? '#FBBF24' : val > 0 ? '#F87171' : '#50E8F4';
    $('an-label').textContent = { papa: 'PAPA estimado', sem: 'Promedio del semestre', part: 'Promedio parcial', none: 'Aún sin notas' }[kind]; $('an-pill').textContent = { papa: 'Promedio ponderado por créditos', sem: 'Todas las materias evaluadas', part: 'Con lo evaluado hasta hoy', none: 'Registra tus primeras notas' }[kind];
    if (kind === 'none') { $('papa-display').textContent = '—'; lastPapa = 0; } else { animateValue('papa-display', lastPapa, val, 900); lastPapa = val; } $('papa-display').style.color = col;
    const ring = $('papa-ring'); ring.style.strokeDashoffset = 283 - (Math.max(0, Math.min(5, val)) / 5) * 283; ring.style.stroke = col;
    const subs = sem.subjects || [], passed = subs.filter(x => x.status === 'target-reached').length, ev = subs.length ? subs.reduce((a, x) => a + (x.evaluatedWeight || 0), 0) / subs.length : 0;
    $('stat-passed').textContent = passed; $('stat-risk').textContent = sem.atRiskSubjects || 0; $('stat-credits').textContent = sem.totalCredits || 0; $('stat-eval').textContent = Math.round(ev) + '%';
    const arch = snap.semesters.slice(1); let prev = null; for (let i = 0; i < arch.length; i++) { try { const a = semAvgOf(API.calculateSemester(arch[i].id)).v; if (a != null) prev = { n: arch[i].name, v: a }; } catch (e) {} }
    const dl = $('papa-delta'); if (prev && val > 0) { const diff = val - prev.v; dl.className = 'delta ' + (diff >= 0 ? 'up' : 'dn'); dl.textContent = `${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(2)} frente a ${prev.n}`; } else { dl.className = 'delta'; dl.textContent = val > 0 ? 'Aún sin semestres anteriores para comparar' : 'Registra notas para ver tu PAPA'; }
    const C = { ok: '#5CF2A0', bad: '#F87171', warn: '#FBBF24', '': '#50E8F4' };
    const rows = subs.map(x => ({ n: x.subjectName, g: x.accumulated || 0, t: toneOf(x.status) }));
    $('an-bars').innerHTML = rows.length ? rows.map((r, i) => `<div class="bar2"><div class="t"><span>${esc(r.n)}</span><b style="color:${C[r.t]}">${fmt(r.g)}</b></div><div class="tk"><i style="--p:${Math.min(r.g / 5, 1)};--i:${Math.min(i, 8)};background:${C[r.t]}"></i></div></div>`).join('') + '<div class="minip" style="padding:8px 0 0;font-size:11.5px">La línea marca el 3.0 para aprobar</div>' : '<div class="minip">Agrega materias para ver tus notas aquí.</div>';
    const pts = []; arch.forEach(s => { try { const a = semAvgOf(API.calculateSemester(s.id)).v; if (a != null) pts.push({ l: s.name, v: +a.toFixed(2) }); } catch (e) {} }); if (d.part.v != null) pts.push({ l: active.name, v: +d.part.v.toFixed(2) });
    $('an-evo').innerHTML = !pts.length ? '<div class="minip">Aún no hay datos de evolución.</div>' : evoSVG(pts) + (pts.length < 2 ? '<div class="minip" style="padding:8px 0 0">Cierra tu semestre para comparar con los siguientes.</div>' : '');
    const vals = []; subs.forEach(x => (x.assessments || []).forEach(a => { if (a.score != null) vals.push(a.score); }));
    const best = rows.slice().sort((a, b) => b.g - a.g)[0], low = rows.filter(r => r.g > 0).sort((a, b) => a.g - b.g)[0], avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const cp = subs.filter(x => x.status === 'target-reached').reduce((a, x) => a + ((S.subjects.find(s => s.id === x.subjectId) || {}).credits || 0), 0);
    $('an-stats').innerHTML = [['Mejor materia', best && best.g > 0 ? `${esc(best.n)} · ${fmt(best.g)}` : '—'], ['Materia más baja', low ? `${esc(low.n)} · ${fmt(low.g)}` : '—'], ['Promedio de evaluaciones', avg == null ? '—' : fmt(avg, 2)], ['Evaluaciones calificadas', vals.length], ['Créditos aprobados', cp], ['Materias archivadas', snap.semesters.slice(1).reduce((a, s) => a + (s.subjects || []).length, 0)]].map(r => `<div class="sr"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
    if (snap.papa && snap.papa.note) $('an-note').textContent = snap.papa.note;
    return { val, passed };
  }
  function evoSVG(p) { const W = 300, H = 120, x = i => p.length === 1 ? W / 2 : 24 + i * (W - 48) / (p.length - 1), y = v => H - 20 - (v / 5) * (H - 40); const d = p.map((q, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(q.v).toFixed(1)}`).join('');
    return `<svg viewBox="0 0 ${W} ${H}"><line class="gl" x1="0" x2="${W}" y1="${y(3)}" y2="${y(3)}"/><text x="${W - 4}" y="${y(3) + 13}" style="text-anchor:end">3.0</text>${p.length > 1 ? `<path class="ln" pathLength="1" d="${d}"/>` : ''}${p.map((q, i) => `<circle class="dt" cx="${x(i).toFixed(1)}" cy="${y(q.v).toFixed(1)}" r="5"/><text x="${x(i).toFixed(1)}" y="${y(q.v) - 11}">${q.v.toFixed(1)}</text><text x="${x(i).toFixed(1)}" y="${H - 2}">${esc(String(q.l).slice(0, 14))}</text>`).join('')}</svg>`; }
  function enterAnalysis() { const r = $('papa-ring'); r.style.transition = 'none'; r.style.strokeDashoffset = 283; void r.getBoundingClientRect(); r.style.transition = ''; lastPapa = 0; renderAnalysis(); }
  function reaccion() { if (busy || asleep || !onHome) return; const d = snapshot(); if (!d) return; const v = d.papa != null ? d.papa : d.part.v; if (v == null) return; setOrbEmotion(d.sem.atRiskSubjects ? 'triste' : v >= 3.5 ? 'feliz' : 'reposo'); setTimeout(() => { if (!busy) setOrbEmotion('reposo'); }, 2200); }
  function refresh() { dirty.materias = dirty.analisis = true; if ($('tab-materias').classList.contains('on')) renderCourses(); if ($('tab-analisis').classList.contains('on')) renderAnalysis(); updLevel(); }

  /* ---------- Asistente ---------- */
  function paintChat() {
    const log = $('chat-log'), h = A.getHistory().slice(-24);
    log.innerHTML = h.length ? h.map(m => `<div class="bub ${m.role === 'user' ? 'u' : 'a'}">${esc(m.text)}</div>`).join('') : '<div class="minip">Aún no hemos conversado. Toca el Orbe y háblame.</div>';
    log.scrollTop = log.scrollHeight;
  }
  function clearChat() { A.clearHistory(); paintChat(); toast('Conversación borrada'); }
  function openChat() { openModal('modal-chat'); }
  function speakLast() { if (!lastMsg) return; A.unlock(); if (busy) { A.stop(); idle(); return; } A.speak(lastMsg, lastEmo); }
  function mic() { A.unlock(); if (busy) { A.stop(); idle(); return; } clearTimeout(pokeT); A.startOrbDictation(); }
  function sendText() { const i = $('chat-input'), v = i.value.trim(); if (!v) return; i.value = ''; A.unlock(); A.ask(v, { speak: !!S.set.speakTyped }); }
  $('chat-input').addEventListener('keypress', e => { if (e.key === 'Enter') sendText(); });
  function toggleWake() { A.unlock(); const on = A.toggleWake(); wakeOn = !!on; repaint(); }
  function wakeUp() {
    eyes.classList.add('blinking');
    setTimeout(() => { asleep = false; eyes.classList.remove('blinking'); setOrbEmotion('sorprendida'); }, 800);
    setTimeout(() => { setOrbEmotion('feliz'); lastGreeting = A.init({ getState: () => S, api: API, ui: uiHooks }); }, 1400);
    setTimeout(() => { if (!busy) setOrbEmotion('reposo'); }, 3400);
  }
  let taps = [], pokeT, lp, lpDone = false;
  orb.addEventListener('pointerdown', () => { lpDone = false; lp = setTimeout(() => { lpDone = true; if (!busy) { setOrbEmotion('loca'); vib(20); setTimeout(() => { if (!busy) setOrbEmotion('reposo'); }, 2200); } }, 650); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => orb.addEventListener(ev, () => clearTimeout(lp)));
  function orbTap() {
    if (lpDone) { lpDone = false; return; } if (asleep) return; A.unlock(); vib(12);
    if (busy) { A.stop(); idle(); return; }
    const n = Date.now(); taps = taps.filter(t => n - t < 1800); taps.push(n); clearTimeout(pokeT);
    if (taps.length === 1) { setOrbEmotion('sorprendida'); pokeT = setTimeout(() => { if (!greeted && lastGreeting) { greeted = true; Promise.resolve(A.speak(lastGreeting, 'feliz')).then(() => { if (!A.isSpeaking() && !busy) setOrbEmotion('reposo'); }); } else A.startOrbDictation(); }, 450); }
    else { const p = taps.length >= 6 ? ['enojada', 'mareada'] : ['risa', 'estrellas', 'enamorada', 'sorprendida']; setOrbEmotion(p[Math.random() * p.length | 0]); pokeT = setTimeout(() => { if (!busy) setOrbEmotion('reposo'); }, 1100); }
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTop(); });
  function closeTop() { const s = [...document.querySelectorAll('.sheet.open')].pop(); if (s) { s.classList.remove('open'); syncCov(); return true; } const o = [...document.querySelectorAll('.ov.open')].pop(); if (o) { if (o.id === 'modal-sub') closeSub(); else { o.classList.remove('open'); syncCov(); } return true; } return false; }
  try { const C = window.Capacitor, App = C && C.Plugins && C.Plugins.App; if (App && App.addListener) App.addListener('backButton', () => { if (closeTop()) return; if (!onHome) return switchTab('inicio', 1); App.exitApp && App.exitApp(); }); } catch (e) {}

  /* ---------- API pública ---------- */
  window.AU = { openModal, closeModal, openSub, closeSub, switchTab, saveSemestre, addCourse, setCr, editCourse, saveCourse, openEval, previewEval, saveEval, deleteCurrentCourse,
    onFiles, saveTextSource, libFilter: f => { libF = f; paintLib(); }, libSearch: q => { libQ = q; paintLib(); }, toggleSource, delSource, openSource,
    addTask, toggleTask, deleteTask, selDay, planWeek, setExam: v => { const c = sub(curId); if (c) { c.exam = v || ''; save(); paintDates(); toast('Fecha guardada'); } },
    closeSemester, confirmCloseSemester, restoreSemester, setTarget: t => { calcT = t; paintCalc(); }, setName: v => { S.name = v.trim() || 'Karen'; save(); toast('Nombre guardado'); }, setSet, setPerf, repaint, testKey,
    testVoice: () => { A.unlock(); A.testVoice(); }, toggleWake, openChat, clearChat, speakLast, mic, sendText, orbTap, closeTop,
    _state: () => S, _api: () => API, _lastGreeting: () => lastGreeting, _busy: () => busy, _setBusy: v => { busy = v; } };
  window.S_ = { get set() { return S.set; } };
  Object.defineProperty(window.AU, 'S_', { get: () => S });

  /* ---------- Arranque ---------- */
  $('input-semestre').value = S.currentSemesterName || 'Semestre actual'; updLevel(); applyPerf(); setTimeout(autoPerf, 2500);
  setOrbEmotion('reposo'); cacheRect(); renderCourses(); save(); wakeUp();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
