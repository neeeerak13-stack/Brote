# Aurora — aplicación académica personal

Aurora combina organización de estudio, materias, evaluaciones, seguimiento de notas, historial académico y conexiones opcionales con Google. Conserva compatibilidad con los datos de instalaciones anteriores (`brote2`) y el identificador Android `com.broteapp.estudio`; ambos nombres técnicos se mantienen deliberadamente para no perder datos ni impedir actualizaciones.

## Funciones
- Panel Orbe premium con esfera interactiva, materias, evaluaciones y notas conectado al mismo estado académico.
- Materias, temas, plan de estudio, sesiones y biblioteca.
- Notas: créditos, evaluaciones ponderadas, notas registradas, porcentaje evaluado, acumulado, porcentaje pendiente y nota necesaria para llegar a 3,0.
- PAPA estimado con definitivas e intentos históricos por separado.
- Historial: importar CSV/JSON con vista previa y detección de duplicados; exportar CSV; copia de seguridad JSON y restauración con respaldo preventivo.
- Integraciones opcionales: Drive, Classroom, Calendar y Gmail.
- Google OAuth rechaza el correo institucional `unal.edu.co`; conecta una cuenta personal.
- Datos académicos guardados localmente en el dispositivo.

## Ejecutar pruebas
Requiere Node.js:
```bash
npm test
```
Las pruebas cubren el núcleo académico, compatibilidad legacy, historial y flujo de la interfaz académica.

## Configuración Google
1. Crear un proyecto en Google Cloud y habilitar las APIs Drive, Calendar, Gmail y Classroom.
2. Configurar consentimiento OAuth externo y agregar la cuenta personal como usuario de prueba mientras la app esté en modo de prueba.
3. Crear un Client ID OAuth tipo aplicación web.
4. Registrar la URI exacta de retorno que aparece en Perfil → Conexiones.
5. En la app, abrir Perfil → Conexiones, guardar Client ID y dirección de Pages si se solicita, y conectar la cuenta personal.

`docs/config.js` viene sin Client ID. No se incluye ninguna credencial personal en el paquete.

## Android
Capacitor conserva `appId: com.broteapp.estudio`. Para actualizar una instalación existente hace falta firmar con la misma clave privada que firmó la versión instalada. El keystore anterior no está incluido en este paquete; no generes una clave nueva si necesitas actualizar esa instalación.

## Límites conocidos
- La conexión Google requiere autorización y prueba real.
- El token OAuth heredado usa flujo implícito y requiere reautorización cuando vence.
- No hay sincronización en segundo plano con la app cerrada.
- Classroom no reconcilia todas las eliminaciones/cambios de tareas.
- Gmail importa metadatos y fragmentos; no descarga todos los cuerpos de correo.
- El PAPA mostrado es una estimación local y no sustituye el PAPA oficial de la UNAL.

## Panel Orbe
Desde Inicio abre «Conoce el nuevo Orbe de Aurora». El panel premium comparte el almacenamiento académico con la aplicación principal; «Abrir todas las funciones de Aurora» regresa a la experiencia completa (biblioteca, IA, plan, historial y Google).


### Orbe inteligente v1.3.2
El panel Orbe ahora reutiliza la configuración Gemini y el estado académico existente. Incluye respuestas locales sobre el perfil y el progreso, consultas generativas con contexto académico y materiales de Biblioteca, historial local, saludos por horario, dictado y lectura de respuestas. La transferencia entre la palabra de activación y el dictado evita iniciar dos sesiones de micrófono a la vez. Consulta `docs/ESTADO-IMPLEMENTACION-AURORA.md` para los límites de compatibilidad y las pruebas externas pendientes.
