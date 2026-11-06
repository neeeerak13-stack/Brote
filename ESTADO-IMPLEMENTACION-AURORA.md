# Estado de implementación · versión 1.4.0

La interfaz Orbe aprobada es la pantalla principal y está conectada al motor académico, la biblioteca, el planificador, los niveles y el asistente con voz. La app completa (`index.html?full=1`) conserva Google, quices y niveles de estudio. Ver README.md y CHANGELOG.md.

Pendiente de verificación en dispositivo real: voz natural con la llave de Gemini, APK en Android, Client ID de Google.

---

# Estado de entrega — Aurora

## Funciones integradas en la aplicación principal
- Interfaz principal responsive/PWA en `docs/index.html`.
- Almacenamiento persistente compatible con la instalación anterior: `localStorage.brote2`.
- Núcleo académico, adaptador, servicios y puente conectados al estado real de la app.
- Nueva sección **Notas y PAPA** en la navegación principal.
- Crear, editar y eliminar evaluaciones; registrar y corregir notas; editar nombre, porcentaje y fecha.
- Editar créditos de cada asignatura.
- Cálculo de acumulado, porcentaje evaluado, promedio actual, porcentaje pendiente, nota necesaria para alcanzar 3,0 y estado de riesgo.
- PAPA estimado ponderado por créditos con intentos históricos separados; aviso visible de que no reemplaza el PAPA oficial.
- Exportar historial CSV, exportar copia completa JSON sin llaves privadas, importar CSV/JSON con vista previa y deduplicación, y restaurar copia JSON con respaldo preventivo.
- Historial por semestres, importador existente y funciones originales de estudio conservadas.

## Google y cuenta
- Se conservan Drive, Classroom, Calendar y Gmail.
- OAuth general de Google se mantiene, pero ahora solicita `openid/email`, verifica la cuenta y rechaza dominios `unal.edu.co` y subdominios institucionales.
- Las credenciales personales de Google deben configurarse en Perfil > Conexiones; el Client ID inicial en `docs/config.js` está vacío.
- El token Google antiguo se vuelve a verificar con el nuevo permiso de correo; si no tiene ese permiso, hay que volver a autorizar.

## Identidad y compatibilidad
- Android `appId`: `com.broteapp.estudio` (se conserva deliberadamente para permitir actualizaciones de instalaciones existentes).
- Almacenamiento legacy: `brote2` (se conserva deliberadamente para migrar datos de versiones anteriores).
- La referencia Premium original se conserva fuera de la carpeta publicada en `design-reference/`.

## Pruebas locales
- `npm test`: suites legacy bridge, integración académica y flujo de interfaz académica aprobadas.
- `node --check` sobre todos los archivos JavaScript y scripts inline de la página principal.
- Comprobaciones estáticas de conexión del núcleo, API y OAuth.

## Pendiente externo
- `docs/config.js` contiene `clientId` vacío: se necesita el Client ID de Google Cloud y registrar la URI exacta que muestra la app.
- Probar autorización real y los permisos con una cuenta Google personal.
- No hay repositorio GitHub accesible conectado en esta sesión; no se ha publicado Pages ni ejecutado el workflow remoto.
- No se ha instalado en un Android físico.
- El paquete no contiene el keystore de firma anterior. Para generar una actualización instalable sobre la app existente se necesita recuperar la clave original; no se genera otra porque rompería la compatibilidad de firma.
- Classroom no reconcilia todos los cambios/eliminaciones de actividades; Gmail usa metadatos y fragmentos; la sincronización Calendar solo corre mientras la app está abierta/visible.
- El PAPA es una estimación local, no sustituye el registro oficial UNAL.

## Compatibilidad heredada
- La marca visible y el nombre del paquete son Aurora. Se mantienen `brote2`, `brote_g`, la base IndexedDB `brote` y el esquema Android `com.broteapp.estudio` únicamente como identificadores técnicos de migración/actualización; renombrarlos rompería datos locales, OAuth de instalaciones previas o la actualización firmada.
- No existe una opción de inicio de sesión institucional UNAL. La conexión Google personal sigue siendo opcional; la exportación local CSV/JSON no depende de iniciar sesión.

## Identidad visual
- El icono del lanzador Android y los iconos PWA de 192/512 px usan la imagen de orbe azul entregada para Aurora.
- La interfaz premium enviada se conserva en `design-reference/aurora-premium-reference.html` como referencia de integración; la interfaz publicada actual sigue en `docs/index.html` y no se ha sustituido a ciegas para no perder los flujos existentes.


