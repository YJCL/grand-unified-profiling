// Offline calculations only: no environment, model API, DB or network dependencies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const target = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root,'lib/engine',name+'.ts'),'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module: target, exports: target.exports, Date, Intl, Math, Set, Map,
    require(id) {
      if (id.startsWith('./')) return load(id.slice(2));
      if (['astronomy-engine','city-timezones','crypto'].includes(id)) return nativeRequire(id);
      if (id === '@/data/iching/hexagrams.json') return JSON.parse(fs.readFileSync(path.join(root,'data/iching/hexagrams.json'),'utf8'));
      if (id === '@/data/geo/japan-municipalities.json') return JSON.parse(fs.readFileSync(path.join(root,'data/geo/japan-municipalities.json'),'utf8'));
      throw new Error('Offline engine test blocked a dependency');
    },
  });
  cache.set(name,target.exports);
  return target.exports;
}
const eph = load('ephemeris'), bazi = load('bazi'), geo = load('geocode'), profile = load('profile'), summary = load('summarize'), iching = load('iching');
const cycle = Array.from({length:60},(_,i)=>[...'甲乙丙丁戊己庚辛壬癸'][i%10]+[...'子丑寅卯辰巳午未申酉戌亥'][i%12]);
const referenceDay = date => cycle[((Date.parse(date+'T00:00:00Z')/86400000+719163+14)%60+60)%60];
test('800 noon day pillars agree with independent Rata Die reference (GNU cal-china.el)',()=>{
  for(let year=1900;year<=2099;year++) for(const [m,d] of [[1,1],[3,1],[6,15],[12,31]]) {
    const date = `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    assert.equal(bazi.computeFourPillars(date,'12:00',540).day.sexagenary,referenceDay(date),date);
  }
});
for(const [date,expected] of [['1900-02-28','壬申'],['1900-03-01','癸酉'],['1986-05-29','癸酉'],['2000-01-01','戊午'],['2000-01-07','甲子'],['2000-02-29','丁巳'],['2000-12-25','丁巳'],['2024-02-29','癸亥']]) {
  test('Independent published/fixture day '+date,()=>assert.equal(bazi.computeFourPillars(date,'12:00',540).day.sexagenary,expected));
}
test('Keep civil-midnight day rollover explicit; do not silently select the 23:00 school',()=>{
  assert.equal(bazi.computeFourPillars('2024-02-29','23:59',540).day.sexagenary,'癸亥');
  assert.equal(bazi.computeFourPillars('2024-03-01','00:00',540).day.sexagenary,'甲子');
  assert.equal(bazi.computeFourPillars('2024-02-29','22:59',540).hour.sexagenary,'癸亥');
  assert.equal(bazi.computeFourPillars('2024-03-01','00:00',540).hour.sexagenary,'甲子');
});
for(const date of ['2024-02-31','1900-02-29','2023-02-29','2000-13-01','2000-00-01','2000-01-00','0000-01-01','not-a-date','2000-1-1']) {
  test('Reject invalid date '+date,()=>assert.throws(()=>eph.toUTCDate(date,'12:00',540),e=>e.code==='invalid_date'&&!e.message.includes(date)));
}
for(const time of ['24:00','12:60','-1:00','1:00','12:00:00','not-a-time','']) {
  test('Reject invalid time '+JSON.stringify(time),()=>assert.throws(()=>eph.toUTCDate('2000-01-01',time,540),e=>e.code==='invalid_time'));
}
test('Leap day and a year below 100 are preserved; missing time uses an explicit noon assumption',()=>{
  assert.equal(eph.toUTCDate('2000-02-29','00:00',0).date.toISOString(),'2000-02-29T00:00:00.000Z');
  assert.equal(eph.toUTCDate('0066-01-01','12:00',0).date.toISOString(),'0066-01-01T12:00:00.000Z');
  assert.equal(eph.toUTCDate('2000-01-01',undefined,540).date.toISOString(),'2000-01-01T03:00:00.000Z');
  assert.equal(eph.toUTCDate('2000-01-01',undefined,540).hasExactTime,false);
  for(const offset of [NaN,Infinity,841,-841]) assert.throws(()=>eph.toUTCDate('2000-01-01','12:00',offset),e=>e.code==='invalid_offset');
});
test('DST ordinary/winter/summer and fractional offsets resolve independently of host TZ',()=>{
  assert.equal(geo.resolveTzOffset('America/New_York','2000-01-01','12:00'),-300);
  assert.equal(geo.resolveTzOffset('America/New_York','2000-07-01','12:00'),-240);
  assert.equal(geo.resolveTzOffset('Asia/Tokyo','2000-01-01','12:00'),540);
  assert.equal(geo.resolveTzOffset('Asia/Kathmandu','2000-01-01','12:00'),345);
});
test('DST gap/fold and skipped civil day require correction or explicit offset',()=>{
  assert.throws(()=>geo.resolveTzOffset('America/New_York','2024-03-10','02:30'),e=>e.code==='nonexistent_local_time');
  assert.throws(()=>geo.resolveTzOffset('America/New_York','2024-11-03','01:30'),e=>e.code==='ambiguous_local_time');
  assert.throws(()=>geo.resolveTzOffset('Pacific/Apia','2011-12-30','12:00'),e=>e.code==='nonexistent_local_time');
  assert.throws(()=>geo.resolveTzOffset('not/a/zone','2000-01-01','12:00'),e=>e.code==='invalid_timezone');
});
test('Explicit foreign coordinates require a zone or offset, never silently Tokyo',()=>{
  const input = {birthDate:'2000-01-01',birthTime:'12:00',lat:40.7128,lon:-74.006};
  assert.throws(()=>profile.buildGrandProfile(input),e=>e.code==='coordinates_require_timezone');
  const ny = profile.buildGrandProfile({...input,timeZone:'America/New_York'});
  assert.equal(ny.meta.tzOffsetMinutes,-300);
  assert.equal(ny.westernAstrology.hasAscendant,true);
  const offset = profile.buildGrandProfile({...input,tzOffsetMinutes:-300});
  assert.equal(offset.westernAstrology.sun.degree,ny.westernAstrology.sun.degree);
  for(const patch of [{lat:NaN},{lat:91},{lon:181},{lon:undefined}]) assert.throws(()=>profile.buildGrandProfile({...input,...patch}),e=>e.code==='invalid_coordinates');
});
test('Fold disambiguation accepts either valid explicit offset and rejects an impossible combination',()=>{
  const input={birthDate:'2024-11-03',birthTime:'01:30',birthPlace:'New York'};
  const a=profile.buildGrandProfile({...input,tzOffsetMinutes:-240});
  const b=profile.buildGrandProfile({...input,tzOffsetMinutes:-300});
  assert.notEqual(a.westernAstrology.sun.degree,b.westernAstrology.sun.degree);
  assert.throws(()=>profile.buildGrandProfile({...input,tzOffsetMinutes:540}),e=>e.code==='offset_timezone_mismatch');
  assert.throws(()=>profile.buildGrandProfile({...input,birthDate:'2024-03-10',birthTime:'02:30',tzOffsetMinutes:-240}),e=>e.code==='offset_timezone_mismatch');
});
test('Unknown place suppresses ASC/MC and marks zone-dependent results as provisional',()=>{
  const unknown=profile.buildGrandProfile({birthDate:'2000-01-01',birthTime:'12:00'});
  assert.equal(unknown.westernAstrology.hasAscendant,false);
  assert.equal(unknown.westernAstrology.ascendant,undefined);
  assert.equal(unknown.westernAstrology.midheaven,undefined);
  assert.equal(unknown.humanDesign.incomplete,true);
  assert.equal(unknown.meta.locationConfidence,'fallback');
  assert.ok(summary.summarizeProfile(unknown).includes('日本標準時を仮定'));
  assert.ok(summary.summarizeProfile(unknown).includes('未確定の項目'));
});
test('Blank optional time remains unknown, while a matched city and exact time support ASC',()=>{
  const unknown=profile.buildGrandProfile({birthDate:'2000-01-01',birthTime:'',birthPlace:'東京'});
  assert.equal(unknown.meta.hasExactTime,false);
  assert.equal(unknown.westernAstrology.hasAscendant,false);
  assert.equal(unknown.humanDesign.incomplete,true);
  assert.equal(profile.buildGrandProfile({birthDate:'2000-01-01',birthTime:'12:00',birthPlace:'東京'}).westernAstrology.hasAscendant,true);
});
test('Fact sheet preserves sign boundary degrees rather than rounding them to 30',()=>{
  const p=profile.buildGrandProfile({birthDate:'2000-01-01'});
  p.westernAstrology.sun.degree=29.999;
  p.westernAstrology.planets[0].degree=29.999;
  const text=summary.summarizeProfile(p);
  assert.ok(text.includes('29.99度'));
  assert.ok(!text.includes('太陽='+p.westernAstrology.sun.sign+'30'));
  assert.ok(!text.includes('ハルシネーション撲滅'));
});
test('Daily dates follow JST at its midnight boundary and through leap day',()=>{
  const p=profile.buildGrandProfile({birthDate:'2000-01-01'});
  const daily=load('daily');
  assert.equal(daily.computeDailyState(p,new Date('2024-02-29T14:59:59Z')).date,'2024-02-29');
  assert.equal(daily.computeDailyState(p,new Date('2024-02-29T15:00:00Z')).date,'2024-03-01');
  const rows=daily.computeScoreRange(p,-1,3,new Date('2024-02-29T15:30:00Z'));
  assert.equal(rows.map(x=>x.date).join(','),'2024-02-29,2024-03-01,2024-03-02');
});
test('A real ephemeris instant near a sign boundary keeps degrees below 30 in engine data',()=>{
  const instant=eph.findSolarLongitudeDate(29.999,new Date('2024-04-10T00:00:00Z'),20);
  const result=load('astrology').computeWesternAstrology(instant);
  assert.equal(result.sun.sign,'牡羊座');
  assert.ok(result.sun.degree>29.99 && result.sun.degree<30);
  assert.ok(result.planets.every(p=>p.degree>=0 && p.degree<30 && p.longitude>=0 && p.longitude<360));
});
test('Sun longitude matches a NASA/JPL geocentric apparent ecliptic reference within two arcseconds',()=>{
  const reference=280.3689092; // Horizons quantity31, 2000-01-01 12:00 UTC, observer 500@399.
  assert.ok(Math.abs(eph.sunLongitude(new Date('2000-01-01T12:00:00Z'))-reference)*3600<2);
});
test('Four bodies at two instants agree with NASA/JPL reference positions within five arcseconds',()=>{
  const fixtures=JSON.parse(fs.readFileSync(path.join(root,'scripts/fixtures/ephemeris-jpl.json'),'utf8'));
  assert.equal(fixtures.rows.length,8);
  for(const {planet,date,referenceLongitude} of fixtures.rows) {
    const own=eph.planetLongitude(planet,new Date(date));
    const difference=(((own-referenceLongitude+540)%360)-180)*3600;
    assert.ok(Math.abs(difference)<5,`${planet} at ${date}: ${difference} arcsec`);
  }
});
test('The 2024 solar-year boundary is on Feb 4 as in the HKO calendar, with correct sides',()=>{
  const risshun=eph.findSolarLongitudeDate(315,new Date('2024-01-20T00:00:00Z'),30);
  assert.equal(risshun.toISOString().slice(0,10),'2024-02-04');
  assert.equal(bazi.getSolarYear(new Date(risshun.getTime()-1000)),2023);
  assert.equal(bazi.getSolarYear(new Date(risshun.getTime()+1000)),2024);
});
test('Solar-year search does not reinterpret an explicit year below 100 as the 1900s',()=>{
  assert.equal(bazi.getSolarYear(new Date('0066-06-01T00:00:00Z')),66);
});
test('I Ching reconstructs all 64 patterns without duplicate numbers and preserves moving lines',()=>{
  const nums=new Set();
  for(let bits=0;bits<64;bits++) {
    const values=Array.from({length:6},(_,i)=>bits&(1<<i)?7:8);
    const result=iching.reconstructIching(values);
    nums.add(result.primary.num);
    assert.equal(result.transformed,null);
    const moving=iching.reconstructIching(values.map(v=>v===7?9:6));
    assert.equal(moving.changingLines.length,6);
    assert.equal(moving.binary.transformed,result.binary.primary.split('').map(b=>b==='1'?'0':'1').join(''));
  }
  assert.equal(nums.size,64);
});
test('Known hexagram fixtures and deterministic seeds; invalid casts fail',()=>{
  for(const [values,num] of [[[7,7,7,7,7,7],1],[[8,8,8,8,8,8],2],[[7,7,7,8,8,8],11],[[8,8,8,7,7,7],12],[[8,7,7,7,7,7],44]]) assert.equal(iching.reconstructIching(values).primary.num,num);
  assert.equal(JSON.stringify(iching.castIching('audit-only-seed')),JSON.stringify(iching.castIching('audit-only-seed')));
  assert.throws(()=>iching.reconstructIching([7,7,7]));
  assert.throws(()=>iching.reconstructIching([1,7,7,7,7,7]));
});
test('All 64 identifications agree with independently extracted classical yao headings',()=>{
  const fixtures=JSON.parse(fs.readFileSync(path.join(root,'scripts/fixtures/iching-classical.json'),'utf8'));
  assert.equal(fixtures.rows.length,64);
  for(const {num,binary} of fixtures.rows) {
    const result=iching.reconstructIching(binary.split('').map(b=>b==='1'?7:8));
    assert.equal(result.primary.num,num,'classical hexagram '+num);
    assert.ok(result.dataVersion.endsWith('/bottom-up-v2'));
  }
});
test('Existing saved hexagrams retain their stored numbers and version after the algorithm fix',()=>{
  const values=[8,7,7,7,7,7];
  assert.equal(iching.reconstructIching(values).primary.num,44);
  const old=iching.restoreIchingSnapshot(values,{primaryNum:10,transformedNum:null,dataVersion:'legacy-snapshot'});
  assert.equal(old.primary.num,10);
  assert.equal(old.dataVersion,'legacy-snapshot');
  const current=iching.restoreIchingSnapshot(values,{primaryNum:44,transformedNum:null,dataVersion:iching.reconstructIching(values).dataVersion});
  assert.equal(current.primary.num,44);
  assert.ok(current.dataVersion.endsWith('/bottom-up-v2'));
});
test('Saved transformed hexagram and changing lines survive restoration without modifying input',()=>{
  const values=[6,7,7,7,7,7],before=JSON.stringify(values);
  const old=iching.restoreIchingSnapshot(values,{primaryNum:10,transformedNum:1,dataVersion:'legacy-snapshot'});
  assert.equal(old.transformed.num,1);
  assert.equal(old.changingLines.join(','),'1');
  assert.equal(JSON.stringify(values),before);
});
test('Only newly computed profile and daily facts receive the new calculation version',()=>{
  const p=profile.buildGrandProfile({birthDate:'2000-01-01'});
  assert.equal(p.meta.calculationVersion,'2026-10-03-v3');
  assert.equal(load('daily').computeDailyState(p,new Date('2024-03-01T00:00:00Z')).calculationVersion,p.meta.calculationVersion);
});

test('Japanese municipality inputs resolve locally, including Kesennuma and other prefectures',()=>{
  for (const place of ['宮城県気仙沼市','気仙沼市','気仙沼','日本, 宮城県気仙沼市','神奈川県横浜市','北海道札幌市','沖縄県那覇市','長野県松本市','Kesennuma, Japan']) {
    const p=profile.buildGrandProfile({birthDate:'2000-01-07',birthTime:'12:00',birthPlace:place});
    assert.equal(p.meta.timeZone,'Asia/Tokyo',place);
    assert.equal(p.meta.tzOffsetMinutes,540,place);
    assert.equal(p.westernAstrology.hasAscendant,true,place);
    assert.equal(p.humanDesign.incomplete,false,place);
    assert.equal(p.meta.calculationAssumptions.length,0,place);
  }
  const kesennuma=geo.geocodePlace('宮城県気仙沼市');
  assert.ok(kesennuma.lat>38.7&&kesennuma.lat<39.1&&kesennuma.lon>141.3&&kesennuma.lon<141.8);
});
test('Country/prefecture-only and repeated Japanese names establish timezone without inventing coordinates',()=>{
  for(const place of ['日本','Japan','宮城県','府中市']) {
    const p=profile.buildGrandProfile({birthDate:'2000-01-07',birthTime:'12:00',birthPlace:place});
    assert.equal(p.meta.timeZone,'Asia/Tokyo',place);
    assert.equal(p.meta.locationConfidence,'timezone',place);
    assert.equal(p.meta.lat,undefined,place);
    assert.equal(p.westernAstrology.hasAscendant,false,place);
    assert.ok(!p.meta.calculationAssumptions.some(s=>s.includes('タイムゾーンが不明')),place);
  }
});
test('Foreign cities use their own zones, country qualifiers disambiguate, and unresolved foreign inputs cannot become JST',()=>{
  for(const [place,zone] of [['New York','America/New_York'],['Paris, France','Europe/Paris'],['London, UK','Europe/London'],['Kochi, India','Asia/Kolkata'],['Kochi, Japan','Asia/Tokyo']]) {
    assert.equal(geo.geocodePlace(place).iana,zone,place);
    assert.notEqual(geo.geocodePlace(place).confidence,'fallback',place);
  }
  for(const place of ['Kochi','Springfield','Atlantis, USA','宮城県気仙沼市, USA','日本, USA','アメリカ 東京']) {
    assert.equal(geo.geocodePlace(place).confidence,'fallback',place);
    assert.throws(()=>profile.buildGrandProfile({birthDate:'2000-01-07',birthTime:'12:00',birthPlace:place}),e=>e.code==='unknown_place',place);
  }
});
test('Corrected birthplace stops current uncertainty; historical metadata remains untouched',()=>{
  const old={version:'2026-10-03-v2',assumptions:['出生地のタイムゾーンが不明のため日本標準時を仮定しています。']};
  const before=JSON.stringify(old);
  const current=profile.buildProfileFromUser({birthDate:'2000-01-07',birthTime:'12:00',birthPlace:'宮城県気仙沼市'});
  assert.equal(current.meta.calculationAssumptions.length,0);
  assert.equal(JSON.stringify(old),before);
});
