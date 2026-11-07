import test from 'node:test';
import assert from 'node:assert/strict';
import { installCloseGuard } from '../app/public/ui/close-guard.mjs';
import { createGoogleUI } from '../app/public/ui/google.mjs';

function target(){
  const handlers=new Map();return {
    addEventListener(type,handler){handlers.set(type,handler);},
    removeEventListener(type,handler){if(handlers.get(type)===handler)handlers.delete(type);},
    close(){const event={prevented:false,returnValue:undefined,preventDefault(){this.prevented=true;}};handlers.get('beforeunload')?.(event);return event;},
  };
}
test('closing or reloading a live tab requests the native confirmation without starting any synchronization',()=>{
  const window=target();installCloseGuard(window);
  for(let i=0;i<2;i++){const event=window.close();assert.equal(event.prevented,true);assert.equal(event.returnValue,true);}
});
test('approved OAuth navigation bypasses one confirmation and a later close is protected again',()=>{
  const window=target(),guard=installCloseGuard(window);guard.approveNavigation();assert.equal(window.close().prevented,false);assert.equal(window.close().prevented,true);
});
test('intentional application shutdown disables the tab warning only after the server confirms success',async()=>{
  const window=target(),guard=installCloseGuard(window),main={innerHTML:''};let fails=true,disposed=0;
  const google=createGoogleUI({
    $:()=>main,closeGuard:guard,api:async()=>{if(fails)throw Error('No se pudo cerrar');},
    disposeCalendar:()=>disposed++,empty:()=>'<p>Cerrada</p>',toast:()=>{},
  });
  await assert.rejects(google.shutdownLocalApp(),/No se pudo cerrar/);assert.equal(window.close().prevented,true);assert.equal(disposed,0);
  fails=false;await google.shutdownLocalApp();assert.equal(window.close().prevented,false);assert.equal(disposed,1);assert.match(main.innerHTML,/Cerrada/);
});
