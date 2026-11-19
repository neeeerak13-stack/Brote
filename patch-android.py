#!/usr/bin/env python3
"""Ajusta el proyecto Android que genera Capacitor:
 1) enlace profundo com.broteapp.estudio://oauth (regreso del inicio de sesión de Google)
 2) conserva la firma debug estándar de Android y no usa contraseñas de keystore privadas
 3) versionCode = número de ejecución en GitHub"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'android/app/src/main/AndroidManifest.xml')
GRADLE = os.path.join(ROOT, 'android/app/build.gradle')
BUILD = os.environ.get('BUILD_NUMBER', '1')

def fail(msg):
    print('ERROR:', msg); sys.exit(1)

m = open(MANIFEST, encoding='utf-8').read()
if 'android:scheme="com.broteapp.estudio"' not in m:
    link = '''
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.broteapp.estudio" android:host="oauth" />
            </intent-filter>'''
    i = m.find('</intent-filter>')
    if i < 0: fail('No encontré el intent-filter principal en AndroidManifest.xml')
    i += len('</intent-filter>')
    m = m[:i] + link + m[i:]
    open(MANIFEST, 'w', encoding='utf-8').write(m)
    print('Enlace profundo agregado')

# Permisos de micrófono: la interfaz Orbe graba la voz y la transcribe con Gemini dentro de la app instalada.
m = open(MANIFEST, encoding='utf-8').read()
perms = [('android.permission.RECORD_AUDIO', 'RECORD_AUDIO'), ('android.permission.MODIFY_AUDIO_SETTINGS', 'MODIFY_AUDIO_SETTINGS')]
changed = False
for full, short in perms:
    if full not in m:
        i = m.find('<application')
        if i < 0: fail('No encontré <application> en AndroidManifest.xml')
        m = m[:i] + '<uses-permission android:name="' + full + '" />\n    ' + m[i:]
        changed = True
if changed:
    open(MANIFEST, 'w', encoding='utf-8').write(m)
    print('Permisos de micrófono agregados')

g = open(GRADLE, encoding='utf-8').read()

# No configurar nunca brote.keystore para la variante debug. Android/AGP firma
# assembleDebug automáticamente con el debug.keystore estándar del runner.
# También limpiamos configuraciones personalizadas heredadas si existieran.
def remove_gradle_block(source, declaration):
    match = re.search(r'(?m)^\s*' + re.escape(declaration) + r'\s*\{', source)
    if not match:
        return source
    start = match.start()
    brace = source.find('{', match.start())
    depth = 0
    quote = None
    escaped = False
    for pos in range(brace, len(source)):
        ch = source[pos]
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\\\':
                escaped = True
            elif ch == quote:
                quote = None
            continue
        if ch in ('\"', "'"):
            quote = ch
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return source[:start] + source[pos + 1:]
    fail('Bloque Gradle sin cerrar: ' + declaration)

g = remove_gradle_block(g, 'signingConfigs')
g = re.sub(r'\bsigningConfig\s+signingConfigs\.[A-Za-z0-9_]+', '', g)
if 'brote.keystore' in g or 'AURORA_KEYSTORE_PASSWORD' in g or re.search(r'\bsigningConfig\s+signingConfigs\.', g):
    fail('Persistió una referencia a firma personalizada en build.gradle')

g, n = re.subn(r'versionCode\s+\d+', 'versionCode ' + BUILD, g, count=1)
if n == 0: fail('No encontré versionCode en build.gradle')
g = re.sub(r'versionName\s+"[^"]*"', 'versionName "1.0.' + BUILD + '"', g, count=1)
open(GRADLE, 'w', encoding='utf-8').write(g)
print('Configuración Android y versión', BUILD, 'aplicadas')
print('Firma debug: se usará la clave estándar de Android; keystore privado ignorado.')
