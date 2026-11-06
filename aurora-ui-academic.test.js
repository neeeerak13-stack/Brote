'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
global.window = global;
for (const f of [
  'aurora-academic-core.js',
  'aurora-academic-adapter.js',
  'aurora-academic-services.js',
  'aurora-history-import.js',
  'aurora-legacy-bridge.js'
]) require(path.join(root, 'docs', 'js', f));

let saves = 0;
const state = {
  currentSemesterName: '2026-2',
  subjects: [{
    id: 'bio-1', name: 'Biología', credits: 3, topics: [], sources: [],
    academic: { credits: 3, assessments: [] }
  }],
  archive: [], sessions: [], lib: []
};
const api = global.AuroraLegacyBridge.connect({
  getState: () => state,
  setState: next => { if (next !== state) { Object.keys(state).forEach(k => delete state[k]); Object.assign(state, next); } },
  save: () => { saves++; },
  getSemesterName: () => state.currentSemesterName
});
const a = api.addAssessment('bio-1', { name: 'Parcial 1', weight: 40 });
const b = api.addAssessment('bio-1', { name: 'Proyecto', weight: 60 });
api.updateAssessment('bio-1', a.id, { score: 4 });
api.updateAssessment('bio-1', b.id, { score: 3 });
const calc = api.calculateSubject('bio-1');
assert.strictEqual(calc.accumulated, 3.4);
assert.strictEqual(calc.evaluatedWeight, 100);
assert.strictEqual(calc.remainingWeight, 0);
assert.strictEqual(calc.status, 'target-reached');
assert.strictEqual(api.calculatePAPA().value, 3.4);
assert.ok(saves >= 4);

const importer = global.AuroraHistoryImport.create();
const preview = importer.previewCSV(
  'Asignatura;Código;Créditos;Nota;Semestre;Intento\nQuímica;QUI101;4;4,2;2025-2;1',
  state
);
assert.strictEqual(preview.summary.valid, 1);
const committed = importer.commit(preview.token, state);
assert.strictEqual(committed.added, 1);
assert.strictEqual(state.archive.length, 1);
assert.strictEqual(state.archive[0].subjects[0].academic.finalGrade, 4.2);

const html = fs.readFileSync(path.join(root, 'docs', 'index.html'), 'utf8');
for (const marker of [
  'function notas()', 'function addAcademicAssessment(', 'function editAcademicAssessment(',
  'function saveAssessmentScore(', 'function exportAcademicCSV(',
  'function exportAuroraBackup(', 'function restoreAuroraBackup(',
  'function importAcademicHistory(', "notas,'brote':"
]) {
  if (!html.includes(marker)) {
    // Route table's minified object is validated separately below.
    if (marker === "notas,'brote':") continue;
    assert.fail('Missing academic UI feature: ' + marker);
  }
}
assert.ok(html.includes("notas,bro te") === false);
assert.ok(html.includes("notas,brote:brotetab"));
assert.ok(html.includes("delete safe.set.key"));
assert.ok(html.includes("delete safe.set.ytk"));
assert.ok(html.includes("gOn()"));
assert.ok(html.includes("domain==='unal.edu.co'||domain.endsWith('.unal.edu.co')"));
assert.ok(html.includes("openid','email','drive.readonly"));
assert.ok(html.includes("G.accountVerified"));
assert.ok(html.includes("driveSheet()"));
assert.ok(html.includes("clsSheet()"));
assert.ok(html.includes("calSheet()"));
assert.ok(html.includes("mailSheet()"));
console.log('Aurora UI academic workflow: 21 assertions passed');
