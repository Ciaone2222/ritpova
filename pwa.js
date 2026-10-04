let offlineReady=false,installPrompt=null,offlineCheckRunning=false,offlineFailure='';
function offlineStatus(){const label=$('#offline-status');if(label)label.textContent=offlineReady?'Pronta offline':offlineFailure||(navigator.onLine?'Preparazione offline…':'Offline non ancora verificato')}
function waitForOfflineWorker(){return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Offline non pronto: riprova con Internet')),15000);navigator.serviceWorker.ready.then(registration=>{clearTimeout(timeout);resolve(registration)},error=>{clearTimeout(timeout);reject(error)})})}
function checkOffline(worker){return new Promise((resolve,reject)=>{if(!worker)return reject(Error('Offline non pronto: riprova con Internet'));const channel=new MessageChannel(),timeout=setTimeout(()=>{channel.port1.close();reject(Error('Controllo offline non riuscito: riprova con Internet'))},15000);channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data==='OFFLINE_READY')};worker.postMessage('CHECK_OFFLINE',[channel.port2])})}
function watchUpdate(registration){
 const notify=()=>toast('Aggiornamento pronto. Chiudi tutte le finestre dell’app e riaprila per applicarlo.');
 if(registration.waiting)notify();
 const watch=incoming=>incoming?.addEventListener('statechange',()=>{if(incoming.state==='installed'&&navigator.serviceWorker.controller)notify()});
 watch(registration.installing);registration.addEventListener('updatefound',()=>watch(registration.installing));
}
async function prepareOffline(){
 if(offlineCheckRunning)return;offlineCheckRunning=true;offlineFailure='';offlineStatus();
 if(!('serviceWorker' in navigator)||!window.isSecureContext){offlineFailure='Per l’uso offline apri il link HTTPS';offlineStatus();offlineCheckRunning=false;return}
 try{const registration=await navigator.serviceWorker.register('./sw.js');watchUpdate(registration);const ready=await waitForOfflineWorker();offlineReady=await checkOffline(navigator.serviceWorker.controller||ready.active);if(!offlineReady)offlineFailure='Offline incompleto: riprova con Internet'}
 catch(e){offlineReady=false;offlineFailure='Offline non pronto: riprova con Internet'}
 finally{offlineCheckRunning=false;offlineStatus()}
}
window.addEventListener('online',()=>{if(!offlineReady)prepareOffline();else offlineStatus()});window.addEventListener('offline',offlineStatus);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
document.addEventListener('click',async e=>{
 if(e.target.closest('[data-action="offline-retry"]')){await prepareOffline();return}
 if(!e.target.closest('[data-action="install-help"]')||busy)return;
 if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return}
 modal('Installa sul telefono','<p><strong>iPhone:</strong> apri il link in Safari, tocca Condividi, poi “Aggiungi alla schermata Home”.</p><p><strong>Android:</strong> apri il menu del browser e scegli “Installa app” o “Aggiungi alla schermata Home”.</p><p>Apri la nuova icona con Internet e aspetta “Pronta offline”. Da quel momento puoi usare il diario anche senza connessione. Per passare dal browser all’icona, se il diario appare vuoto, importa il tuo backup.</p>')
});
startDiary();prepareOffline();
