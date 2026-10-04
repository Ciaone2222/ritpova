/* Portable, validated diary data. No accounts or network dependencies. */
(function(root){
 'use strict';
 const tables=['students','courses','course_students','lessons','training_sessions','general_ratings'];
 const fail=()=>{throw Error('File non valido o incompleto. Nessun dato è stato modificato.')};
 const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const id=x=>{if(!Number.isSafeInteger(x)||x<1)fail();return x};
 const text=(x,max=4000)=>{if(typeof x!=='string'||x.length>max)fail();return x};
 const optional=(x,max)=>text(x??'',max);
 const bool=x=>{if(x!==undefined&&typeof x!=='boolean')fail();return !!x};
 const date=x=>{text(x,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(x)||!Number.isFinite(Date.parse(x+'T12:00:00Z'))||new Date(x+'T12:00:00Z').toISOString().slice(0,10)!==x)fail();return x};
 const time=x=>{text(x,8);if(!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(x))fail();return x.slice(0,5)};
 const grade=x=>{if(!Number.isInteger(x)||x<0||x>5)fail();return x};
 const ref=x=>x==null?null:id(x);
 function source(x){if(x===undefined)return undefined;if(!obj(x)||!tables.includes(x.table))fail();return {origin:text(x.origin,100),table:x.table,id:id(x.id)}}
 function cleanData(input){
  if(!obj(input)||tables.some(t=>!Array.isArray(input[t])||input[t].length>100000))fail();
  const d={};
  for(const t of tables)d[t]=input[t].map(r=>{
   if(!obj(r))fail();let v;
   if(t==='course_students')return {course_id:id(r.course_id),student:id(r.student)};
   const base={id:id(r.id)};if(r.source!==undefined)base.source=source(r.source);
   if(t==='students')v={name:text(r.name,120),level:text(r.level,40),side:text(r.side,40),goal:optional(r.goal,160)};
   if(t==='courses')v={name:text(r.name,120),description:optional(r.description,2000)};
   if(t==='lessons'){
    if(!Array.isArray(r.participants)||r.participants.length<1||r.participants.length>4||!Number.isInteger(r.duration)||r.duration<1||r.duration>1440)fail();
    const participants=r.participants.map(p=>{if(!obj(p))fail();return {student:id(p.student),present:bool(p.present)}});if(new Set(participants.map(p=>p.student)).size!==participants.length)fail();
    v={date:date(r.date),time:time(r.time),duration:r.duration,club:text(r.club,100),focus:text(r.focus,160),course_id:ref(r.course_id),cancelled:bool(r.cancelled),note:optional(r.note),participants};
   }
   if(t==='training_sessions'){
    if(!Array.isArray(r.exercises)||!r.exercises.length||r.exercises.length>100)fail();
    v={student:id(r.student),lessonId:ref(r.lessonId),course_id:ref(r.course_id),date:date(r.date),time:time(r.time),club:text(r.club,100),title:text(r.title,160),grade:grade(r.grade),notes:optional(r.notes),privateNote:optional(r.privateNote),exercises:r.exercises.map(e=>{if(!obj(e))fail();return {name:text(e.name,180),execution:text(e.execution,2500)}})};
   }
   if(t==='general_ratings'){if(!Array.isArray(r.scores)||r.scores.length!==5)fail();v={student:id(r.student),date:date(r.date),overall:grade(r.overall),scores:r.scores.map(grade),goal:text(r.goal,160),note:text(r.note)}}
   return {...base,...v};
  });
  const sets={};for(const t of tables.filter(t=>t!=='course_students')){sets[t]=new Set(d[t].map(r=>r.id));if(sets[t].size!==d[t].length)fail();const sources=d[t].filter(r=>r.source).map(r=>JSON.stringify(r.source));if(new Set(sources).size!==sources.length)fail();if(d[t].some(r=>r.source&&r.source.table!==t))fail()}
  const has=(t,x)=>sets[t].has(x),member=(c,s)=>d.course_students.some(m=>m.course_id===c&&m.student===s);
  if(new Set(d.course_students.map(m=>m.course_id+':'+m.student)).size!==d.course_students.length)fail();
  for(const m of d.course_students)if(!has('courses',m.course_id)||!has('students',m.student))fail();
  for(const l of d.lessons)if(l.course_id!==null&&!has('courses',l.course_id)||l.participants.some(p=>!has('students',p.student)||l.course_id!==null&&!member(l.course_id,p.student)))fail();
  for(const j of d.training_sessions){const l=d.lessons.find(l=>l.id===j.lessonId);if(!has('students',j.student)||j.course_id!==null&&(!has('courses',j.course_id)||!member(j.course_id,j.student))||j.lessonId!==null&&(!l||!l.participants.some(p=>p.student===j.student)||l.course_id!==j.course_id))fail()}
  for(const r of d.general_ratings)if(!has('students',r.student))fail();
  return d;
 }
 function empty(){return Object.fromEntries(tables.map(t=>[t,[]]))}
 function legacy(b){
  const raw=b.data;if(!obj(raw)||!Array.isArray(raw.students)||!Array.isArray(raw.lessons)||!Array.isArray(raw.training_sessions)||!Array.isArray(raw.general_ratings))fail();
  const d=empty();d.students=raw.students;d.courses=raw.courses||[];d.course_students=raw.course_students||[];
  d.lessons=raw.lessons.map(l=>({...l,focus:l.focus||l.title||'',note:(raw.lesson_notes||[]).find(n=>n.lesson_id===l.id)?.note||'',participants:(raw.lesson_participants||[]).filter(p=>p.lesson_id===l.id).map(p=>({student:p.student,present:p.present}))}));
  d.training_sessions=raw.training_sessions.map(j=>({...j,privateNote:(raw.session_notes||[]).find(n=>n.session_id===j.id)?.note||''}));d.general_ratings=raw.general_ratings;return cleanData(d);
 }
 function parse(b){
  if(!obj(b)||!['campo-backup','campo-share'].includes(b.format)||!Number.isFinite(Date.parse(b.createdAt)))fail();
  if(b.format==='campo-backup'&&b.version===1)return {format:b.format,version:2,createdAt:b.createdAt,origin:'legacy-'+text(b.owner,100),data:legacy(b)};
  if(b.version!==2)fail();const origin=text(b.origin,100);if(!origin)fail();const data=cleanData(b.data);
  if(b.format==='campo-share'){
   if(data.lessons.some(l=>l.note)||data.training_sessions.some(j=>j.privateNote))fail();
   if(tables.some(t=>t!=='course_students'&&data[t].some(r=>!r.source)))fail();
  }
  return {format:b.format,version:2,createdAt:b.createdAt,origin,data};
 }
 function bundle(data,origin,kind,idValue){
  const all=cleanData(data),d=empty(),sid=new Set(),cid=new Set(),lid=new Set();
  if(kind==='course'){cid.add(idValue);all.course_students.filter(m=>m.course_id===idValue).forEach(m=>sid.add(m.student));all.lessons.filter(l=>l.course_id===idValue).forEach(l=>lid.add(l.id));d.training_sessions=all.training_sessions.filter(j=>j.course_id===idValue)}
  else if(kind==='student'){sid.add(idValue);d.training_sessions=all.training_sessions.filter(j=>j.student===idValue);all.lessons.filter(l=>l.participants.some(p=>p.student===idValue)).forEach(l=>lid.add(l.id));d.general_ratings=all.general_ratings.filter(r=>r.student===idValue)}
  else if(kind==='lesson'){lid.add(idValue);d.training_sessions=all.training_sessions.filter(j=>j.lessonId===idValue)}
  else if(kind==='journal'){d.training_sessions=all.training_sessions.filter(j=>j.id===idValue);d.training_sessions.forEach(j=>{sid.add(j.student);if(j.lessonId)lid.add(j.lessonId)})}
  else fail();
  d.lessons=all.lessons.filter(l=>lid.has(l.id)).map(l=>({...l,note:'',participants:kind==='student'||kind==='journal'?l.participants.filter(p=>sid.has(p.student)):l.participants}));
  d.lessons.forEach(l=>{l.participants.forEach(p=>sid.add(p.student));if(l.course_id)cid.add(l.course_id)});
  d.training_sessions.forEach(j=>{sid.add(j.student);if(j.course_id)cid.add(j.course_id)});
  d.students=all.students.filter(p=>sid.has(p.id)).map(p=>({...p,goal:kind==='student'?p.goal:''}));d.courses=all.courses.filter(c=>cid.has(c.id));d.course_students=all.course_students.filter(m=>cid.has(m.course_id)&&sid.has(m.student));
  d.training_sessions=d.training_sessions.map(j=>({...j,privateNote:''}));
  for(const t of tables.filter(t=>t!=='course_students'))d[t]=d[t].map(r=>({...r,source:r.source||{origin,table:t,id:r.id}}));
  if(kind==='course'&&!d.courses.some(c=>c.id===idValue)||kind==='student'&&!d.students.some(p=>p.id===idValue)||kind==='lesson'&&!d.lessons.length||kind==='journal'&&!d.training_sessions.length)fail();
  return parse({format:'campo-share',version:2,createdAt:new Date().toISOString(),origin,data:d});
 }
 function merge(current,portable,nextId,currentOrigin=null){
  const d=cleanData(current),b=parse(portable);if(b.format!=='campo-share')fail();const maps={},counts={added:0,skipped:0};
  for(const t of tables.filter(t=>t!=='course_students')){
   maps[t]=new Map();const used=new Set(d[t].map(r=>r.id));
   for(const r of b.data[t]){const existing=d[t].find(v=>v.source?v.source.origin===r.source.origin&&v.source.table===r.source.table&&v.source.id===r.source.id:currentOrigin===r.source.origin&&v.id===r.source.id);let newId=existing?.id;
    if(!newId){do{newId=nextId()}while(used.has(newId));used.add(newId)}maps[t].set(r.id,{id:newId,existing:!!existing});
   }
  }
  for(const t of tables.filter(t=>t!=='course_students'))for(const r of b.data[t]){
   const mapped=maps[t].get(r.id);if(mapped.existing){
    // A student-only export may have contained just one member of a group lesson.
    // Later imports fill missing participants without replacing local attendance.
    if(t==='lessons'){const existing=d.lessons.find(l=>l.id===mapped.id);for(const p of r.participants){const student=maps.students.get(p.student).id;if(!existing.participants.some(x=>x.student===student))existing.participants.push({student,present:p.present})}}
    counts.skipped++;continue
   }const v=structuredClone(r);v.id=mapped.id;
   if(v.student)v.student=maps.students.get(v.student).id;if(v.course_id)v.course_id=maps.courses.get(v.course_id).id;
   if(v.lessonId)v.lessonId=maps.lessons.get(v.lessonId).id;
   if(v.participants)v.participants=v.participants.map(p=>({...p,student:maps.students.get(p.student).id}));d[t].push(v);counts.added++;
  }
  for(const m of b.data.course_students){const v={course_id:maps.courses.get(m.course_id).id,student:maps.students.get(m.student).id};if(!d.course_students.some(x=>x.course_id===v.course_id&&x.student===v.student))d.course_students.push(v)}
  return {data:cleanData(d),...counts};
 }
 const api={tables,empty,cleanData,parse,bundle,merge};if(typeof module!=='undefined')module.exports=api;else root.CampoFiles=api;
})(typeof window==='undefined'?globalThis:window);
