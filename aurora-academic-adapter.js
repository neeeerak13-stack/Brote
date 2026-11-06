/* BroteAcademicAdapter v1
 * Adapta el estado legacy brote2 al contrato académico sin modificarlo.
 * Requiere brote-academic-core.js cargado antes.
 */
(function (root) {
  'use strict';
  const Core = root.BroteAcademicCore;
  if (!Core) throw new Error('Carga brote-academic-core.js antes del adaptador.');

  const clone = (v) => (typeof structuredClone === 'function'
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v)));
  const slug = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

  function normalizeSubject(subject) {
    const s = clone(subject || {});
    s.academic = s.academic || {};
    s.academic.assessments = Array.isArray(s.academic.assessments) ? s.academic.assessments : [];
    s.academic.assessments = s.academic.assessments.map((assessment, index) => ({
      ...(assessment || {}),
      id: assessment && assessment.id ? assessment.id : `assessment-${index + 1}`
    }));
    if (s.academic.credits == null && s.credits != null) s.academic.credits = s.credits;
    if (s.credits == null && s.academic.credits != null) s.credits = s.academic.credits;
    return s;
  }

  function fromLegacyState(state, activeName) {
    const st = state || {};
    const active = (st.subjects || []).map(normalizeSubject);
    const archives = (st.archive || []).map((a, i) => ({
      id: a.id || `archive-${i + 1}`,
      name: a.name || `Semestre anterior ${i + 1}`,
      status: 'archived',
      subjects: (a.subjects || []).map(normalizeSubject)
    }));
    const activeSemester = {
      id: 'active-semester',
      name: activeName || st.currentSemesterName || 'Semestre actual',
      status: 'active',
      subjects: active
    };
    return { schemaVersion: 1, activeSemester, archivedSemesters: archives };
  }

  function findSubject(model, subjectId) {
    const groups = [model && model.activeSemester, ...((model && model.archivedSemesters) || [])];
    for (const semester of groups) {
      const subject = (semester && semester.subjects || []).find(s => s.id === subjectId);
      if (subject) return { semester, subject };
    }
    return null;
  }

  function updateAssessment(model, subjectId, assessmentId, patch) {
    const found = findSubject(model, subjectId);
    if (!found) throw new Error('No se encontró la asignatura.');
    const list = found.subject.academic && found.subject.academic.assessments;
    const assessment = (list || []).find(a => a.id === assessmentId);
    if (!assessment) throw new Error('No se encontró la evaluación.');
    const next = Object.assign({}, assessment, patch || {});
    if (next.score !== null && next.score !== undefined && (!Number.isFinite(Number(next.score)) || Number(next.score) < 0 || Number(next.score) > 5)) {
      throw new Error('La nota debe estar entre 0.0 y 5.0.');
    }
    if (next.weight !== null && next.weight !== undefined && (!Number.isFinite(Number(next.weight)) || Number(next.weight) < 0 || Number(next.weight) > 100)) {
      throw new Error('El porcentaje debe estar entre 0 y 100.');
    }
    Object.assign(assessment, next);
    return Core.calculateSubject(found.subject);
  }

  function calculateSemester(semester) { return Core.calculateSemester(semester); }
  function calculatePAPA(semesters, options) {
    const history = (semesters || []).flatMap(s => s.subjects || []);
    return Core.calculatePAPA(history, options);
  }
  function getGlobalRiskLevel(semesters, today) { return Core.getGlobalRiskLevel(semesters || [], today); }

  const api = Object.freeze({
    version: '1.0.0',
    fromLegacyState,
    normalizeSubject,
    findSubject,
    updateAssessment,
    calculateSemester,
    calculatePAPA,
    getGlobalRiskLevel,
    normalizeName: slug
  });
  root.BroteAcademicAdapter = api;
  root.AuroraAcademicAdapter = api;
})(typeof window !== 'undefined' ? window : globalThis);
