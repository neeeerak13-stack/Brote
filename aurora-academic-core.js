/* BroteAcademicCore v1
 * Núcleo académico puro: no modifica DOM, almacenamiento, OAuth ni estilos.
 * La integración con la estructura legacy (S.subjects / S.archive) se hace mediante adaptadores.
 */
(function (root) {
  'use strict';

  const SCALE_MIN = 0;
  const SCALE_MAX = 5;
  const PASSING_GRADE = 3;
  const EPS = 1e-8;

  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  const validGrade = (v) => Number.isFinite(v) && v >= SCALE_MIN && v <= SCALE_MAX;
  const validWeight = (v) => Number.isFinite(v) && v >= 0 && v <= 100;

  function normalizeAssessments(subject) {
    const list = subject && subject.academic && Array.isArray(subject.academic.assessments)
      ? subject.academic.assessments
      : [];
    return list.map((a, index) => ({
      id: a.id || `assessment-${index + 1}`,
      name: a.name || `Evaluación ${index + 1}`,
      weight: num(a.weight),
      score: num(a.score),
      date: a.date || null,
      source: a.source || 'manual',
      dateStatus: a.dateStatus || a.certainty || (a.date ? 'tentative' : 'pending')
    }));
  }

  function calculateSubject(subject, targetGrade = PASSING_GRADE) {
    const assessments = normalizeAssessments(subject);
    const errors = [];
    if (!Number.isFinite(targetGrade) || targetGrade < SCALE_MIN || targetGrade > SCALE_MAX) {
      errors.push('La nota objetivo debe estar entre 0.0 y 5.0.');
    }

    assessments.forEach((a) => {
      if (a.weight === null || !validWeight(a.weight)) errors.push(`${a.name}: porcentaje inválido o sin definir.`);
      if (a.score !== null && !validGrade(a.score)) errors.push(`${a.name}: nota fuera del rango 0.0–5.0.`);
    });

    const totalWeight = assessments.reduce((sum, a) => sum + (validWeight(a.weight) ? a.weight : 0), 0);
    if (totalWeight > 100 + EPS) errors.push('Los porcentajes de las evaluaciones superan el 100%.');

    const graded = assessments.filter((a) => a.score !== null && validGrade(a.score) && validWeight(a.weight) && a.weight > 0);
    const evaluatedWeight = graded.reduce((sum, a) => sum + a.weight, 0);
    const accumulated = graded.reduce((sum, a) => sum + (a.score * a.weight / 100), 0);
    const remainingWeight = Math.max(0, 100 - evaluatedWeight);
    const required = remainingWeight > EPS ? (targetGrade - accumulated) / (remainingWeight / 100) : null;
    const maximumPossible = accumulated + (SCALE_MAX * remainingWeight / 100);
    const currentAverage = evaluatedWeight > EPS ? accumulated / (evaluatedWeight / 100) : null;

    let status = 'no-data';
    if (errors.length) status = 'invalid';
    else if (graded.length) {
      if (remainingWeight <= EPS) status = accumulated + EPS >= targetGrade ? 'target-reached' : 'target-missed';
      else if (maximumPossible + EPS < targetGrade) status = 'impossible';
      else if (required > 4.0) status = 'high-risk';
      else status = 'on-track';
    }

    return {
      subjectId: subject && subject.id || null,
      subjectName: subject && subject.name || null,
      accumulated: round(accumulated, 4),
      evaluatedWeight: round(evaluatedWeight, 4),
      remainingWeight: round(remainingWeight, 4),
      currentAverage: currentAverage === null ? null : round(currentAverage, 4),
      requiredGrade: required === null ? null : round(required, 4),
      maximumPossible: round(maximumPossible, 4),
      configuredWeight: round(totalWeight, 4),
      targetGrade,
      status,
      errors,
      assessments
    };
  }

  function round(value, places = 2) {
    const p = 10 ** places;
    return Math.round((value + Number.EPSILON) * p) / p;
  }

  function calculateRequiredGrade(subject, targetGrade = PASSING_GRADE) {
    const result = calculateSubject(subject, targetGrade);
    return {
      requiredGrade: result.requiredGrade,
      maximumPossible: result.maximumPossible,
      remainingWeight: result.remainingWeight,
      status: result.status,
      errors: result.errors
    };
  }

  function calculateSemester(semester) {
    const subjects = Array.isArray(semester && semester.subjects) ? semester.subjects : [];
    const results = subjects.map((s) => calculateSubject(s));
    const invalid = results.filter((r) => r.status === 'invalid').length;
    const atRisk = results.filter((r) => ['impossible', 'high-risk', 'target-missed'].includes(r.status)).length;
    const complete = results.filter((r) => r.remainingWeight <= EPS && r.status !== 'invalid').length;
    const credits = subjects.reduce((sum, s) => sum + Math.max(0, num(s.credits) || 0), 0);
    const completed = subjects.filter((s, i) => results[i].remainingWeight <= EPS && results[i].status !== 'invalid');
    const weighted = completed.reduce((sum, s) => sum + (results[subjects.indexOf(s)].accumulated * (num(s.credits) || 0)), 0);
    const completedCredits = completed.reduce((sum, s) => sum + (num(s.credits) || 0), 0);
    return {
      semesterId: semester && semester.id || null,
      subjectCount: subjects.length,
      totalCredits: credits,
      completedSubjects: complete,
      atRiskSubjects: atRisk,
      invalidSubjects: invalid,
      provisionalCreditWeightedAverage: completedCredits ? round(weighted / completedCredits, 4) : null,
      subjects: results
    };
  }

  // Calcula definitiva solo con 100% ponderado y todas las notas registradas.
  function getDefinitiveGrade(subject) {
    const academic = subject && subject.academic || {};
    const explicit = num(academic.finalGrade);
    if (validGrade(explicit)) return { grade: explicit, source: 'stored-final-grade' };
    const assessments = normalizeAssessments(subject);
    if (!assessments.length || assessments.some(a => a.score === null || !validGrade(a.score) || !validWeight(a.weight))) {
      return { grade: null, source: 'incomplete' };
    }
    const totalWeight = assessments.reduce((sum, a) => sum + a.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) return { grade: null, source: 'incomplete-weight' };
    const grade = assessments.reduce((sum, a) => sum + a.score * a.weight / 100, 0);
    return { grade: validGrade(grade) ? round(grade, 4) : null, source: 'calculated-from-assessments' };
  }

  // Cada intento cursado debe estar representado por separado en history.
  // Los intentos incompletos no se estiman ni se cuentan.
  function calculatePAPA(history) {
    const records = Array.isArray(history) ? history : [];
    const mapped = records.map(subject => {
      const definitive = getDefinitiveGrade(subject);
      const credits = num(subject && subject.credits);
      return { subject, grade: definitive.grade, gradeSource: definitive.source, credits };
    });
    const eligible = mapped.filter(x => validGrade(x.grade) && Number.isFinite(x.credits) && x.credits > 0);
    const points = eligible.reduce((sum, x) => sum + x.grade * x.credits, 0);
    const credits = eligible.reduce((sum, x) => sum + x.credits, 0);
    return {
      value: credits ? round(points / credits, 4) : null,
      countedCredits: credits,
      countedSubjects: eligible.length,
      excludedSubjects: records.length - eligible.length,
      countedAttempts: eligible.length,
      excludedAttempts: records.length - eligible.length,
      policyStatus: 'requires-history-validation',
      calculationBasis: 'Promedio ponderado por créditos de las notas definitivas disponibles; cada intento debe estar representado por separado.',
      note: 'Es una estimación local. Verifica que el historial incluya todos los intentos, créditos y definitivas; no sustituye el PAPA oficial registrado por la UNAL.',
      details: mapped.map(x => ({
        subjectId: x.subject && x.subject.id || null,
        subjectName: x.subject && x.subject.name || null,
        credits: x.credits,
        finalGrade: x.grade,
        gradeSource: x.gradeSource,
        counted: validGrade(x.grade) && Number.isFinite(x.credits) && x.credits > 0
      }))
    };
  }

  function getGlobalRiskLevel(semesters, today = new Date()) {
    const subjects = (Array.isArray(semesters) ? semesters : []).flatMap((s) => Array.isArray(s.subjects) ? s.subjects : []);
    const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let overdue = 0, dueSoon = 0, highRisk = 0;
    subjects.forEach((s) => {
      const calc = calculateSubject(s);
      if (['impossible', 'high-risk', 'target-missed'].includes(calc.status)) highRisk++;
      normalizeAssessments(s).forEach((a) => {
        if (!a.date || a.score !== null) return;
        const d = new Date(`${a.date}T00:00:00`);
        if (Number.isNaN(d.getTime())) return;
        const delta = Math.round((d - now) / 86400000);
        if (delta < 0) overdue++;
        else if (delta <= 7) dueSoon++;
      });
    });
    const score = highRisk * 3 + overdue * 2 + dueSoon;
    return {
      level: score >= 6 ? 'critical' : score >= 3 ? 'elevated' : score > 0 ? 'attention' : 'calm',
      score, highRiskSubjects: highRisk, overdueAssessments: overdue, assessmentsDueWithin7Days: dueSoon
    };
  }

  const api = Object.freeze({
    version: '1.0.0',
    config: Object.freeze({ scaleMin: SCALE_MIN, scaleMax: SCALE_MAX, passingGrade: PASSING_GRADE }),
    calculateSubject,
    calculateRequiredGrade,
    calculateSemester,
    calculatePAPA,
    getDefinitiveGrade,
    getGlobalRiskLevel
  });
  root.BroteAcademicCore = api;
  root.AuroraAcademicCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
