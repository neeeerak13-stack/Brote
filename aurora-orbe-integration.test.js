const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const rd = f => fs.readFileSync(path.join('docs', f), 'utf8');
const html = rd('orbe.html'), ui = rd('js/aurora-orbe-ui.js'), home = rd('index.html'), sw = rd('sw.js'), css = rd('css/aurora-ui.css');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
// Estructura de la interfaz: 3 pestañas en el orden aprobado y todas las pantallas
const navPos = ['btn-materias', 'btn-inicio', 'btn-analisis'].map(id => html.indexOf(`id="${id}"`));
ok(navPos.every(i => i > 0) && navPos[0] < navPos[1] && navPos[1] < navPos[2], 'Navegación Materias · Orbe · Análisis en ese orden');
for (const id of ['tab-materias', 'tab-inicio', 'tab-analisis', 'aurora-orb', 'orb-eyes', 'mensaje-orbe', 'chat-input', 'mic-btn', 'courses-list', 'modal-course-details', 'modal-sub', 'modal-chat', 'modal-add-course', 'modal-eval', 'modal-add-file', 'modal-add-task', 'modal-close-sem', 'papa-display', 'papa-ring', 'stat-passed', 'stat-risk', 'input-semestre', 'logo-unal.png']) ok(html.includes(id), 'Falta en la interfaz: ' + id);
// Conexión con el motor y los datos reales
for (const x of ["AuroraLegacyBridge.connect", "localStorage.getItem('brote2')", "localStorage.setItem('brote2'", "API.createSubject", "API.addAssessment", "API.updateAssessment", "API.removeAssessment", "API.calculateSubject", "API.calculateSemester", "API.getAcademicSnapshot", "API.archiveCurrentSemester", "API.restoreSemester", "indexedDB.open('brote'", "AuroraOrbeAssistant", "'brote_app'"]) ok(ui.includes(x), 'Falta conexión: ' + x);
for (const f of ['aurora-academic-core', 'aurora-academic-adapter', 'aurora-academic-services', 'aurora-legacy-bridge', 'aurora-orbe-assistant', 'aurora-orbe-ui']) ok(html.includes(`js/${f}.js`), 'orbe.html no carga ' + f);
ok(html.indexOf('aurora-legacy-bridge.js') < html.indexOf('aurora-orbe-ui.js') && html.indexOf('aurora-orbe-assistant.js') < html.indexOf('aurora-orbe-ui.js'), 'La interfaz se carga después del motor y del asistente');
// Aprobado por la usuaria: nada de efectos pesados
ok(!/mix-blend-mode/.test(css), 'Sin mix-blend-mode (causaba trabas en Android)');
ok(/safe-area-inset/.test(css), 'Respeta las áreas seguras');
// Navegación entre la interfaz y la app completa
ok(/orbe\.html/.test(home) && /aurora_full/.test(home), 'La app completa redirige al Orbe y permite entrar con ?full=1');
ok(/id="to-orbe"/.test(home), 'La app completa tiene un botón para volver al Orbe');
ok(/go=conex/.test(ui) && /go=perfil/.test(ui) && /full=1/.test(ui), 'La interfaz enlaza a Google, respaldo y todas las funciones');
ok(/normalizeSubjects/.test(home), 'La app completa normaliza materias creadas desde el Orbe');
// Caché sin versiones viejas
for (const f of ['orbe.html', 'css/aurora-ui.css', 'logo-unal.png', 'js/aurora-orbe-ui.js', 'js/aurora-orbe-assistant.js', 'js/aurora-legacy-bridge.js']) ok(sw.includes(`'${f}'`), 'Service worker no cachea ' + f);
// Todo archivo local referenciado existe
for (const m of html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+|[a-z0-9.-]+\.(?:png|webmanifest))"/gi)) ok(fs.existsSync(path.join('docs', m[1])), 'Archivo referenciado inexistente: ' + m[1]);
console.log(`Aurora Orbe UI structure: ${n} assertions passed`);
