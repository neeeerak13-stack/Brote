/* Aurora history import v1.0 — preview first, explicit commit, no invented grades. */
(function(root){
'use strict';
const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function parseCSV(text){
 const src=String(text||'').replace(/^\uFEFF/,''); const head=(src.split(/\r?\n/)[0]||''); const counts={',':(head.match(/,/g)||[]).length,';':(head.match(/;/g)||[]).length,'\t':(head.match(/\t/g)||[]).length}; const delim=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0]; const rows=[]; let row=[],cell='',q=false;
 for(let i=0;i<src.length;i++){const c=src[i],n=src[i+1];
  if(c==='"'&&q&&n==='"'){cell+='"';i++}
  else if(c==='"')q=!q;
  else if(!q&&c===delim){row.push(cell);cell=''}
  else if(!q&&(c==='\n'||c==='\r')){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(x=>String(x).trim()))rows.push(row);row=[];cell=''}
  else cell+=c;
 }
 row.push(cell);if(row.some(x=>String(x).trim()))rows.push(row);
 if(rows.length<2)return [];
 const headers=rows.shift().map(norm);
 return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()])));
}
function first(o,keys){for(const k of keys){const v=o[k];if(v!=null&&String(v).trim())return v}return ''}
function number(v){if(v==null||String(v).trim()==='')return null;let s=String(v).trim().replace(/\s/g,'');if(/^\d+,\d+$/.test(s))s=s.replace(',','.');else s=s.replace(/,(?=\d{3}(?:\D|$))/g,'');const n=Number(s);return Number.isFinite(n)?n:NaN}
function normalizeRecord(r,i){
 const name=first(r,['asignatura','materia','nombre','subject','subjectname','name','curso','coursename']);
 const code=first(r,['codigo','código','code','coursecode']); const credits=number(first(r,['creditos','créditos','credits','creditcount']));
 const grade=number(first(r,['nota','definitiva','calificacion','calificación','grade','final grade','finalgrade']));
 const semester=first(r,['semestre','periodo','período','semester','semestername','academicperiod'])||'Historial importado';
 const attempt=first(r,['intento','repeticion','repetición','attempt','attemptnumber'])||'1';
 const errors=[],warnings=[];
 if(!name)errors.push('Falta el nombre de la asignatura.');
 if(Number.isNaN(credits)||credits===null||credits<=0||credits>30)errors.push('Créditos inválidos o ausentes (1–30).');
 if(Number.isNaN(grade)||grade!==null&&(grade<0||grade>5))errors.push('Nota fuera del rango 0.0–5.0.');
 if(grade===null)warnings.push('Sin nota definitiva: se importará como registro incompleto.');
 return {index:i+1,name,code,credits,finalGrade:grade,semester,attempt:String(attempt),errors,warnings};
}
function fingerprint(x){return [norm(x.code||x.name),Number(x.credits),norm(x.semester),String(x.attempt||'1')].join('|')}
function create(){
 let last=null;
 function preview(records,state){
  const source=Array.isArray(records)?records:[];const normalized=source.map(normalizeRecord);
  const existing=[];
  (state&&state.subjects||[]).forEach(s=>existing.push({name:s.name,code:s.code,credits:s.credits||s.academic&&s.academic.credits,semester:state.currentSemesterName||'Semestre actual',attempt:s.attempt||'1'}));
  (state&&state.archive||[]).forEach(sem=>(sem.subjects||[]).forEach(s=>existing.push({name:s.name,code:s.code,credits:s.credits||s.academic&&s.academic.credits,semester:sem.name,attempt:s.attempt||'1'})));
  const seen=new Set(existing.map(fingerprint));
  normalized.forEach(x=>{x.duplicate=seen.has(fingerprint(x));if(x.duplicate)x.warnings.push('Posible duplicado: ya existe un registro equivalente.');else if(!x.errors.length)seen.add(fingerprint(x))});
  last={token:Math.random().toString(36).slice(2),records:normalized};
  return {token:last.token,records:normalized,summary:{total:normalized.length,valid:normalized.filter(x=>!x.errors.length&&!x.duplicate).length,duplicates:normalized.filter(x=>x.duplicate).length,invalid:normalized.filter(x=>x.errors.length).length,incompleteGrades:normalized.filter(x=>x.finalGrade===null&&!x.errors.length&&!x.duplicate).length}};
 }
 function previewCSV(csv,state){return preview(parseCSV(csv),state)}
 function previewJSON(json,state){const data=typeof json==='string'?JSON.parse(json):json;const rows=Array.isArray(data)?data:data&&data.records;if(!Array.isArray(rows))throw new Error('El JSON debe ser una lista o contener records[].');return preview(rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[norm(k),v]))),state)}
 function commit(token,state){
  if(!last||token!==last.token)throw new Error('La vista previa expiró. Vuelve a importar el archivo.');
  const eligible=last.records.filter(x=>!x.errors.length&&!x.duplicate);const groups=new Map();
  eligible.forEach(x=>{if(!groups.has(x.semester))groups.set(x.semester,[]);groups.get(x.semester).push(x)});
  state.archive=Array.isArray(state.archive)?state.archive:[];
  groups.forEach((rows,name)=>{
   let sem=state.archive.find(x=>norm(x.name)===norm(name));
   if(!sem){sem={id:'history-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),name,status:'archived',subjects:[]};state.archive.push(sem)}
   sem.subjects=Array.isArray(sem.subjects)?sem.subjects:[];
   rows.forEach(x=>sem.subjects.push({id:'hist-'+Math.random().toString(36).slice(2,10),name:x.name,code:x.code,credits:x.credits,attempt:x.attempt,finalGrade:x.finalGrade,status:x.finalGrade===null?'incomplete':x.finalGrade>=3?'passed':'failed',academic:{credits:x.credits,assessments:[],finalGrade:x.finalGrade,gradeSource:x.finalGrade===null?null:'imported-history'}}));
  });
  const added=eligible.length, skipped=last.records.length-added;last=null;return {added,skipped,semestersTouched:groups.size};
 }
 return Object.freeze({preview,previewCSV,previewJSON,commit});
}
root.AuroraHistoryImport=Object.freeze({version:'1.0.0',create,parseCSV});
})(typeof window!=='undefined'?window:globalThis);
