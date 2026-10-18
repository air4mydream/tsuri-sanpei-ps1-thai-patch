/* Tsuri Thai local patch engine. Original project code; see LICENSE.txt. */
(function(root){
"use strict";
const CHUNK=4*1024*1024;
const K=new Uint32Array([
0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const hex=a=>Array.from(a,n=>n.toString(16).padStart(2,'0')).join('');
const hex32=n=>(n>>>0).toString(16).padStart(8,'0');
const utf8=s=>new TextEncoder().encode(s);
function ensure(ok,message){if(!ok)throw new Error(message);}
class SHA256 {
 constructor(){this.h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);this.w=new Uint32Array(64);this.buf=new Uint8Array(64);this.used=0;this.total=0;this.done=false;}
 block(bytes,at){
  const w=this.w,h=this.h;
  for(let i=0;i<16;i++){const j=at+i*4;w[i]=((bytes[j]<<24)|(bytes[j+1]<<16)|(bytes[j+2]<<8)|bytes[j+3])>>>0;}
  for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];const s0=((a>>>7)|(a<<25))^((a>>>18)|(a<<14))^(a>>>3);const s1=((b>>>17)|(b<<15))^((b>>>19)|(b<<13))^(b>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;}
  let a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],z=h[7];
  for(let i=0;i<64;i++){
   const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7));
   const t1=(z+s1+((e&f)^((~e)&g))+K[i]+w[i])>>>0;
   const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10));
   const t2=(s0+((a&b)^(a&c)^(b&c)))>>>0;
   z=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
  }
  h[0]=(h[0]+a)>>>0;h[1]=(h[1]+b)>>>0;h[2]=(h[2]+c)>>>0;h[3]=(h[3]+d)>>>0;
  h[4]=(h[4]+e)>>>0;h[5]=(h[5]+f)>>>0;h[6]=(h[6]+g)>>>0;h[7]=(h[7]+z)>>>0;
 }
 update(bytes){
  ensure(!this.done,'SHA-256 finalized');let at=0;this.total+=bytes.length;
  if(this.used){const n=Math.min(64-this.used,bytes.length);this.buf.set(bytes.subarray(0,n),this.used);this.used+=n;at+=n;if(this.used===64){this.block(this.buf,0);this.used=0;}}
  while(at+64<=bytes.length){this.block(bytes,at);at+=64;}
  if(at<bytes.length){this.buf.set(bytes.subarray(at),0);this.used=bytes.length-at;}return this;
 }
 digest(){
  ensure(!this.done,'SHA-256 finalized');this.done=true;let p=this.used;this.buf[p++]=0x80;
  if(p>56){this.buf.fill(0,p);this.block(this.buf,0);p=0;}
  this.buf.fill(0,p,56);const dv=new DataView(this.buf.buffer);
  dv.setUint32(56,Math.floor(this.total/0x20000000),false);dv.setUint32(60,(this.total*8)>>>0,false);this.block(this.buf,0);
  const out=new Uint8Array(32),v=new DataView(out.buffer);for(let i=0;i<8;i++)v.setUint32(i*4,this.h[i],false);return out;
 }
 hexdigest(){return hex(this.digest());}
}
const CRC_TABLE=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?(0xedb88320^(n>>>1)):(n>>>1);return n>>>0;});
class CRC32 {constructor(){this.state=0xffffffff;}update(bytes){let c=this.state;for(let i=0;i<bytes.length;i++)c=CRC_TABLE[(c^bytes[i])&255]^(c>>>8);this.state=c>>>0;return this;}value(){return (this.state^0xffffffff)>>>0;}}
async function read(blob,start,size){ensure(start>=0&&size>=0&&start+size<=blob.size,'อ่านเลยขอบเขตไฟล์');const b=new Uint8Array(await blob.slice(start,start+size).arrayBuffer());ensure(b.length===size,'อ่านไฟล์ได้ไม่ครบ กรุณาตรวจว่าไฟล์ยังอยู่และไม่ได้ถูกแก้ระหว่างทำงาน');return b;}
async function hashBlob(blob,progress=()=>{}){const s=new SHA256(),c=new CRC32();for(let at=0;at<blob.size;at+=CHUNK){const b=await read(blob,at,Math.min(CHUNK,blob.size-at));s.update(b);c.update(b);progress((at+b.length)/blob.size);}return {size:blob.size,sha256:s.hexdigest(),crc32:hex32(c.value())};}
function selfTest(){
 ensure(new SHA256().hexdigest()==='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855','SHA-256 self-test failed');
 ensure(new SHA256().update(utf8('abc')).hexdigest()==='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad','SHA-256 self-test failed');
 ensure(hex32(new CRC32().update(utf8('123456789')).value())==='cbf43926','CRC32 self-test failed');
}
class PatchReader {
 constructor(bytes,end){this.bytes=bytes;this.pos=0;this.end=end;}
 take(n){ensure(Number.isSafeInteger(n)&&n>=0&&this.pos+n<=this.end,'แพตช์ขาดหรืออ่านเลยขอบเขต');const b=this.bytes.subarray(this.pos,this.pos+n);this.pos+=n;return b;}
 number(){let value=0,shift=1;for(let i=0;i<8;i++){const b=this.take(1)[0];value+=(b&127)*shift;ensure(Number.isSafeInteger(value),'BPS integer overflow');if(b&128)return value;shift*=128;value+=shift;ensure(Number.isSafeInteger(value),'BPS integer overflow');}throw new Error('BPS integer overflow');}
}
function parsePatch(bytes,release){
 ensure(bytes.length===release.patch.size&&bytes.length>=19,'ขนาดแพตช์ไม่ถูกต้อง กรุณาโหลดหน้าเว็บใหม่');
 const sha=new SHA256().update(bytes).hexdigest();ensure(sha===release.patch.sha256,'SHA-256 ของแพตช์ไม่ตรง กรุณาโหลดหน้าเว็บใหม่');
 ensure(hex32(new CRC32().update(bytes).value())===release.patch.crc32,'CRC32 ของไฟล์แพตช์ไม่ตรง');
 const v=new DataView(bytes.buffer,bytes.byteOffset+bytes.length-12,12);
 const footer=hex32(v.getUint32(8,true));
 ensure(hex32(new CRC32().update(bytes.subarray(0,bytes.length-4)).value())===footer&&footer===release.patch.bps_footer_crc32,'BPS footer CRC32 ไม่ตรง');
 ensure(hex32(v.getUint32(0,true))===release.source.crc32&&hex32(v.getUint32(4,true))===release.target.crc32,'BPS footer ไม่ตรงกับรุ่นเกม');
 const r=new PatchReader(bytes,bytes.length-12);
 ensure(new TextDecoder().decode(r.take(4))==='BPS1','ชนิดแพตช์ไม่ใช่ BPS1');
 ensure(r.number()===release.source.size&&r.number()===release.target.size,'ขนาด BIN ใน BPS ไม่ตรงกับรุ่นเกม');
 const meta=r.number();ensure(meta<=1024*1024,'BPS metadata ใหญ่ผิดปกติ');r.take(meta);
 const actions=[];let out=0,literal=0;
 while(r.pos<r.end){
  const code=r.number(),kind=code%4,len=Math.floor(code/4)+1;
  ensure(kind===0||kind===1,'แพตช์รุ่นนี้รองรับเฉพาะ SourceRead และ TargetRead');
  ensure(out+len<=release.target.size,'BPS เขียนผลลัพธ์เกินขนาด');
  if(kind===0)ensure(out+len<=release.source.size,'BPS อ่านต้นฉบับเกินขนาด');
  const offset=kind===0?out:r.pos;
  if(kind===1){r.take(len);literal+=len;}
  actions.push({kind,len,offset});out+=len;
 }
 ensure(out===release.target.size,'BPS สร้างผลลัพธ์ได้ไม่ครบ');
 return {actions,literal_bytes:literal,target_size:out,patch_sha256:sha};
}
async function applyPatch(source,patch,release,progress=()=>{}){
 selfTest();
 ensure(source.size===release.source.size,'ขนาด BIN ไม่ตรงกับรุ่นที่รองรับ\nต้องมี '+release.source.size.toLocaleString('en-US')+' ไบต์ แต่ไฟล์นี้มี '+source.size.toLocaleString('en-US')+' ไบต์\nกรุณาเลือก BIN ต้นฉบับทั้งแผ่น ไม่ใช่ ZIP, CHD หรือไฟล์ย่อยในแผ่น');
 const plan=parsePatch(patch,release);progress('source',0);
 const actual=await hashBlob(source,p=>progress('source',p));
 if(actual.sha256===release.target.sha256)throw new Error('ไฟล์นี้เป็นฉบับไทย v'+release.version+' ที่แปะแพตช์แล้ว กรุณาเลือก BIN ภาษาญี่ปุ่นต้นฉบับ');
 ensure(actual.sha256===release.source.sha256&&actual.crc32===release.source.crc32,'BIN ไม่ตรงกับต้นฉบับที่แพตช์นี้รองรับ จึงยังไม่สร้างไฟล์ผลลัพธ์\nSHA-256 ที่อ่านได้: '+actual.sha256+'\nSHA-256 ที่รองรับ: '+release.source.sha256+'\nชื่อไฟล์ตรงกันอย่างเดียวไม่เพียงพอ ต้องใช้ข้อมูลต้นฉบับตรงรุ่น');
 progress('apply',0);const parts=[];let out=0;
 for(const a of plan.actions){
  parts.push(a.kind===0?source.slice(a.offset,a.offset+a.len):patch.subarray(a.offset,a.offset+a.len));out+=a.len;
 }
 const result=new Blob(parts,{type:'application/octet-stream'});
 ensure(result.size===release.target.size,'ขนาดผลลัพธ์ไม่ตรง');progress('apply',1);progress('target',0);
 // Re-read the assembled Blob: validate what will actually be downloaded.
 const target=await hashBlob(result,p=>progress('target',p));
 ensure(target.sha256===release.target.sha256&&target.crc32===release.target.crc32,'ตรวจผลลัพธ์ไม่ผ่าน จึงไม่เปิดให้ดาวน์โหลด กรุณาลองใหม่โดยเก็บ BIN ต้นฉบับไว้ที่เดิมตลอดการทำงาน');
 return {blob:result,source:actual,target,actions:plan.actions.length};
}
const API={SHA256,CRC32,hex32,utf8,hashBlob,selfTest,parsePatch,applyPatch};
root.TsuriPatch=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
