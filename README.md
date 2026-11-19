# Aurora · tu aplicación académica

Tu app de estudio. Este repositorio **construye solo el APK** en los servidores gratis de GitHub y además publica la app como página web.
No necesitas instalar nada en tu computador.


## Novedades de la versión 1.4.0 · interfaz Orbe conectada

La interfaz aprobada (Orbe con ojos, barra de cristal, Materias y Análisis) ahora **es la pantalla principal** y trabaja con el mismo motor y los mismos datos que la app completa:

- **Materias y notas:** crea materias, evaluaciones con porcentaje, nota y fecha; edita y elimina. Todo pasa por el motor académico real (`AuroraLegacyBridge`) y se guarda en `brote2`, igual que la app completa.
- **Análisis:** PAPA estimado, promedio parcial o del semestre, materias aprobadas y en riesgo, créditos, evolución por semestre y estadísticas, calculados por el motor.
- **Biblioteca:** sube PDF, fotos, texto o enlaces de YouTube a la misma base (`IndexedDB "brote"`) que lee Aurora; cada fuente se puede activar o desactivar para sus respuestas.
- **Planificador y fechas:** pendientes propios más las fechas de tus evaluaciones y exámenes.
- **Historial:** cerrar y restaurar semestres con el motor real.
- **Retos y niveles:** nivel, XP, racha, horas e insignias salen de los datos reales.
- **Perfil:** nombre, llave de Gemini con prueba de conexión, voz de Aurora, rendimiento, y enlaces a Google, respaldo y todas las funciones.
- **Se entra directo al Orbe.** La app completa sigue en `index.html?full=1` (Google, quices, niveles de estudio) y tiene un botón «● Orbe» para volver.
- **Corrección importante:** las materias creadas desde el Orbe hacían fallar Inicio, Plan, Perfil y Recompensas de la app completa (les faltaba `topics`). Ya no pasa.

### La voz de Aurora
Aurora habla con voz de mujer **suave, cálida, amable y delicada, con emoción**:
- **Voz natural (Gemini TTS):** usa tu misma llave de Gemini. Puedes elegir el tono (Cálida, Suave, Delicada, Tranquila, Luminosa, Joven) en Perfil. Cada respuesta lleva una emoción que cambia el tono de la voz y la cara del Orbe.
- **Respaldo automático:** si la voz natural no está disponible, habla con la mejor voz femenina en español del teléfono, con tono y ritmo según la emoción.
- **Entrada por voz:** en la app instalada graba tu voz y Gemini la transcribe; en Chrome usa el reconocimiento nativo. La frase «Hablemos, Aurora» solo funciona en navegadores con reconocimiento nativo.

### Pruebas
- `npm test`: pruebas del motor, el puente y el asistente (161 comprobaciones).
- `npm run test:ui`: prueba en un navegador real (requiere `npm i -D playwright && npx playwright install chromium`).

### Lo que aún depende de ti
- Probar la voz natural con tu llave real y el APK en tu teléfono: el entorno donde se preparó esta versión no tiene internet ni Android.
- El Client ID de Google (Parte 2) y tu llave de Gemini (Parte 3).

---

## PARTE 1 · Subir esto a GitHub y obtener tu APK

### 1. Crea el repositorio
1. Entra a **github.com** e inicia sesión (o crea una cuenta gratis).
2. Toca **+ › New repository**.
3. Nombre: `aurora` (puedes usar otro, pero apúntalo).
4. Elige **Public** (necesario para que la página gratis funcione).
5. Toca **Create repository**.

### 2. Sube los archivos
1. Descomprime el ZIP que te di.
2. En tu repositorio toca **Add file › Upload files**.
3. Arrastra **todo el contenido de la carpeta** (las carpetas `docs`, `assets`, `scripts`, `tests`, `design-reference`, `.github` y los archivos `package.json`, `capacitor.config.json`, `README.md`, `.gitignore`).
4. Abajo toca **Commit changes**.

> **Si la carpeta oculta `.github` no se sube** (pasa en algunos computadores): en el repositorio toca **Add file › Create new file**, escribe como nombre `.github/workflows/build.yml` (al escribir `/` se crean las carpetas), pega ahí el contenido del archivo `build.yml` que viene en el ZIP y toca **Commit changes**.

### 3. Activa la página web (una sola vez)
1. En el repositorio entra a **Settings › Pages**.
2. En **Source** elige **GitHub Actions**.

