#!/usr/bin/env python3
"""Prepara una copia limpia y completa de la aplicación web para Pages y Capacitor."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
if DOCS.exists():
    shutil.rmtree(DOCS)
DOCS.mkdir(parents=True, exist_ok=True)

# Archivos públicos de la aplicación y sus páginas auxiliares.
for name in ('index.html', 'orbe.html', 'oauth.html', 'manifest.webmanifest', 'sw.js',
             'config.js', 'icon-192.png', 'icon-512.png', 'logo-unal.png'):
    src = ROOT / name
    if src.is_file():
        shutil.copy2(src, DOCS / name)

# Código real: index.html y orbe.html cargan estos módulos mediante rutas relativas.
js = DOCS / 'js'
js.mkdir(parents=True, exist_ok=True)
for name in ('aurora-academic-core.js', 'aurora-academic-adapter.js',
             'aurora-academic-services.js', 'aurora-history-import.js',
             'aurora-legacy-bridge.js', 'aurora-orbe-assistant.js', 'aurora-orbe-ui.js'):
    src = ROOT / name
    if not src.is_file():
        raise SystemExit(f'FALTA archivo requerido: {src}')
    shutil.copy2(src, js / name)

css = DOCS / 'css'
css.mkdir(parents=True, exist_ok=True)
shutil.copy2(ROOT / 'aurora-ui.css', css / 'aurora-ui.css')

# Recursos de Capacitor Assets, no son necesarios para ejecutar la web.
assets = ROOT / 'assets'
assets.mkdir(exist_ok=True)
for name in ('icon-only.png', 'icon-foreground.png', 'icon-background.png', 'splash.png'):
    src = ROOT / name
    if src.is_file():
        shutil.copy2(src, assets / name)

# Verificación previa: todas las referencias locales críticas deben existir.
required = [DOCS / 'index.html', DOCS / 'orbe.html', DOCS / 'oauth.html',
            DOCS / 'manifest.webmanifest', DOCS / 'sw.js', DOCS / 'config.js',
            DOCS / 'icon-192.png', DOCS / 'icon-512.png', DOCS / 'logo-unal.png',
            js / 'aurora-academic-core.js', js / 'aurora-academic-adapter.js',
            js / 'aurora-academic-services.js', js / 'aurora-history-import.js',
            js / 'aurora-legacy-bridge.js', js / 'aurora-orbe-assistant.js',
            js / 'aurora-orbe-ui.js', css / 'aurora-ui.css']
missing = [str(p.relative_to(ROOT)) for p in required if not p.is_file()]
if missing:
    raise SystemExit('Faltan archivos en docs: ' + ', '.join(missing))
print('Preparación web correcta: index, Orbe, OAuth, iconos, logo, 7 módulos JS y CSS disponibles.')
