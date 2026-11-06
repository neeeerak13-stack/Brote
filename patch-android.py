#!/usr/bin/env python3
"""Ajusta el proyecto Android que genera Capacitor:
 1) enlace profundo com.broteapp.estudio://oauth (regreso del inicio de sesión de Google)
 2) usa la clave original si está disponible; de lo contrario deja la firma debug de Android
 3) versionCode = número de ejecución en GitHub"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'android/app/src/main/AndroidManifest.xml')
GRADLE = os.path.join(ROOT, 'android/app/build.gradle')
BUILD = os.environ.get('BUILD_NUMBER', '1')
KEYSTORE = os.path.join(ROOT, 'keystore', 'brote.keystore')

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
if os.path.isfile(KEYSTORE) and 'brote.keystore' not in g:
    sign = '''android {
    signingConfigs {
        debug {
            storeFile file("$rootDir/../keystore/brote.keystore")
            storePassword System.getenv("AURORA_KEYSTORE_PASSWORD") ?: ""
            keyAlias System.getenv("AURORA_KEY_ALIAS") ?: ""
            keyPassword System.getenv("AURORA_KEY_PASSWORD") ?: ""
            storeType "pkcs12"
        }
    }'''
    if 'android {' not in g: fail('No encontré el bloque android { en build.gradle')
    g = g.replace('android {', sign, 1)
elif not os.path.isfile(KEYSTORE):
    print('AVISO: no hay keystore original; se conserva la firma debug de Android. Este APK no podrá actualizar una instalación firmada con otra clave.')
g, n = re.subn(r'versionCode\s+\d+', 'versionCode ' + BUILD, g, count=1)
if n == 0: fail('No encontré versionCode en build.gradle')
g = re.sub(r'versionName\s+"[^"]*"', 'versionName "1.0.' + BUILD + '"', g, count=1)
open(GRADLE, 'w', encoding='utf-8').write(g)
print('Configuración Android y versión', BUILD, 'aplicadas')
