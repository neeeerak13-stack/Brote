# Cambios

## 1.4.0
- Nueva interfaz Orbe (aprobada) conectada al motor académico, la biblioteca, el plan, los niveles y el asistente.
- Voz femenina natural con Gemini TTS, emociones, respaldo con voz del dispositivo y dictado por grabación para la app instalada.
- Corrección: materias creadas desde el Orbe rompían la app completa (faltaban `topics`, `sources`, `color`).
- La app completa entra por el Orbe y se abre con `index.html?full=1`; enlaces profundos `?go=conex|perfil|biblio|plan|notas|inicio`.
- Permiso de micrófono en el parche de Android.
- Se eliminó la carpeta duplicada `js/` (desactualizada); la única copia está en `docs/js`.
- Migración automática desde los prototipos anteriores (`brote_app`, `brote_data`).
- Pruebas nuevas: asistente (36), estructura de la interfaz (69) y navegador real (47).

## 1.3.2
- Corrección del dictado: «Hablemos, Aurora» espera a que termine la sesión de reconocimiento.
