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
// Versionsfeld wird nicht als Text übernommen
assert(!/</.test(CO.parseBackup(JSON.stringify({app:'checkout-trainer',v:'<b>x</b>',log:[]})).error));
assert.equal(CO.esc('<img src=x onerror="a">&\''),'&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
// Gespeicherten Stand lesen
assert.deepEqual(CO.parseStored(null),{log:[],range:null,lastBackup:0,snoozeUntil:0,problem:null});
assert.equal(CO.parseStored(JSON.stringify({v:2,log:[],lastBackup:123,snoozeUntil:'x'})).lastBackup,123);
assert.equal(CO.parseStored(JSON.stringify({v:2,log:[],lastBackup:123,snoozeUntil:'x'})).snoozeUntil,0);
assert.equal(CO.parseStored('{kaputt').problem,'unlesbar');
assert.equal(CO.parseStored('{"v":2}').problem,'unlesbar');
const st2=CO.parseStored(JSON.stringify({v:2,range:'41-60',log:[ent,{t:5,score:1}]}));
assert.equal(st2.log.length,1);assert.equal(st2.problem,'1 Einträge unlesbar');assert.equal(st2.range,'41-60');
assert.equal(CO.parseStored(JSON.stringify({v:2,range:1,log:[ent]})).problem,null);
// Zwei Fenster: jedes kennt nur seine Einträge, Zusammenführen verliert nichts
const tabA=[e(10,50,true,false),e(12,51,true,false)], tabB=[e(10,50,true,false),e(11,52,false,false)];
assert.equal(CO.mergeLogs(tabA,tabB).length,3);
console.log('Log-Tests ok');

// ---------- Erinnerung an die Sicherung ----------
const DAY=864e5, now=new Date(2026,9,27,20,0).getTime();
const many=(n,start,step)=>Array.from({length:n},(_,i)=>e(start+i*step,50,true,false));
let bs=CO.backupStatus(many(49,now-DAY,1000),0,0,now);
assert.deepEqual(bs,{due:false,days:null,fresh:49});                        // nie gesichert, aber zu wenig Antworten
assert.equal(CO.backupStatus(many(50,now-DAY,1000),0,0,now).due,true);       // nie gesichert, 50 Antworten
const last=now-14*DAY;
assert.equal(CO.backupStatus(many(60,last+1000,1000),last,0,now).due,true);  // 14 Tage, 60 neue
assert.equal(CO.backupStatus(many(60,last+1000,1000),last+DAY,0,now).due,false); // erst 13 Tage
assert.equal(CO.backupStatus(many(60,last-100000,1000).concat(many(10,last+1000,1000)),last,0,now).fresh,10); // nur neue zählen
assert.equal(CO.backupStatus(many(60,last+1000,1000).concat([{t:now-5,reset:true}]),last,0,now).fresh,60); // Reset-Marker zählt nicht
assert.equal(CO.backupStatus(many(60,last+1000,1000),last,now+1,now).due,false); // "Später" aktiv
assert.equal(CO.backupStatus(many(60,last+1000,1000),last,0,now).days,14);
// "Später" gilt bis Mitternacht
assert.equal(CO.endOfDay(now),new Date(2026,9,28,0,0).getTime());

// ---------- Problemzahlen ----------
const pe=(t,score,ok)=>CO.makeEntry(t,score,ok,false,[]);
const plog=[pe(now-40*DAY,61,false),                                   // zu alt
  pe(now-5,61,true),pe(now-4,61,false),                                 // 61: 1/2 falsch
  pe(now-3,70,false),pe(now-2,70,false),pe(now-1,70,true),              // 70: 2/3 falsch
  pe(now-6,72,false),pe(now-7,72,false),                                // 72: 2/2 falsch
  pe(now-8,64,true),                                                    // 64: nie falsch
  pe(now-9,90,false),{t:now-10,reset:true}];                            // 90: außerhalb des Bereichs
const pn=CO.problemNumbers(plog,CO.pool(R,41,80),now);
assert.equal(pn.total,8);
assert.deepEqual(pn.list.map(a=>[a.score,a.wrong,a.n]),[[72,2,2],[70,2,3],[61,1,2]]);
assert.equal(CO.problemNumbers(plog,CO.pool(R,41,80),now,30,1).list.length,1);
assert.deepEqual(CO.problemNumbers([],CO.pool(R,41,80),now),{total:0,list:[]});
console.log('Erinnerung und Problemzahlen ok');
console.log('alle Tests bestanden');