### 4. Construye el APK
1. Entra a la pestaña **Actions**.
2. Toca **Construir Aurora** y luego **Run workflow › Run workflow**.
   (También se construye solo cada vez que subes un cambio.)
3. Espera unos 8 a 12 minutos. Cuando salga una palomita verde ya está.
   Si sale una X roja, toca el paso que falló, copia el mensaje y mándamelo.

### 5. Descarga e instala el APK
1. En el repositorio entra a **Releases** (columna derecha, o en la pestaña de código).
2. Abre la última versión y descarga **Aurora.apk** desde tu celular Android.
3. Ábrelo. Android pedirá permiso para **instalar apps de esta fuente**: acéptalo.
4. Listo. Para actualizar una instalación previa sin perder datos se necesita la misma clave de firma original. Esa clave no está incluida en este ZIP; revisa la nota de firma al final antes de reemplazar una instalación existente.

Tu página web queda en: `https://TU-USUARIO.github.io/aurora/` (también sirve para instalarla desde Chrome con «Añadir a pantalla de inicio»).

---

## PARTE 2 · Conectar Aurora con Google (Drive, Classroom, Calendar, Gmail)

Esto se hace una sola vez. Es gratis.

1. Entra a **console.cloud.google.com** y crea un proyecto.
2. **APIs y servicios › Biblioteca**: activa **Google Drive API**, **Google Calendar API**, **Gmail API**, **Google Classroom API** y, si quieres videos dentro de la app, **YouTube Data API v3**.
3. **APIs y servicios › Pantalla de consentimiento de OAuth**: elige **Externo**, completa nombre y correo, déjala en **Prueba** y en **Usuarios de prueba** agrega tu correo de Google.
4. **Credenciales › Crear credenciales › ID de cliente de OAuth**: tipo **Aplicación web**.
5. En **URI de redireccionamiento autorizados** pega esta dirección (cambia TU-USUARIO y el nombre del repositorio):
   `https://TU-USUARIO.github.io/aurora/oauth.html`
6. Copia el **Client ID** que te da Google.
7. Dos opciones para ponerlo:
   - **En la app:** Perfil › Conexiones con Google › pega el Client ID › Guardar. (La app te muestra la dirección exacta de redirección.)
   - **En GitHub (queda fijo en cada versión):** Settings › Secrets and variables › Actions › pestaña **Variables** › **New repository variable**, nombre `GOOGLE_CLIENT_ID`, valor tu Client ID. Luego ejecuta **Run workflow** otra vez.
8. En la app toca **Conectar con Google**. Se abre el navegador, eliges tu cuenta y aceptas.
   Google dirá **«Google no verificó esta aplicación»**: es normal porque es solo tuya. Toca **Configuración avanzada › Ir a Aurora**.
9. Vuelves a la app automáticamente. La conexión dura cerca de una hora; después solo tocas **Conectar** de nuevo.

## PARTE 3 · La IA de Aurora (Gemini)
1. Entra a **aistudio.google.com**, toca **Get API key** y crea una llave gratis.
2. En la app: Perfil › Ajustes › pega la llave › **Probar conexión**.

---

## Problemas frecuentes
- **«redirect_uri_mismatch» en Google:** la dirección del paso 5 no coincide exactamente. Cópiala desde Conexiones en la app y pégala en Google.
- **«Acceso bloqueado / no verificada»:** falta agregar tu correo como usuario de prueba (paso 3).
- **«Google negó el permiso o la API no está activada»:** activa esa API en el paso 2.
- **Después de elegir tu cuenta no vuelves a la app:** en la página que dice «Conectando con Aurora» toca el botón **Abrir Aurora**.
- **«App no instalada»:** desinstala la versión anterior una sola vez (se borrarían los datos) y vuelve a instalar. Después se actualizará sin problema.
- **La fuente de letra se ve distinta sin internet:** es normal; con internet carga la fuente Baloo 2.

## Para quien edite el código
- La app completa está en `docs/index.html` (un solo archivo).
- `capacitor.config.json`: nombre e identificador de la app (`com.broteapp.estudio`).
- `scripts/patch-android.py`: agrega el enlace de regreso de Google y la firma fija.
- La clave de firma original no viene incluida. El APK de prueba se firma con la clave debug que genera Android; para actualizar encima de una instalación anterior sin perder datos, necesitas recuperar y configurar la clave privada original. Si no la tienes, exporta primero tus datos y tendrás que desinstalar la versión anterior antes de instalar el nuevo APK.
