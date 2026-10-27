const fs=require('fs');
const val=t=>t==='Bull'?50:t==='DBull'?50:({S:1,D:2,T:3}[t[0]])*parseInt(t.slice(1));
const dbl=t=>t==='Bull'||t==='DBull'||t[0]==='D';
let bad=0,n=0;const seen=new Set();
for(const l of require('./routes.js').trim().split('\n')){
 const [s,...r]=l.split(' ');const sum=r.reduce((a,t)=>a+val(t),0);n++;
 if(seen.has(s))console.log('dup',s);seen.add(s);
 if(sum!==+s||!dbl(r[r.length-1])){bad++;console.log('BAD',l,'sum',sum);}
}
const missing=[];for(let i=2;i<=170;i++)if(!seen.has(String(i)))missing.push(i);
console.log('routes',n,'bad',bad,'missing',missing.join(','));
if(bad||missing.join(',')!=='159,162,163,165,166,168,169'){console.log('FEHLER');process.exitCode=1;}
