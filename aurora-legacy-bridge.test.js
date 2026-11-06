const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '..', 'docs', 'js');
const context = { console, structuredClone, Date, Math, JSON, Number, Object, Array, Set, TypeError, Error };
context.window = context;
context.globalThis = context;
vm.createContext(context);
for (const file of ['aurora-academic-core.js','aurora-academic-adapter.js','aurora-academic-services.js','aurora-history-import.js','aurora-legacy-bridge.js']) {
  vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'), context, { filename:file });
}
const state = {
  subjects: [{ id:'bio', name:'Biología', credits:3, academic:{ assessments:[
    {id:'p1',name:'Parcial 1',weight:40,score:4.0},
    {id:'p2',name:'Parcial 2',weight:60,score:null}
  ]}}],
  archive: []
};
let saves = 0;
const api = context.AuroraLegacyBridge.connect({getState:()=>state, save:()=>{saves++;}});
assert.equal(api.getSubject('bio').subject.name,'Biología');
assert.equal(api.calculateSubject('bio').requiredGrade, 2.3333);
api.updateAssessment('bio','p2',{score:3.5});
assert.equal(state.subjects[0].academic.assessments[1].score,3.5);
assert.equal(saves,1);
assert.equal(api.getAcademicSnapshot().semesters.length,1);
assert.throws(()=>api.updateAssessment('bio','p2',{score:8}),/0\.0–5\.0|entre 0/);
assert.equal(state.subjects[0].academic.assessments[1].score,3.5,'invalid update must not persist');
assert.equal(saves,1,'invalid update must not call save');
console.log('Aurora legacy bridge: 6 assertions passed');
// Evaluaciones procedentes de un programa: ID estable y porcentaje desconocido preservado.
const programState = { subjects:[{id:'chem',name:'Química',credits:4,academic:{assessments:[{id:'prog-a1',name:'Parcial',weight:null,score:null,source:'programa'}]}}], archive:[] };
let programSaves = 0;
const programApi = context.AuroraLegacyBridge.connect({getState:()=>programState,save:()=>{programSaves++;}});
assert.equal(programApi.getSubject('chem').subject.academic.assessments[0].id,'prog-a1');
assert.equal(programApi.calculateSubject('chem').status,'invalid','unknown percentage must be flagged, not treated as zero');
programApi.updateAssessment('chem','prog-a1',{weight:35,score:4.2});
assert.equal(programState.subjects[0].academic.assessments[0].weight,35);
assert.equal(programState.subjects[0].academic.assessments[0].score,4.2);
assert.equal(programSaves,1);
console.log('Aurora program assessment regression: 4 assertions passed');

// PAPA: definitivas completas, intentos repetidos e intentos incompletos.
const papa = context.AuroraAcademicCore.calculatePAPA([
  {id:'mat-1',name:'Cálculo I (primer intento)',credits:4,academic:{assessments:[
    {id:'m1a',weight:40,score:2.0},{id:'m1b',weight:60,score:2.5}
  ]}},
  {id:'mat-2',name:'Cálculo I (repetición)',credits:4,academic:{finalGrade:4.0}},
  {id:'mat-3',name:'Física',credits:3,academic:{assessments:[
    {id:'f1',weight:50,score:4.5},{id:'f2',weight:50,score:null}
  ]}}
]);
assert.equal(papa.countedAttempts,2);
assert.equal(papa.excludedAttempts,1);
assert.equal(papa.value,3.15);
assert.equal(papa.details[0].gradeSource,'calculated-from-assessments');
assert.equal(papa.details[2].finalGrade,null);
console.log('Aurora PAPA attempt validation: 5 assertions passed');

// Compatibilidad: las evaluaciones antiguas sin ID deben poder editarse y persistir.
const legacyNoId = { subjects:[{id:'hist',name:'Historia',credits:2,academic:{assessments:[
  {name:'Control 1',weight:50,score:3.0},{name:'Control 2',weight:50,score:null}
]}}], archive:[] };
let legacyNoIdSaves = 0;
const legacyNoIdApi = context.AuroraLegacyBridge.connect({getState:()=>legacyNoId,save:()=>{legacyNoIdSaves++;}});
assert.equal(legacyNoIdApi.getSubject('hist').subject.academic.assessments[1].id,'assessment-2');
legacyNoIdApi.updateAssessment('hist','assessment-2',{score:4.0});
assert.equal(legacyNoId.subjects[0].academic.assessments[1].id,'assessment-2');
assert.equal(legacyNoId.subjects[0].academic.assessments[1].score,4.0);
assert.equal(legacyNoIdSaves,1);
console.log('Aurora legacy no-ID compatibility: 4 assertions passed');

// Compatibilidad adicional: eliminar una evaluación heredada que todavía no tiene ID.
const legacyDelete = { subjects:[{id:'old-sub',name:'Materia antigua',credits:2,academic:{assessments:[
  {name:'Quiz 1',weight:50,score:3.5},{name:'Quiz 2',weight:50,score:4.0}
]}}], archive:[] };
const legacyDeleteApi = context.AuroraLegacyBridge.connect({getState:()=>legacyDelete,save:()=>{}});
assert.equal(legacyDeleteApi.getSubject('old-sub').subject.academic.assessments[1].id,'assessment-2');
legacyDeleteApi.removeAssessment('old-sub','assessment-2');
assert.equal(legacyDelete.subjects[0].academic.assessments.length,1);
assert.equal(legacyDelete.subjects[0].academic.assessments[0].name,'Quiz 1');
console.log('Aurora legacy delete compatibility: 3 assertions passed');
