# Brote · Mi profe

Tu app de estudio. Este repositorio **construye solo el APK** en los servidores gratis de GitHub y además publica la app como página web.
No necesitas instalar nada en tu computador.

---

## PARTE 1 · Subir esto a GitHub y obtener tu APK

### 1. Crea el repositorio
1. Entra a **github.com** e inicia sesión (o crea una cuenta gratis).
2. Toca **+ › New repository**.
3. Nombre: `brote` (puedes usar otro, pero apúntalo).
4. Elige **Public** (necesario para que la página gratis funcione).
5. Toca **Create repository**.

### 2. Sube los archivos
1. Descomprime el ZIP que te di.
2. En tu repositorio toca **Add file › Upload files**.
3. Arrastra **todo el contenido de la carpeta** (las carpetas `docs`, `assets`, `scripts`, `keystore`, `.github` y los archivos `package.json`, `capacitor.config.json`, `README.md`, `.gitignore`).
4. Abajo toca **Commit changes**.

> **Si la carpeta oculta `.github` no se sube** (pasa en algunos computadores): en el repositorio toca **Add file › Create new file**, escribe como nombre `.github/workflows/build.yml` (al escribir `/` se crean las carpetas), pega ahí el contenido del archivo `build.yml` que viene en el ZIP y toca **Commit changes**.

### 3. Activa la página web (una sola vez)
1. En el repositorio entra a **Settings › Pages**.
2. En **Source** elige **GitHub Actions**.

### 4. Construye el APK
1. Entra a la pestaña **Actions**.
2. Toca **Construir Brote** y luego **Run workflow › Run workflow**.
   (También se construye solo cada vez que subes un cambio.)
3. Espera unos 8 a 12 minutos. Cuando salga una palomita verde ya está.
   Si sale una X roja, toca el paso que falló, copia el mensaje y mándamelo.

### 5. Descarga e instala el APK
1. En el repositorio entra a **Releases** (columna derecha, o en la pestaña de código).
2. Abre la última versión y descarga **Brote.apk** desde tu celular Android.
3. Ábrelo. Android pedirá permiso para **instalar apps de esta fuente**: acéptalo.
4. Listo. Cada versión nueva se instala **encima** de la anterior y **no pierdes tus datos**.

Tu página web queda en: `https://TU-USUARIO.github.io/brote/` (también sirve para instalarla desde Chrome con «Añadir a pantalla de inicio»).

---

## PARTE 2 · Conectar Brote con Google (Drive, Classroom, Calendar, Gmail)

Esto se hace una sola vez. Es gratis.

1. Entra a **console.cloud.google.com** y crea un proyecto.
2. **APIs y servicios › Biblioteca**: activa **Google Drive API**, **Google Calendar API**, **Gmail API**, **Google Classroom API** y, si quieres videos dentro de la app, **YouTube Data API v3**.
3. **APIs y servicios › Pantalla de consentimiento de OAuth**: elige **Externo**, completa nombre y correo, déjala en **Prueba** y en **Usuarios de prueba** agrega tu correo de Google.
4. **Credenciales › Crear credenciales › ID de cliente de OAuth**: tipo **Aplicación web**.
5. En **URI de redireccionamiento autorizados** pega esta dirección (cambia TU-USUARIO y el nombre del repositorio):
   `https://TU-USUARIO.github.io/brote/oauth.html`
6. Copia el **Client ID** que te da Google.
7. Dos opciones para ponerlo:
   - **En la app:** Perfil › Conexiones con Google › pega el Client ID › Guardar. (La app te muestra la dirección exacta de redirección.)
   - **En GitHub (queda fijo en cada versión):** Settings › Secrets and variables › Actions › pestaña **Variables** › **New repository variable**, nombre `GOOGLE_CLIENT_ID`, valor tu Client ID. Luego ejecuta **Run workflow** otra vez.
8. En la app toca **Conectar con Google**. Se abre el navegador, eliges tu cuenta y aceptas.
   Google dirá **«Google no verificó esta aplicación»**: es normal porque es solo tuya. Toca **Configuración avanzada › Ir a Brote**.
9. Vuelves a la app automáticamente. La conexión dura cerca de una hora; después solo tocas **Conectar** de nuevo.

## PARTE 3 · La IA de Brote (Gemini)
1. Entra a **aistudio.google.com**, toca **Get API key** y crea una llave gratis.
2. En la app: Perfil › Ajustes › pega la llave › **Probar conexión**.

---

## Problemas frecuentes
- **«redirect_uri_mismatch» en Google:** la dirección del paso 5 no coincide exactamente. Cópiala desde Conexiones en la app y pégala en Google.
- **«Acceso bloqueado / no verificada»:** falta agregar tu correo como usuario de prueba (paso 3).
- **«Google negó el permiso o la API no está activada»:** activa esa API en el paso 2.
- **Después de elegir tu cuenta no vuelves a la app:** en la página que dice «Conectando con Brote» toca el botón **Abrir Brote**.
- **«App no instalada»:** desinstala la versión anterior una sola vez (se borrarían los datos) y vuelve a instalar. Después se actualizará sin problema.
- **La fuente de letra se ve distinta sin internet:** es normal; con internet carga la fuente Baloo 2.

## Para quien edite el código
- La app completa está en `docs/index.html` (un solo archivo).
- `capacitor.config.json`: nombre e identificador de la app (`com.broteapp.estudio`).
- `scripts/patch-android.py`: agrega el enlace de regreso de Google y la firma fija.
- `keystore/brote.keystore`: firma de la app. Es una llave de uso personal; como el repositorio es público, no la uses para publicar en Google Play.