## Integración del panel Orbe (v1.2.0)
- Se agregó `docs/orbe.html` a partir de la interfaz premium enviada, conservando su estructura visual y animaciones.
- El panel usa `AuroraLegacyBridge` y los mismos datos `brote2` que la aplicación principal; no crea una base de datos paralela.
- Crear materias, crear evaluaciones, actualizar notas, eliminar evaluaciones y eliminar materias operan sobre el mismo estado académico.
- El botón «Abrir todas las funciones de Aurora» vuelve a `index.html`, donde permanecen biblioteca, IA, plan, historial y conexiones Google.
- La página principal incorpora un acceso discreto al panel Orbe; el service worker actualiza su caché e incluye los módulos académicos.
- La migración desde `brote_app` es no destructiva y solo se intenta si el estado principal no tiene materias. La clave antigua no se elimina.
- El chat del panel Orbe es una ayuda contextual local; la IA con fuentes y las integraciones Google permanecen en la aplicación completa.
- Pruebas de regresión v1.2.0: 87 aserciones de lógica/contrato y sintaxis JavaScript/JSON aprobadas. No se pudo ejecutar una prueba de navegador en esta sesión por el bloqueo del entorno al abrir páginas locales; no se declara validación visual en dispositivo físico.
- El chat de texto del panel Orbe no suplanta la IA: informa cómo abrir el módulo completo. La IA basada en fuentes, Google y biblioteca permanecen en `index.html`.


## Integración del Orbe inteligente (v1.3.0)
- El Orbe conserva el protagonismo y queda en la pestaña central; Materias queda a la izquierda y Análisis a la derecha. Se conserva la navegación de tres pestañas y no se sustituye el diseño principal.
- Se reemplazó el chat demostrativo por un asistente conversacional que usa la llave de Gemini ya configurada en Perfil > Ajustes, el estado académico compartido, materias, evaluaciones, créditos, notas, temas y materiales activos de Biblioteca.
- Los archivos de Biblioteca almacenados en IndexedDB se adjuntan a la consulta cuando el navegador puede recuperarlos; se aplica un límite preventivo de tamaño y se informa si no se pueden recuperar.
- El PAPA que Aurora comunica se obtiene del motor académico compartido (definitivas e historial), no de promedios parciales; se identifica como estimación local.
- Se añade historial conversacional local acotado (últimos 24 mensajes), saludos variables por franja horaria y selección del nombre guardado en el perfil.
- Se añade lectura de respuestas con SpeechSynthesis, dictado por botón con SpeechRecognition y escucha opcional de la frase «Hablemos, Aurora» mientras la página permanece abierta.
- La voz femenina-suave es una preferencia heurística de voces españolas instaladas en el dispositivo; la voz concreta depende del sistema operativo/navegador.
- El reconocimiento de voz y la escucha por frase requieren navegador compatible, permiso de micrófono y que el Orbe permanezca abierto. No equivalen todavía a una sesión de audio full-duplex de baja latencia tipo Gemini Live; eso requiere integración específica de streaming de audio y gestión segura de sesión.
- La llave Gemini existente se reutiliza desde el almacenamiento local actual. Para producción con usuarios externos se recomienda mover las llamadas IA a un backend/proxy seguro para no exponer llaves en el cliente.
- Pruebas: suites anteriores conservadas; se añadieron pruebas del asistente, saludo, ventanas horarias, soporte de voz, adjuntos de Biblioteca y uso del PAPA compartido. La validación de navegador/dispositivo físico y la prueba real contra la llave Gemini requieren ejecutarse en el entorno de Karen.


## Auditoría y correcciones v1.3.1 (2026-11-03)
- Se fijó `America/Bogota` para saludos por franja horaria y respuestas de fecha/hora, independientemente de la zona configurada en el dispositivo.
- Se corrigió la lectura de archivos de Biblioteca para no abrir IndexedDB forzando una versión antigua; la conexión se cierra al completar la lectura.
- Se reforzó el prompt para tratar documentos adjuntos como fuentes de datos no confiables y evitar que instrucciones incrustadas cambien el rol o las reglas de Aurora.
- Se sincronizó `aurora-academic-services.js` entre el código de desarrollo y el publicado: el archivo publicado estaba desfasado y no contemplaba eliminar evaluaciones heredadas sin ID; ahora conserva la corrección ya cubierta por la regresión.
- Se actualizó la versión de caché del service worker para que las instalaciones web reciban los módulos corregidos.
- Verificación local: `npm test` aprobado (todas las suites); `node --check` aprobado para módulos JavaScript. La validación real de micrófono, voz sintetizada, permisos, Gemini y conexiones Google sigue dependiendo de un navegador/dispositivo con permisos, red y credenciales configuradas; no se declara como probada aquí.


## Corrección de voz v1.3.2 (2026-11-03)
- Se corrigió el cambio de la palabra de activación a dictado: Aurora espera el evento `onend` del reconocimiento antes de iniciar la siguiente sesión, evitando el error `InvalidStateError` por intentar abrir dos sesiones de micrófono simultáneas.
- Los errores terminales de permiso, captura de audio y lenguaje detienen la escucha continua y actualizan el estado del control; ya no se intenta reiniciar indefinidamente un micrófono denegado.
- Se agregó una prueba automatizada que simula el reconocimiento, la frase «Hablemos, Aurora» y el traspaso a dictado.
- `npm test`: 109 aserciones aprobadas en las cinco suites. El micrófono físico, la voz instalada en Android y la conectividad real con Gemini/Google siguen requiriendo una prueba en el dispositivo y credenciales válidas.
