const CO=require('./logic.js');const fs=require('fs');
const R=CO.parseRoutes(require('./routes.js'));
const assert=require('assert');
// jede Standardroute muss sich selbst bestehen
let n=0;for(const s in R){assert(CO.evaluate(+s,R[s]).ok,s);n++;}
// Bull zählt 50, S25 zählt 25
assert.equal(CO.dartValue({m:'D',n:25}),50);assert.equal(CO.dartValue({m:'S',n:25}),25);
// Fehlerfälle
assert(!CO.evaluate(40,[{m:'S',n:20},{m:'S',n:20}]).ok);       // letzter Dart kein Double
assert(!CO.evaluate(40,[{m:'D',n:19}]).ok);                    // falsche Summe
assert(!CO.evaluate(40,[]).ok);
assert(CO.evaluate(40,[{m:'S',n:20},{m:'S',n:10},{m:'D',n:5}]).ok); // 20+10+10 = 40, anderer Weg
assert(CO.evaluate(41,[{m:'S',n:25},{m:'S',n:16}]).ok===false);
assert(CO.evaluate(41,[{m:'S',n:25},{m:'D',n:8}]).ok);        // 25+16
assert(!CO.evaluate(2,[{m:'S',n:1},{m:'S',n:1}]).ok);
// Boxen
assert.equal(CO.nextBox(0,true,false),2);assert.equal(CO.nextBox(0,true,true),1);
assert.equal(CO.nextBox(5,true,false),5);assert.equal(CO.nextBox(4,false,false),1);
// Auswahl: nie direkt wiederholen, gewichtet
const pool=CO.pool(R,41,60);assert.equal(pool.length,20);
let prev=null,cnt={};const boxes={};pool.forEach((s,i)=>boxes[s]=i<10?1:5);
for(let i=0;i<20000;i++){const p=CO.pick(pool,boxes,prev,Math.random);assert(p!==prev);prev=p;cnt[p]=(cnt[p]||0)+1;}
const low=pool.slice(0,10).reduce((a,s)=>a+cnt[s],0),high=pool.slice(10).reduce((a,s)=>a+cnt[s],0);
console.log('Routen',n,'ok | Box1:Box5 Häufigkeit ≈',(low/high).toFixed(1),'(Soll ≈ 8)');
assert(low/high>5&&low/high<11);

// ---------- Antwort-Log ----------
const D=(m,n)=>({m,n});
const day1=new Date(2026,9,26,21,0).getTime(), day2=new Date(2026,9,27,0,5).getTime(); // 21:00 und kurz nach Mitternacht
const e=(t,score,ok,tipp)=>CO.makeEntry(t,score,ok,tipp,[D('T',20),D('D',20)]);
const ent=CO.makeEntry(day1,100,true,false,[D('T',20),D('D',20)]);
assert.deepEqual(ent,{t:day1,score:100,richtig:true,tipp:false,darts:['T20','D20']});
assert(CO.makeEntry(day1,169,true,false,[],true).nc);
// Boxen aus dem Log = dieselben Regeln wie nextBox
let log=[e(day1,50,true,false),e(day1+1,50,true,false),e(day1+2,60,true,true),e(day1+3,70,false,false)];
assert.deepEqual(CO.deriveBoxes(log),{50:3,60:1,70:1});
// Reset-Marker: Boxen neu, Serie und Tageszähler bleiben
const withReset=log.concat([{t:day1+4,reset:true},e(day1+5,50,true,false)]);
assert.deepEqual(CO.deriveBoxes(withReset),{50:2});
// Tageszähler pro Kalendertag, Serie tagesübergreifend
log=[e(day1,41,false,false),e(day1+1,42,true,false),e(day1+2,43,true,true),e(day2,44,true,false)];
assert.deepEqual(CO.stats(log,day1+10),{n:3,ok:2,streak:3});
assert.deepEqual(CO.stats(log,day2+10),{n:1,ok:1,streak:3});
assert.deepEqual(CO.stats(log.concat([{t:day2+1,reset:true}]),day2+10),{n:1,ok:1,streak:3});
assert.deepEqual(CO.stats(log.concat([e(day2+2,45,false,false)]),day2+10),{n:2,ok:1,streak:0});
assert.deepEqual(CO.stats([],day2),{n:0,ok:0,streak:0});
// Zusammenführen: Duplikate weg, sortiert
const a=[e(3,50,true,false),e(1,40,true,false)], b=[e(1,40,true,false),e(2,60,false,false),{t:3,reset:true}];
assert.deepEqual(CO.mergeLogs(a,b).map(x=>x.t+(x.reset?'r':'')),['1','2','3','3r']);
// Sicherung prüfen
const ok=JSON.stringify({app:'checkout-trainer',v:2,log:withReset});
assert.equal(CO.parseBackup(ok).log.length,6);
assert(CO.parseBackup('kein json').error);
assert(CO.parseBackup(JSON.stringify({app:'x',v:2,log:[]})).error);
assert(CO.parseBackup(JSON.stringify({app:'checkout-trainer',v:1,log:[]})).error);
for(const bad of [{t:1,score:1,richtig:true,tipp:false,darts:[]},{t:1,score:50,richtig:true,tipp:false,darts:['T25']},
  {t:1,score:50,richtig:true,tipp:false,darts:['S0']},{t:1,score:50,richtig:'ja',tipp:false,darts:[]},{score:50}])
  assert(CO.parseBackup(JSON.stringify({app:'checkout-trainer',v:2,log:[bad]})).error,JSON.stringify(bad));
for(const good of ['S1','S20','S25','D25','D1','T20']) assert(CO.validEntry({t:1,score:50,richtig:true,tipp:false,darts:[good]}),good);
console.log('Log-Tests ok');
console.log('alle Tests bestanden');
