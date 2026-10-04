/* Relative URLs also work under a GitHub Pages repository subdirectory. */
const CACHE='campo-diary-offline-ad157bafce76';
const CACHE_PREFIX='campo-diary-offline-scope-'+encodeURIComponent(self.registration.scope)+'-';
const SCOPED_CACHE=CACHE_PREFIX+CACHE;
const ASSETS=['./','./index.html','./style.css','./journal.css','./design.css','./offline.css','./app.js','./journal.js','./progress.js','./sharing.js','./local.js','./backup.js','./board.js','./files.js','./pwa.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(SCOPED_CACHE).then(cache=>cache.addAll(ASSETS)))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(CACHE_PREFIX)&&key!==SCOPED_CACHE)await caches.delete(key);await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{const cache=await caches.open(SCOPED_CACHE),hit=await cache.match(event.request,{ignoreSearch:true});if(hit)return hit;if(event.request.mode==='navigate'){const page=await cache.match(new URL('index.html',self.registration.scope));if(page)return page}return fetch(event.request)})());
});
self.addEventListener('message',event=>{if(event.data==='CHECK_OFFLINE')event.waitUntil((async()=>{
 const cache=await caches.open(SCOPED_CACHE);let entries=await Promise.all(ASSETS.map(path=>cache.match(new URL(path,self.registration.scope))));
 if(!entries.every(Boolean)){
  // Repair evicted resources only if the server still serves this exact release.
  // A newer release must be installed as a whole by a new worker.
  try{const response=await fetch(new URL('sw.js',self.registration.scope),{cache:'no-store'});if(response.ok&&(await response.text()).includes("const CACHE='"+CACHE+"';")){await cache.addAll(ASSETS);entries=await Promise.all(ASSETS.map(path=>cache.match(new URL(path,self.registration.scope))))}}catch{}
 }
 event.ports[0]?.postMessage(entries.every(Boolean)?'OFFLINE_READY':'OFFLINE_INCOMPLETE');
})())});
