/* AuroraLegacyBridge v1: conecta la lógica académica al estado persistido brote2.
 * Se carga después de aurora-academic-core/adapter/services y del script principal.
 * No migra ni renombra la clave de almacenamiento: conserva brote2 para evitar pérdidas.
 */
(function (root) {
  'use strict';
  const Services = root.AuroraAcademicServices || root.BroteAcademicServices;
  if (!Services) throw new Error('Falta AuroraAcademicServices.');

  function connect(bridge) {
    if (!bridge || typeof bridge.getState !== 'function' || typeof bridge.save !== 'function') {
      throw new TypeError('Aurora necesita un puente con getState() y save().');
    }
    const api = Services.create({
      getState: bridge.getState,
      setState: function (nextState) {
        if (typeof bridge.setState === 'function') bridge.setState(nextState);
        else {
          const current = bridge.getState();
          if (!current || typeof current !== 'object') throw new Error('Estado académico no disponible.');
          if (current !== nextState) {
            Object.keys(current).forEach(k => delete current[k]);
            Object.assign(current, nextState);
          }
        }
        bridge.save();
      },
      getSemesterName: bridge.getSemesterName
    });
    return Object.freeze({
      version: '1.1.0',
      createSubject: api.createSubject,
      updateSubject: api.updateSubject,
      addAssessment: api.addAssessment,
      removeAssessment: api.removeAssessment,
      archiveCurrentSemester: api.archiveCurrentSemester,
      restoreSemester: api.restoreSemester,
      listSemesters: api.listSemesters,
      getSubject: api.getSubject,
      getAcademicSnapshot: api.getAcademicSnapshot,
      calculateSubject: api.calculateSubject,
      updateAssessment: api.updateAssessment,
      calculateSemester: api.calculateSemester,
      calculatePAPA: api.calculatePAPA,
      getGlobalRiskLevel: api.getGlobalRiskLevel
    });
  }

  const facade = Object.freeze({ version: '1.1.0', connect });
  root.AuroraLegacyBridge = facade;
  root.AuroraAcademic = facade;
})(typeof window !== 'undefined' ? window : globalThis);
