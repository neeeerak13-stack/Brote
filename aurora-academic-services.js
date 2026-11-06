/* BroteAcademicServices v1
 * Fachada estable para la interfaz (incluido el futuro ui-controller.js de Gemini).
 * No toca DOM ni asume localStorage: la app entrega getState/setState.
 */
(function (root) {
  'use strict';
  const Core = root.BroteAcademicCore;
  const Adapter = root.BroteAcademicAdapter;
  if (!Core || !Adapter) throw new Error('Carga primero brote-academic-core.js y brote-academic-adapter.js.');

  const clone = (v) => typeof structuredClone === 'function'
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));

  function create(options) {
    if (!options || typeof options.getState !== 'function' || typeof options.setState !== 'function') {
      throw new TypeError('BroteAcademicServices.create requiere getState() y setState(nextState).');
    }
    const getState = options.getState;
    const setState = options.setState;
    const getSemesterName = options.getSemesterName || (() => 'Semestre actual');

    function currentModel() {
      const legacy = getState();
      if (!legacy || typeof legacy !== 'object') throw new Error('No se pudo leer el estado académico anterior.');
      return { legacy: clone(legacy), model: Adapter.fromLegacyState(legacy, getSemesterName()) };
    }
    function locateLegacy(state, subjectId) {
      const active = (state.subjects || []).find(s => s && s.id === subjectId);
      if (active) return { subject: active, archived: false };
      for (const semester of state.archive || []) {
        const subject = (semester.subjects || []).find(s => s && s.id === subjectId);
        if (subject) return { subject, archived: true };
      }
      return null;
    }
    function listSemesters() {
      const { model } = currentModel();
      return clone([model.activeSemester, ...model.archivedSemesters]);
    }
    function getSubject(subjectId) {
      const { model } = currentModel();
      const found = Adapter.findSubject(model, subjectId);
      return found ? clone({ semesterId: found.semester.id, semesterName: found.semester.name, subject: found.subject }) : null;
    }
    function getAcademicSnapshot() {
      const { model } = currentModel();
      const semesters = [model.activeSemester, ...model.archivedSemesters];
      return clone({
        schemaVersion: model.schemaVersion,
        semesters,
        activeSemesterId: model.activeSemester.id,
        papa: Adapter.calculatePAPA(semesters),
        risk: Adapter.getGlobalRiskLevel(semesters)
      });
    }
    function calculateSubject(subjectId, targetGrade) {
      const { model } = currentModel();
      const found = Adapter.findSubject(model, subjectId);
      if (!found) throw new Error('No se encontró la asignatura.');
      return Core.calculateSubject(found.subject, targetGrade === undefined ? 3 : targetGrade);
    }
    function updateAssessment(subjectId, assessmentId, value) {
      const { legacy, model } = currentModel();
      const patch = typeof value === 'number' ? { score: value } : (value || {});
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('La actualización debe ser una nota o un objeto de cambios.');
      const allowed = new Set(['name','type','weight','score','date','dateStatus','source','sourceQuote','dateConfirmedBy','calendarEventId','calendarStatus']);
      for (const key of Object.keys(patch)) if (!allowed.has(key)) throw new Error(`Campo no permitido en una evaluación: ${key}`);
      if (patch.date != null && !/^\d{4}-\d{2}-\d{2}$/.test(patch.date)) throw new Error('La fecha debe usar el formato YYYY-MM-DD.');
      if (patch.dateStatus != null && !['confirmed','tentative','pending'].includes(patch.dateStatus)) throw new Error('Estado de fecha no válido.');
      if (patch.dateConfirmedBy != null && !['user','document','calendar','manual'].includes(patch.dateConfirmedBy)) throw new Error('Origen de confirmación no válido.');
      Adapter.updateAssessment(model, subjectId, assessmentId, patch);
      const location = locateLegacy(legacy, subjectId);
      if (!location) throw new Error('No se encontró la asignatura en el almacenamiento original.');
      const list = location.subject.academic && location.subject.academic.assessments;
      let item = (list || []).find(a => a && a.id === assessmentId);
      // Compatibilidad con evaluaciones antiguas sin ID: Core las expone como
      // assessment-N. Al primer cambio materializamos ese ID en el dato legacy.
      if (!item && /^assessment-[1-9]\d*$/.test(String(assessmentId))) {
        const index = Number(String(assessmentId).slice('assessment-'.length)) - 1;
        const candidate = Array.isArray(list) ? list[index] : null;
        if (candidate && !candidate.id) {
          candidate.id = assessmentId;
          item = candidate;
        }
      }
      if (!item) throw new Error('No se encontró la evaluación en el almacenamiento original.');
      Object.assign(item, patch);
      setState(legacy);
      const refreshed = Adapter.fromLegacyState(legacy, getSemesterName());
      const found = Adapter.findSubject(refreshed, subjectId);
      return Core.calculateSubject(found.subject);
    }
    function calculateSemester(semesterId) {
      const { model } = currentModel();
      const semesters = [model.activeSemester, ...model.archivedSemesters];
      const semester = semesters.find(s => s.id === semesterId) || model.activeSemester;
      return Core.calculateSemester(semester);
    }
    function calculatePAPA() {
      const { model } = currentModel();
      return Adapter.calculatePAPA([model.activeSemester, ...model.archivedSemesters]);
    }
    function getGlobalRiskLevel(today) {
      const { model } = currentModel();
      return Adapter.getGlobalRiskLevel([model.activeSemester, ...model.archivedSemesters], today);
    }
    function mutateState(mutator) {
      const state = getState();
      if (!state || typeof state !== 'object') throw new Error('Estado académico no disponible.');
      mutator(state);
      setState(state);
      return true;
    }
    function createSubject(data) {
      const d = data || {};
      const name = String(d.name || '').trim();
      if (!name) throw new Error('El nombre de la asignatura es obligatorio.');
      const credits = d.credits == null || d.credits === '' ? null : Number(d.credits);
      if (credits !== null && (!Number.isFinite(credits) || credits <= 0 || credits > 30)) throw new Error('Los créditos deben estar entre 0 y 30.');
      const subject = {
        id: d.id || `aurora-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,
        name, code: d.code || '', professor: d.professor || '', group: d.group || '',
        schedule: Array.isArray(d.schedule) ? d.schedule : [],
        credits, academic: { credits, assessments: [] },
        // Campos que usa la app completa (Inicio, Plan, Perfil): evita fallos con materias creadas desde el Orbe.
        color: ['mint','blue','pink','yel','lil'][(((getState() || {}).subjects || []).length) % 5], exam: '', goal: '', topics: [], sources: []
      };
      mutateState(state => {
        state.subjects = Array.isArray(state.subjects) ? state.subjects : [];
        if (state.subjects.some(x => String(x.name || '').toLowerCase() === name.toLowerCase())) throw new Error('Ya existe una asignatura con ese nombre en el semestre activo.');
        state.subjects.push(subject);
      });
      return clone(subject);
    }
    function updateSubject(subjectId, patch) {
      const allowed = new Set(['name','code','professor','group','schedule','credits','colorTheme']);
      const changes = patch || {};
      Object.keys(changes).forEach(k => { if (!allowed.has(k)) throw new Error(`Campo no permitido: ${k}`); });
      return mutateState(state => {
        const found = locateLegacy(state, subjectId);
        if (!found) throw new Error('No se encontró la asignatura.');
        if (changes.name !== undefined && !String(changes.name).trim()) throw new Error('El nombre no puede estar vacío.');
        Object.assign(found.subject, changes);
        if (changes.credits !== undefined) {
          const c = changes.credits == null || changes.credits === '' ? null : Number(changes.credits);
          if (c !== null && (!Number.isFinite(c) || c <= 0 || c > 30)) throw new Error('Créditos no válidos.');
          found.subject.credits = c;
          found.subject.academic = found.subject.academic || {};
          found.subject.academic.credits = c;
        }
      });
    }
    function addAssessment(subjectId, data) {
      const d = data || {};
      const name = String(d.name || '').trim();
      if (!name) throw new Error('El nombre de la evaluación es obligatorio.');
      const weight = d.weight == null || d.weight === '' ? null : Number(d.weight);
      if (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 100)) throw new Error('El porcentaje debe estar entre 0 y 100.');
      const assessment = { id: d.id || `eval-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`, name, type: d.type || 'evaluation', weight, score: null, date: d.date || null, dateStatus: d.date ? (d.dateStatus || 'tentative') : 'pending', source: d.source || 'manual' };
      mutateState(state => {
        const found = locateLegacy(state, subjectId);
        if (!found) throw new Error('No se encontró la asignatura.');
        found.subject.academic = found.subject.academic || {};
        found.subject.academic.assessments = Array.isArray(found.subject.academic.assessments) ? found.subject.academic.assessments : [];
        if (found.subject.academic.assessments.some(a => a.id === assessment.id)) throw new Error('ID de evaluación duplicado.');
        found.subject.academic.assessments.push(assessment);
      });
      return clone(assessment);
    }
    function removeAssessment(subjectId, assessmentId) {
      return mutateState(state => {
        const found = locateLegacy(state, subjectId);
        if (!found) throw new Error('No se encontró la asignatura.');
        const list = found.subject.academic && found.subject.academic.assessments || [];
        let index = list.findIndex(a => a && a.id === assessmentId);
        // Las evaluaciones heredadas sin ID reciben assessment-N al normalizarse.
        // Materializamos el mismo ID antes de eliminarlas para conservar compatibilidad.
        if (index < 0 && /^assessment-[1-9]\d*$/.test(String(assessmentId))) {
          const legacyIndex = Number(String(assessmentId).slice('assessment-'.length)) - 1;
          if (list[legacyIndex] && !list[legacyIndex].id) {
            list[legacyIndex].id = assessmentId;
            index = legacyIndex;
          }
        }
        if (index < 0) throw new Error('No se encontró la evaluación.');
        list.splice(index, 1);
      });
    }
    function archiveCurrentSemester(name) {
      return mutateState(state => {
        const subjects = Array.isArray(state.subjects) ? state.subjects : [];
        if (!subjects.length) throw new Error('No hay asignaturas para archivar.');
        state.archive = Array.isArray(state.archive) ? state.archive : [];
        state.archive.push({ id: `semester-${Date.now().toString(36)}`, name: String(name || state.currentSemesterName || 'Semestre archivado'), archivedAt: new Date().toISOString(), subjects: clone(subjects) });
        state.subjects = [];
        state.currentSemesterName = 'Nuevo semestre';
      });
    }
    function restoreSemester(semesterId) {
      return mutateState(state => {
        if ((state.subjects || []).length) throw new Error('El semestre activo debe estar vacío antes de restaurar otro.');
        const i = (state.archive || []).findIndex(a => a.id === semesterId);
        if (i < 0) throw new Error('No se encontró el semestre archivado.');
        const archived = state.archive.splice(i, 1)[0];
        state.subjects = clone(archived.subjects || []);
        state.currentSemesterName = archived.name || 'Semestre restaurado';
      });
    }

    return Object.freeze({
      version: '1.1.0',
      createSubject,
      updateSubject,
      addAssessment,
      removeAssessment,
      archiveCurrentSemester,
      restoreSemester,
      listSemesters,
      getSubject,
      getAcademicSnapshot,
      calculateSubject,
      updateAssessment,
      calculateSemester,
      calculatePAPA,
      getGlobalRiskLevel
    });
  }

  const api = Object.freeze({ version: '1.1.0', create });
  root.BroteAcademicServices = api; // Alias temporal para compatibilidad con el código heredado.
  root.AuroraAcademicServices = api; // Nombre oficial para la nueva interfaz.
})(typeof window !== 'undefined' ? window : globalThis);
