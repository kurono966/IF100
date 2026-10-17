import {spawn,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const root=process.cwd(),artifacts=path.join(root,'workdesk');mkdirSync(artifacts,{recursive:true});
const chrome=process.env.CHROME_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if(!chrome)throw Error('CHROME_PATH にChrome/Edgeの実行ファイルを指定してください。');
let server,browser,socket;const exceptions=[];let sequence=0;const pending=new Map();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,timeout=60000){const start=Date.now();while(Date.now()-start<timeout){try{const result=await fn();if(result)return result;}catch{}await pause(200);}throw Error('Browser check timed out');}
function send(method,params={}){const id=++sequence;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text);return result.result.value;}
async function screenshot(name){const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(path.join(artifacts,name),Buffer.from(result.data,'base64'));}
function assert(condition,message){if(!condition)throw Error(message);}
try{
 const {createServer}=await import('vite');
 server=await createServer({server:{host:'127.0.0.1',port:0,strictPort:true}});await server.listen();
 const port=server.httpServer.address().port,baseURL=`http://127.0.0.1:${port}/`;
 const profilePath=path.join(artifacts,'browser-profile',`check-${Date.now()}`);
 browser=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port=0',`--user-data-dir=${profilePath}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 const {readFileSync}=await import('node:fs');
 const debugPort=await until(()=>{const file=path.join(profilePath,'DevToolsActivePort');return existsSync(file)?Number(readFileSync(file,'utf8').split('\n')[0]):undefined;},15000);
 const page=await until(async()=>{const pages=await(await fetch(`http://127.0.0.1:${debugPort}/json`,{signal:AbortSignal.timeout(1500)})).json();return pages.find(p=>p.type==='page');},10000);
 socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 socket.onmessage=event=>{const result=JSON.parse(event.data);if(result.id){const waiter=pending.get(result.id);if(waiter){pending.delete(result.id);result.error?waiter.reject(Error(result.error.message)):waiter.resolve(result.result);}}if(result.method==='Runtime.exceptionThrown')exceptions.push(result.params.exceptionDetails.exception?.description||result.params.exceptionDetails.text);};
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:baseURL});await until(()=>evaluate('!!document.querySelector("#start")'));
 await evaluate('document.querySelector("#seed").value="418275";document.querySelector("#start").click()');
 await until(()=>evaluate('!!document.querySelector("#play")&&!document.querySelector("#play").disabled'));
 await until(()=>evaluate('!!document.querySelector("#map canvas")'));
 await evaluate('document.querySelector("[data-kind=migrant]").click();document.querySelector("#person-name").value="検証の陶工"');
 const rect=await evaluate('(()=>{const r=document.querySelector("#map canvas").getBoundingClientRect();return {x:r.x+r.width*10.5/16,y:r.y+r.height*2.5/16}})()');
 for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,x:rect.x,y:rect.y,button:'left',clickCount:1});
 await until(()=>evaluate('document.querySelector("#remaining").textContent.trim().startsWith("4")'));
 await screenshot('millennium-desktop.png');
 await evaluate('document.querySelector("#auto-slow").checked=false;document.querySelector("#auto-slow").dispatchEvent(new Event("change"));document.querySelector("[data-speed=100]").click();document.querySelector("#play").click()');
 await until(()=>evaluate('!!document.querySelector("#intervention-histories .history-change")'),90000);
 await screenshot('millennium-results.png');
 assert(await evaluate('document.querySelector("#intervention-histories").textContent.includes("検証の陶工")'),'Migrants missing in final chronicle');
 await evaluate('document.querySelector("#review").click();document.querySelector("#history-range").value="500";document.querySelector("#history-range").dispatchEvent(new Event("change"))');
 await until(()=>evaluate('document.querySelector("#year").textContent==="500"'));
 assert(await evaluate('document.querySelector("#play").disabled&&[...document.querySelectorAll(".tool")].every(b=>b.disabled)'),'Past view allows interventions');
 await screenshot('millennium-history.png');
 await evaluate('document.querySelector("#present").click()');assert(await evaluate('document.querySelector("#year").textContent==="1000"'),'Present was changed by historical browsing');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:baseURL});await until(()=>evaluate('!!document.querySelector("#start")'));
 await evaluate('document.querySelector("#start").click()');await until(()=>evaluate('!!document.querySelector("#play")&&!document.querySelector("#play").disabled'));
 await screenshot('millennium-mobile.png');
 assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'Mobile layout overflows horizontally');
 assert(exceptions.length===0,exceptions.join('\n'));
 console.log(JSON.stringify({ok:true,checks:['desktop title and baseline worker','migrant profile and canvas placement','1000-year playback','per-intervention results','read-only year 500 browsing','return to year 1000','390px mobile layout'],exceptions,artifacts:['millennium-desktop.png','millennium-results.png','millennium-history.png','millennium-mobile.png']},null,2));
}catch(error){if(socket)try{await screenshot('millennium-error.png');console.error('BROWSER STATE',await evaluate('document.body.innerText.slice(-3500)'));}catch{}console.error(error);process.exitCode=1;}
finally{socket?.close();if(browser?.pid)browser.kill();if(server?.close)await server.close();}
