/* File bytes stay inside this local Worker. No network API is used here. */
'use strict';
importScripts('release.js','patch-core.js');
self.onmessage=async ({data})=>{
 try{
  const result=await TsuriPatch.applyPatch(data.source,new Uint8Array(data.patch),TsuriRelease,(stage,value)=>self.postMessage({kind:'progress',stage,value}));
  self.postMessage({kind:'done',...result});
 }catch(error){self.postMessage({kind:'error',message:error.message||String(error)});}
};
