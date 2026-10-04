#!/usr/bin/env python3
"""Ajusta el proyecto Android que genera Capacitor:
 1) enlace profundo com.broteapp.estudio://oauth (regreso del inicio de sesión de Google)
 2) firma fija con keystore/brote.keystore (para poder actualizar sin perder datos)
 3) versionCode = número de ejecución en GitHub (cada APK nuevo se instala encima del anterior)"""
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

g = open(GRADLE, encoding='utf-8').read()
if 'brote.keystore' not in g:
    sign = '''android {
    signingConfigs {
        debug {
            storeFile file("$rootDir/../keystore/brote.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
            storeType "pkcs12"
        }
    }'''
    if 'android {' not in g: fail('No encontré el bloque android { en build.gradle')
    g = g.replace('android {', sign, 1)
g, n = re.subn(r'versionCode\s+\d+', 'versionCode ' + BUILD, g, count=1)
if n == 0: fail('No encontré versionCode en build.gradle')
g = re.sub(r'versionName\s+"[^"]*"', 'versionName "1.0.' + BUILD + '"', g, count=1)
open(GRADLE, 'w', encoding='utf-8').write(g)
print('Firma fija y versión', BUILD, 'aplicadas')
