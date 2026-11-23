# Brote / Aurora — generar APK

## Corrección incluida
El workflow ahora prepara la carpeta `docs` desde los archivos fuente, copiando
`orbe.html`, `css/aurora-ui.css`, `logo-unal.png` y los 7 módulos JavaScript
que necesita la interfaz Orbe. Capacitor usa `docs` como `webDir`.

## Subir a GitHub
1. Descomprime este ZIP.
2. En tu repositorio Brote, reemplaza los archivos por el contenido de esta carpeta.
3. Conserva la carpeta `.github/workflows/main.yml` (es el único workflow).
4. Haz `Commit changes`.
5. Abre **Actions → Construir Brote → Run workflow**.
6. Espera a que `Crear el APK` termine en verde.
7. En la ejecución, abre **Artifacts → Brote-apk** y descarga `Brote.apk`.

El workflow se ejecuta al hacer push a `main` o `principal`, o manualmente.
El APK generado es debug, firmado con la clave debug estándar de Android.
Si ya tienes instalada una versión firmada con otra clave, desinstálala antes
de instalar el APK nuevo.

## Verificación automática
Antes de compilar, el workflow ejecuta las pruebas de Aurora/Orbe y valida
que los recursos de Orbe estén dentro de `android/app/src/main/assets/public`.
Después de compilar, inspecciona el APK y exige que contenga `orbe.html`,
su CSS y el módulo principal de Orbe.
