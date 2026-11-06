/* Prueba de integración en navegador real (Chromium) de la interfaz Orbe conectada.
 * Requiere Playwright:  npm i -D playwright && npx playwright install chromium
 * Uso: node tests/ui-integration.playwright.js
 */
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch (e2) { console.error('Playwright no está instalado.'); process.exit(2); } }
const DOCS = path.join(__dirname, '..', 'docs');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => { const f = path.join(DOCS, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(d); }); });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ✔', m); } else { fail++; console.log('  ✘ FALLA:', m); } };
const pcm = () => { const n = 12000, b = Buffer.alloc(n * 2); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / 20) * 9000), i * 2); return b.toString('base64'); };
(async () => {
  await new Promise(r => server.listen(0, r)); const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true, permissions: ['microphone'] });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const gem = { calls: [], ttsFail: false, answer: '[e:feliz] ¡Qué bien, Karen! Vas muy bien en Cálculo. Sigue así.' };
  await p.route('**/generativelanguage.googleapis.com/**', async r => {
    const u = r.request().url(), body = r.request().postData() || ''; gem.calls.push({ u, body });
    const j = o => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (u.includes('preview-tts')) { if (gem.ttsFail) return r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{"message":"fallo"}}' }); return j({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: pcm() } }] } }] }); }
    if (body.includes('Transcribe literalmente')) return j({ candidates: [{ content: { parts: [{ text: 'cómo voy en cálculo' }] } }] });
    return j({ candidates: [{ content: { parts: [{ text: gem.answer }] } }] });
  });
  await p.addInitScript(() => {
    window.__spoken = []; const syn = { speak(u) { window.__spoken.push({ text: u.text, rate: u.rate, pitch: u.pitch, voice: u.voice && u.voice.name }); setTimeout(() => u.onend && u.onend(), 30); }, cancel() {}, getVoices() { return [{ name: 'Jorge', lang: 'es-ES' }, { name: 'Google español de Estados Unidos', lang: 'es-US' }, { name: 'Paulina', lang: 'es-MX' }]; }, addEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: syn }); window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    try { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; } catch (e) {}
    navigator.mediaDevices.getUserMedia = async () => { const ac = new (window.AudioContext || window.webkitAudioContext)(), o = ac.createOscillator(), g = ac.createGain(), d = ac.createMediaStreamDestination(); o.frequency.value = 220; g.gain.setValueAtTime(.9, ac.currentTime); g.gain.setValueAtTime(0, ac.currentTime + 1.1); o.connect(g); g.connect(d); o.start(); return d.stream; };
    if (!localStorage.getItem('brote2')) localStorage.setItem('brote2', JSON.stringify({ name: 'Karen', on: true, xp: 250, subjects: [{ id: 'old1', name: 'Ecología', credits: 3, color: 'mint', topics: [{ id: 't1', name: 'Ciclos', status: 'done' }], sources: [], exam: '', goal: '', academic: { credits: 3, assessments: [{ id: 'assessment-1', name: 'Parcial', weight: 40, score: 3.5, date: null }] } }], sessions: [{ id: 's1', date: new Date().toISOString().slice(0, 10), sid: 'old1', min: 30 }], lib: [], archive: [], set: { mpd: 45, key: 'KEY-DE-PRUEBA', model: 'gemini-2.5-flash' } }));
  });
  const W = ms => p.waitForTimeout(ms), ev = (f, a) => p.evaluate(f, a);
  await p.goto(base + '/orbe.html'); await W(2200);

  console.log('\n1. Arranque y datos existentes');
  ok(await ev(() => !!window.AU && !!window.AuroraOrbeAssistant), 'la interfaz y el asistente se cargan');
  ok((await p.textContent('#lvl-t')) === 'Nvl 2', 'el nivel sale del XP real de la app (250 XP = nivel 2)');
  await ev(() => AU.switchTab('materias', 0)); await W(700);
  ok(await ev(() => document.querySelectorAll('#courses-list .cc').length) === 1, 'aparece la materia creada antes en la app completa');
  ok((await p.textContent('#courses-list .cc h4')) === 'Ecología', 'con su nombre correcto');
  ok(/Necesitas/.test(await p.textContent('#courses-list .cc .st')), 'y calcula la nota que necesita con el motor académico real');

  console.log('\n2. Materias y evaluaciones');
  await ev(() => AU.openModal('modal-add-course')); await W(450); await p.fill('#input-course-name', 'Cálculo'); await p.fill('#input-course-credits', '4'); await ev(() => AU.addCourse()); await W(500);
  ok(await ev(() => AU._state().subjects.length) === 2, 'se crea una materia nueva');
  ok(await ev(() => { const s = AU._state().subjects[1]; return Array.isArray(s.topics) && 'color' in s && s.academic.credits === 4; }), 'la materia nueva es compatible con la app completa (temas, color, créditos)');
  await ev(() => AU.openModal('modal-add-course')); await W(400); await p.fill('#input-course-name', 'X'); await p.fill('#input-course-credits', '99'); await ev(() => AU.addCourse()); await W(200);
  ok(/1 a 30/.test(await p.textContent('#err-course')), 'rechaza créditos fuera de 1 a 30 con un mensaje claro'); await ev(() => AU.closeModal('modal-add-course')); await W(400);
  const cid = await ev(() => AU._state().subjects[1].id); await ev(id => document.querySelectorAll('#courses-list .cc')[1].click()); await W(600);
  const addEval = async (n, w, s, d) => { await ev(() => AU.openEval()); await W(400); await p.fill('#eval-name', n); await p.fill('#eval-weight', String(w)); await p.fill('#eval-score', String(s)); if (d) await p.fill('#eval-date', d); await ev(() => AU.saveEval()); await W(450); };
  await addEval('Parcial 1', 30, 4.0); await addEval('Quiz', 20, 3.0, '2030-05-10');
  const r1 = await ev(id => AU._api().calculateSubject(id), cid);
  ok(Math.abs(r1.accumulated - 1.8) < 1e-6 && r1.evaluatedWeight === 50, 'acumulado 1.8 con 50% evaluado (4.0×30% + 3.0×20%)');
  ok(/1\.8/.test(await p.textContent('#details-course-grade')) && /50/.test(await p.textContent('#details-course-percentage')), 'la pantalla de detalle muestra esos mismos valores');
  await ev(() => AU.openEval()); await W(400); await p.fill('#eval-name', 'Final'); await p.fill('#eval-weight', '70'); await p.fill('#eval-score', '3'); await ev(() => AU.saveEval()); await W(250);
  ok(/Solo te queda 50/.test(await p.textContent('#err-eval')), 'no deja pasar de 100% (avisa cuánto queda)'); await ev(() => AU.closeModal('modal-eval')); await W(400);
  await ev(() => document.querySelectorAll('#grades-list .ev')[1].click()); await W(450); await p.fill('#eval-score', '5'); await ev(() => AU.saveEval()); await W(450);
  ok(Math.abs((await ev(id => AU._api().calculateSubject(id), cid)).accumulated - 2.2) < 1e-6, 'editar una nota recalcula (quiz 5.0 → acumulado 2.2)');
  ok(await ev(() => AU._state().subjects[1].academic.assessments[1].date) === '2030-05-10', 'la fecha de la evaluación se conserva');
  await ev(() => { document.querySelectorAll('#grades-list .ev .x')[1].click(); }); await W(100); await ev(() => document.querySelectorAll('#grades-list .ev .x')[1].click()); await W(500);
  ok(await ev(() => AU._state().subjects[1].academic.assessments.length) === 1, 'eliminar una evaluación pide confirmar con un segundo toque');
  await ev(() => AU.editCourse()); await W(400); await p.fill('#edit-course-name', 'Cálculo I'); await p.fill('#edit-course-credits', '5'); await ev(() => AU.saveCourse()); await W(500);
  ok(await ev(() => AU._state().subjects[1].name === 'Cálculo I' && AU._state().subjects[1].credits === 5), 'editar nombre y créditos funciona');

  console.log('\n3. Planificador y fechas');
  await ev(() => AU.closeModal('modal-course-details')); await W(300); await ev(() => AU.openModal('modal-planner')); await W(600);
  await ev(() => AU.openModal('modal-add-task')); await W(450); await p.fill('#input-task-title', 'Entregar informe'); await ev(() => AU.addTask()); await W(450);
  ok(await ev(() => AU._state().tasks.length) === 1, 'se guarda un pendiente'); const xp0 = await ev(() => AU._state().xp);
  await ev(() => AU.toggleTask(AU._state().tasks[0].id)); await W(300);
  ok((await ev(() => AU._state().xp)) === xp0 + 5, 'completar un pendiente da +5 XP');
  await ev(() => AU.closeSub()); await W(300);

  console.log('\n4. Biblioteca (conexión con las fuentes de Aurora)');
  fs.writeFileSync('/tmp/apuntes.pdf', '%PDF-1.1\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'); fs.writeFileSync('/tmp/foto.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==', 'base64')); fs.writeFileSync('/tmp/n.txt', 'Resumen de fotosíntesis');
  await ev(() => AU.openModal('modal-library')); await W(500); await ev(() => document.getElementById('sub-fab').click()); await W(450);
  await p.setInputFiles('#f-file', ['/tmp/apuntes.pdf', '/tmp/foto.png', '/tmp/n.txt']); await W(900);
  const lib = await ev(() => AU._state().lib.map(x => x.kind + ':' + x.title));
  ok(lib.length === 3 && lib.some(x => x.startsWith('PDF')) && lib.some(x => x.startsWith('Imagen')) && lib.some(x => x.startsWith('Apuntes')), 'sube PDF, imagen y texto con los mismos tipos que la app completa: ' + lib.join(', '));
  ok(await ev(async () => { const x = AU._state().lib.find(y => y.kind === 'PDF'); const db = await new Promise(r => { const q = indexedDB.open('brote', 1); q.onsuccess = () => r(q.result); }); return await new Promise(r => { const g = db.transaction('f').objectStore('f').get(x.id); g.onsuccess = () => r(!!g.result && g.result.size > 0); }); }), 'el PDF queda guardado en la misma base (IndexedDB "brote") que lee Aurora');
  await ev(() => AU.openModal('modal-add-file')); await W(400); await p.fill('#src-body', 'https://youtu.be/abc'); await ev(() => AU.saveTextSource()); await W(400);
  ok(await ev(() => AU._state().lib.some(x => x.kind === 'Video')), 'un enlace de YouTube se guarda como Video');
  const k0 = await ev(() => AU._state().lib[0].off); await ev(() => AU.toggleSource(AU._state().lib[0].id)); await W(200);
  ok((await ev(() => !!AU._state().lib[0].off)) !== !!k0, 'se puede activar o desactivar una fuente para Aurora');
  await ev(() => AU.libFilter('PDF')); await W(200); ok(await ev(() => document.querySelectorAll('#lib-list .fi').length) === 1, 'el filtro por tipo funciona');
  await ev(() => AU.closeSub()); await W(300);

  console.log('\n5. Historial, Análisis y Calculadora');
  await ev(() => AU.switchTab('analisis', 2)); await W(2200);
  const an = await ev(() => ({ papa: document.getElementById('papa-display').textContent, risk: document.getElementById('stat-risk').textContent, cred: document.getElementById('stat-credits').textContent }));
  const expected = await ev(() => { const r = AU._api().getAcademicSnapshot(); if (r.papa.value != null) return r.papa.value; const c = AU._api().calculateSemester(r.semesters[0].id); if (c.provisionalCreditWeightedAverage != null) return c.provisionalCreditWeightedAverage; const cr = {}; AU._state().subjects.forEach(x => cr[x.id] = x.credits); const ss = c.subjects.filter(x => x.evaluatedWeight > 0); return ss.reduce((a, x) => a + x.currentAverage * cr[x.subjectId], 0) / ss.reduce((a, x) => a + cr[x.subjectId], 0); });
  ok(Math.abs(parseFloat(an.papa) - expected) < .06, `el promedio mostrado (${an.papa}) coincide con el cálculo del motor académico (${expected.toFixed(2)})`);
  await ev(() => AU.openModal('modal-calculator')); await W(500); ok(/Necesitas/.test(await p.textContent('#cc-wrap')), 'la calculadora dice qué nota necesitas'); await ev(() => AU.closeSub()); await W(300);
  await ev(() => AU.openModal('modal-history')); await W(500); await ev(() => AU.closeSemester()); await W(400); await p.fill('#close-sem-name', '2026-1'); await ev(() => AU.confirmCloseSemester()); await W(600);
  ok(await ev(() => AU._state().archive.length) === 1 && await ev(() => AU._state().subjects.length) === 0, 'cerrar semestre archiva las materias y deja el semestre limpio');
  ok(await ev(() => AU._state().archive[0].subjects.every(s => Array.isArray(s.topics))), 'las materias archivadas siguen siendo compatibles con la app completa');
  await ev(id => AU.restoreSemester(AU._api().listSemesters()[1].id)); await W(400); ok(await ev(() => AU._state().subjects.length) === 2, 'restaurar un semestre devuelve sus materias'); await ev(() => AU.closeSub()); await W(300);

  console.log('\n6. Aurora: conversación, emociones y voz');
  await ev(() => AU.switchTab('inicio', 1)); await W(900);
  await p.fill('#chat-input', '¿Cómo voy en Cálculo?'); await ev(() => AU.sendText()); await W(2200);
  ok(gem.calls.some(c => /generateContent/.test(c.u) && !/preview-tts/.test(c.u)), 'la pregunta se envía a Gemini con tu llave');
  ok(await ev(() => document.getElementById('mensaje-orbe').textContent) === '¡Qué bien, Karen! Vas muy bien en Cálculo. Sigue así.', 'la respuesta se muestra sin la etiqueta de emoción');
  ok(gem.calls.some(c => c.body.includes('[e:feliz]') && c.body.includes('suave, cálida')), 'el prompt define la personalidad femenina, suave y cálida y pide etiqueta de emoción');
  ok(await ev(() => AuroraOrbeAssistant.getHistory().length) >= 2, 'la conversación queda guardada');
  await ev(() => { AU._state().set.tts = 'device'; }); await ev(() => AU.speakLast()); await W(500);
  const sp = await ev(() => window.__spoken.slice(-1)[0]);
  ok(sp && sp.voice !== 'Jorge' && /Paulina|Google/.test(sp.voice) && sp.pitch > 1.1, 'con la voz del dispositivo elige una voz femenina (' + (sp && sp.voice) + ', nunca Jorge) con tono cálido y emocional');
  await ev(() => { AU._state().set.tts = 'gemini'; }); gem.calls.length = 0; await ev(() => AU.speakLast()); await W(2000);
  ok(gem.calls.some(c => /preview-tts/.test(c.u) && c.body.includes('voz de mujer joven') && c.body.includes('Sulafat')), 'con la voz natural pide a Gemini TTS la voz femenina Sulafat con estilo cálido');
  ok(!(await ev(() => AuroraOrbeAssistant.isSpeaking())), 'reproduce el audio completo y termina de hablar');
  gem.ttsFail = true; await ev(() => AuroraOrbeAssistant.speak('Hola, esto es una prueba de respaldo.', 'reposo')); await W(800);
  ok((await ev(() => window.__spoken.slice(-1)[0].text)).includes('prueba de respaldo'), 'si la voz natural falla, Aurora habla con la voz del dispositivo (respaldo)'); gem.ttsFail = false;
  gem.answer = '[e:triste] Lamento decirlo, pero estás en riesgo en Cálculo.'; await p.fill('#chat-input', 'dime la verdad'); await ev(() => AU.sendText()); await W(900);
  ok(/Lamento decirlo/.test(await p.textContent('#mensaje-orbe')) && await ev(() => document.getElementById('orb-eyes').classList.contains('e-triste')), 'el Orbe muestra la emoción que Aurora siente al responder (ojos tristes)');
  ok(await ev(() => AuroraOrbeAssistant.parseEmotion('sin etiqueta ¡excelente!').emotion) === 'feliz', 'si Gemini olvida la etiqueta, la emoción se deduce del texto');
  await ev(() => AU.openChat()); await W(500); ok(await ev(() => document.querySelectorAll('#chat-log .bub').length) >= 4, 'la conversación se puede ver completa');
  await ev(() => AU.closeModal('modal-chat'));

  console.log('\n7. Dictado por voz dentro de la app instalada (sin reconocimiento nativo)');
  gem.answer = '[e:feliz] Vas bien en Cálculo.'; gem.calls.length = 0; await ev(() => { AU._state().set.tts = 'off'; AU._setBusy(false); });
  await ev(() => AU.mic()); await W(7000);
  ok(gem.calls.some(c => c.body.includes('Transcribe literalmente') && c.body.includes('audio/wav')), 'graba el micrófono y envía el audio a Gemini para transcribirlo');
  ok(await ev(() => AuroraOrbeAssistant.getHistory().some(m => m.role === 'user' && m.text === 'cómo voy en cálculo')), 'la frase transcrita entra a la conversación y Aurora la responde');

  console.log('\n7b. Dictado nativo (navegador con reconocimiento de voz)');
  await ev(() => { window.webkitSpeechRecognition = class { start() { setTimeout(() => this.onresult && this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'qué debo estudiar hoy' }], { isFinal: true })] }), 60); } stop() { setTimeout(() => this.onend && this.onend(), 10); } }; AU._setBusy(false); });
  await ev(() => AU.mic()); await W(2500);
  ok(await ev(() => AuroraOrbeAssistant.getHistory().some(m => m.role === 'user' && m.text === 'qué debo estudiar hoy')), 'con reconocimiento nativo, lo que dices entra a la conversación');
  console.log('\n8. La app completa abre con los mismos datos');
  const full = await ctx.newPage(); const ferrs = []; full.on('pageerror', e => ferrs.push(e.message)); await full.route('**/*', r => /127\.0\.0\.1/.test(r.request().url()) ? r.continue() : r.abort());
  await full.goto(base + '/index.html?full=1'); await full.waitForTimeout(1500);
  for (const t of ['inicio', 'plan', 'notas', 'biblio', 'perfil', 'recomp']) { await full.evaluate(t => go(t), t).catch(e => ferrs.push(t + ': ' + e.message)); await full.waitForTimeout(200); }
  ok(ferrs.length === 0, 'Inicio, Plan, Notas, Biblioteca, Perfil y Recompensas abren sin errores con materias creadas en el Orbe' + (ferrs.length ? ' → ' + [...new Set(ferrs)].join(' | ') : ''));
  ok(await full.evaluate(() => JSON.parse(localStorage.getItem('brote2')).subjects.some(s => s.name === 'Cálculo I')), 'la app completa lee la materia nueva');
  const redir = await ctx.newPage(); await redir.route('**/*', r => /127\.0\.0\.1/.test(r.request().url()) ? r.continue() : r.abort()); await redir.goto(base + '/index.html'); await redir.waitForTimeout(800);
  ok(/orbe\.html/.test(redir.url()), 'al abrir la app se entra directo a la interfaz Orbe');
  console.log('\n9. Migración desde el prototipo anterior (brote_app)');
  const mctx = await browser.newContext({ viewport: { width: 390, height: 800 } }); const mp = await mctx.newPage(); const merrs = [];
  mp.on('pageerror', e => merrs.push(e.message)); await mp.addInitScript(() => { if (!localStorage.getItem('x')) { localStorage.setItem('x', '1'); localStorage.setItem('brote_app', JSON.stringify({ semestre: '2026-1', courses: [{ name: 'Química', credits: 3, grades: [{ name: 'Parcial', val: 4.5, weight: 30 }, { name: 'Quiz', val: 3, weight: 20 }] }] })); } });
  await mp.goto(base + '/orbe.html'); await mp.waitForTimeout(1500);
  const mg = await mp.evaluate(() => { const S = AU._state(), s = S.subjects[0], r = AU._api().calculateSubject(s.id); return { n: S.subjects.length, name: s && s.name, acc: r.accumulated, sem: S.currentSemesterName }; });
  ok(mg.n === 1 && mg.name === 'Química' && Math.abs(mg.acc - 1.95) < 1e-6 && mg.sem === '2026-1', 'las materias y notas del prototipo anterior se migran al motor real: ' + JSON.stringify(mg));
  ok(merrs.length === 0, 'sin errores en la migración'); await mctx.close();
  console.log('\nErrores de JavaScript en la interfaz:', errs.length ? errs.join(' | ') : 'ninguno'); ok(errs.length === 0, 'sin errores de JavaScript');
  await browser.close(); server.close(); console.log(`\n${pass} comprobaciones correctas, ${fail} fallidas`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
