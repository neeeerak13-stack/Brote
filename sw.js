const V='aurora-v14-interfaz-orbe-conectada',SHELL=['./','index.html','orbe.html','css/aurora-ui.css','logo-unal.png','js/aurora-academic-core.js','js/aurora-academic-adapter.js','js/aurora-academic-services.js','js/aurora-history-import.js','js/aurora-legacy-bridge.js','js/aurora-orbe-assistant.js','js/aurora-orbe-ui.js','manifest.webmanifest','icon-192.png','icon-512.png','config.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))))});
