/* No ROM, filename or hash is sent through any network request. */
'use strict';
(()=>{
 const $=id=>document.getElementById(id),R=globalThis.TsuriRelease;
 const file=$('rom-file'),button=$('patch-button'),cancel=$('cancel-button'),status=$('status');
 const state={source:null,busy:false,token:0,worker:null,urls:[],assets:null};
 function clearOutput(){for(const u of state.urls)URL.revokeObjectURL(u);state.urls=[];$('result').hidden=true;for(const id of ['download-bin','download-cue'])$(id).removeAttribute('href');}
 function message(text,error=false){status.textContent=text;status.className='status'+(error?' error':'');}
 function step(current){for(const [i,id] of ['step-source','step-check','step-save'].entries())$(id).className=i<current?'done':i===current?'current':'';}
 function controls(busy){state.busy=busy;file.disabled=busy;button.disabled=busy||!state.source;cancel.hidden=!busy;}
 function stop(){if(state.worker){state.worker.terminate();state.worker=null;}controls(false);}
 function reset(){state.token++;stop();clearOutput();state.source=file.files[0]||null;$('selected-file').textContent=state.source?state.source.name+' · '+state.source.size.toLocaleString('en-US')+' ไบต์':'ยังไม่ได้เลือกไฟล์';$('progress-wrap').hidden=true;step(0);button.disabled=!state.source;message(state.source?'พร้อมตรวจสอบต้นฉบับและสร้างฉบับภาษาไทย':'เลือก BIN เพื่อเริ่มต้น ไฟล์ต้นฉบับจะไม่ถูกเขียนทับ');}
 async function getAsset(path,maxSize){const response=await fetch(path,{method:'GET',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});if(!response.ok)throw new Error('โหลดไฟล์เว็บไม่สำเร็จ ('+response.status+') กรุณาโหลดหน้าใหม่');const bytes=await response.arrayBuffer();if(bytes.byteLength>maxSize)throw new Error('ไฟล์เว็บมีขนาดผิดปกติ');return bytes;}
 async function assets(){
  if(state.assets)return state.assets;
  const [manifestBytes,patch,cueBytes]=await Promise.all([getAsset('./patches/'+R.manifest_file,128*1024),getAsset('./patches/'+R.patch_file,R.patch.size),getAsset('./patches/'+R.cue_file,128*1024)]);
  const digest=b=>new TsuriPatch.SHA256().update(new Uint8Array(b)).hexdigest();
  if(digest(manifestBytes)!==R.manifest_sha256||digest(cueBytes)!==R.cue_sha256)throw new Error('ข้อมูลรุ่นบนเว็บไม่ตรงกับแพตช์ กรุณาโหลดหน้าเว็บใหม่');
  const manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(manifestBytes));
  if(manifest.translation_version!==R.version||manifest.game.serial!==R.serial||manifest.source.sha256!==R.source.sha256||manifest.target.sha256!==R.target.sha256||manifest.patch.sha256!==R.patch.sha256)throw new Error('ข้อมูลรุ่นแพตช์ไม่ตรงกัน');
  const cue=new Blob([cueBytes],{type:'text/plain;charset=utf-8'});
  state.assets={patch,cue};return state.assets;
 }
 function progress(stage,value){
  const labels={source:'กำลังตรวจ BIN ต้นฉบับในเครื่องคุณ',apply:'กำลังแปะแพตช์ภาษาไทย',target:'กำลังตรวจ BIN ภาษาไทยก่อนดาวน์โหลด'};
  const ranges={source:[2,46],apply:[48,4],target:[52,48]};const [start,span]=ranges[stage]||[0,0];
  const p=Math.min(100,Math.max(0,Math.round(start+value*span)));$('progress').value=p;$('progress-value').textContent=p+'%';$('progress-label').textContent=labels[stage]||'กำลังเตรียมแพตช์';
 }
 file.addEventListener('change',reset);
 cancel.addEventListener('click',()=>{state.token++;stop();clearOutput();$('progress-wrap').hidden=true;step(0);message('ยกเลิกแล้ว เลือกแปะแพตช์ใหม่ได้ ไฟล์ต้นฉบับยังอยู่เหมือนเดิม');});
 button.addEventListener('click',async()=>{
  if(state.busy||!state.source)return;
  const token=++state.token;clearOutput();controls(true);step(1);$('progress-wrap').hidden=false;$('progress').value=0;$('progress-value').textContent='0%';$('progress-label').textContent='กำลังโหลดข้อมูลแพตช์';message('โปรดเก็บ BIN ต้นฉบับไว้ที่เดิมจนกว่าจะบันทึกไฟล์เสร็จ');
  try{
   if(location.protocol==='file:')throw new Error('กรุณาเปิดเครื่องมือนี้ผ่านเว็บไซต์ GitHub Pages หรือเซิร์ฟเวอร์ภายในเครื่อง ตามคู่มือ README_GITHUB_TH.txt');
   if(typeof Worker==='undefined'||typeof Blob==='undefined')throw new Error('เบราว์เซอร์นี้ไม่รองรับ Worker และ File API ที่เครื่องมือต้องใช้ กรุณาใช้เบราว์เซอร์เดสก์ท็อปรุ่นปัจจุบัน');
   const data=await assets();if(token!==state.token)return;
   const worker=new Worker('./assets/patch-worker.js');state.worker=worker;
   const failed=text=>{if(token!==state.token)return;stop();clearOutput();$('progress-wrap').hidden=true;step(0);message(text,true);};
   worker.onerror=()=>failed('เครื่องมือแปะแพตช์หยุดทำงาน กรุณาโหลดหน้าใหม่และตรวจว่าอัปโหลดไฟล์ assets ครบ หากใช้มือถือให้ลองใช้คอมพิวเตอร์');
   worker.onmessage=({data:msg})=>{
    if(token!==state.token)return;
    if(msg.kind==='progress'){progress(msg.stage,msg.value);return;}
    if(msg.kind==='error'){failed(msg.message);return;}
    if(msg.kind==='done'){
     if(!(msg.blob instanceof Blob)||msg.blob.size!==R.target.size||!msg.target||msg.target.sha256!==R.target.sha256||msg.target.crc32!==R.target.crc32){failed('ผลลัพธ์ไม่ตรงกับรุ่นที่กำหนด จึงยังไม่เปิดให้ดาวน์โหลด');return;}
     try{
      const binURL=URL.createObjectURL(msg.blob);state.urls.push(binURL);const cueURL=URL.createObjectURL(data.cue);state.urls.push(cueURL);
      $('download-bin').href=binURL;$('download-bin').download=R.target.output_filename;$('download-cue').href=cueURL;$('download-cue').download=R.cue_file;
      stop();step(2);progress('target',1);$('result').hidden=false;message('ตรวจสอบสำเร็จ ดาวน์โหลด BIN และ CUE ด้านล่างได้เลย');
     }catch(error){failed('เตรียมไฟล์ดาวน์โหลดไม่สำเร็จ: '+error.message);}
    }
   };
   const patch=data.patch.slice(0);worker.postMessage({source:state.source,patch},[patch]);
  }catch(error){if(token!==state.token)return;stop();clearOutput();$('progress-wrap').hidden=true;step(0);message(error.message,true);}
 });
 window.addEventListener('beforeunload',()=>{state.token++;if(state.worker)state.worker.terminate();clearOutput();});
 reset();
})();
