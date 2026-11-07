// A tab-close dialog is owned by the browser. No request or Google write is
// started here: the page cannot reliably finish asynchronous work on unload.
export function installCloseGuard(target) {
  let active=true,approvedNavigation=false;
  const beforeUnload=event=>{
    if(!active)return;
    if(approvedNavigation){approvedNavigation=false;return;}
    event.preventDefault();
    event.returnValue=true;
  };
  target.addEventListener('beforeunload',beforeUnload);
  return {
    approveNavigation(){approvedNavigation=true;},
    disable(){active=false;target.removeEventListener('beforeunload',beforeUnload);},
  };
}
