// The private HTML/photo remain on this computer. Only authenticated ciphertext is published.
// Run: node scripts/seal-memory.mjs <private-html> <photo>; provide the passphrase on stdin.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createInterface} from 'node:readline';
const [source,photo]=process.argv.slice(2);
if(!source||!photo)throw new Error('Expected private HTML and photo paths');
process.stdout.write('Ready for passphrase on stdin\n');
const lines=createInterface({input:process.stdin,terminal:false});
const password=await new Promise(resolve=>lines.once('line',resolve));lines.close();
if(typeof password!=='string'||password.length<12)throw new Error('Passphrase too short');
const image=await readFile(photo);
const mime=image[0]===0xff&&image[1]===0xd8?'image/jpeg':'image/png';
const html=(await readFile(source,'utf8')).replaceAll('__MEMORY_PHOTO__',`data:${mime};base64,${image.toString('base64')}`);
if(!html.includes('data:'+mime))throw new Error('Photo placeholder missing');
const salt=webcrypto.getRandomValues(new Uint8Array(16)),iv=webcrypto.getRandomValues(new Uint8Array(12));
const material=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
const iterations=310000;
const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt']);
const data=await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,gzipSync(Buffer.from(html)));
const b64=value=>Buffer.from(value).toString('base64');
await mkdir('public/assets',{recursive:true});
await writeFile('public/assets/quiet-moment.enc.json',JSON.stringify({version:1,iterations,salt:b64(salt),iv:b64(iv),data:b64(data)})+'\n');
console.log('Encrypted bundle written. Plaintext and photo were not copied to public.');
