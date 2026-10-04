let progressArea='overall';
function progressChart(records,label){
 const ordered=[...records].sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||'')||a.id-b.id);
 const valid=ordered.filter(r=>Number.isFinite(r.value)&&r.value>=1&&r.value<=5);
 if(!valid.length)return `<div class="empty"><h3>Nessuna valutazione disponibile.</h3><p>Il grafico apparirà quando il coach avrà registrato un voto per questa voce.</p></div>`;
 const stamp=r=>new Date(r.date+'T'+(r.time||'12:00')+':00').getTime(),start=stamp(ordered[0]),end=stamp(ordered.at(-1));
 const x=r=>end===start?310:48+(stamp(r)-start)/(end-start)*526,y=v=>210-(v-1)*44;
 const paths=[];let segment=[];
 ordered.forEach(r=>{if(r.value>=1&&r.value<=5)segment.push(`${x(r)},${y(r.value)}`);else{if(segment.length>1)paths.push(segment);segment=[]}});if(segment.length>1)paths.push(segment);
 const last=valid.at(-1),first=valid[0],change=last.value-first.value;
 return `<div class="chart-summary"><strong>${last.value}<span> / 5</span></strong><div>Ultimo voto · ${shortDate(last.date)}<small>${valid.length>1?`${change>0?'+':''}${change} rispetto al primo voto del periodo`:'Primo punto del percorso: servono almeno due voti per osservare un andamento.'}</small></div></div>
 <figure class="progress-figure"><svg class="progress-chart" viewBox="0 0 620 260" role="img" aria-label="${esc(label)}: ${valid.length} valutazioni da ${shortDate(first.date)} a ${shortDate(last.date)}, ultimo voto ${last.value} su 5. Dati completi nella tabella sottostante.">
 ${[1,2,3,4,5].map(n=>`<line x1="48" x2="574" y1="${y(n)}" y2="${y(n)}" class="chart-grid"/><text x="25" y="${y(n)+5}" class="chart-label">${n}</text>`).join('')}
 ${paths.map(p=>`<polyline points="${p.join(' ')}" class="chart-line"/>`).join('')}
 ${valid.map(r=>`<circle cx="${x(r)}" cy="${y(r.value)}" r="6" class="chart-point"><title>${esc(shortDate(r.date)+(r.time?' · '+r.time:''))}: ${r.value}/5</title></circle>`).join('')}
 <text x="48" y="246" class="chart-label">${esc(shortDate(ordered[0].date))}</text><text x="574" y="246" text-anchor="end" class="chart-label">${end!==start?esc(shortDate(ordered.at(-1).date)):''}</text></svg><figcaption>Scala da 1 a 5 · ${valid.length} voti registrati${ordered.length>valid.length?' · Le voci non valutate interrompono la linea.':''}</figcaption></figure>
 <details class="chart-data"><summary>Vedi i dati del grafico</summary><div class="chart-table-wrap"><table><caption>${esc(label)}</caption><thead><tr><th scope="col">Data</th><th scope="col">Voto</th></tr></thead><tbody>${ordered.map(r=>`<tr><td>${esc(shortDate(r.date)+(r.time?' · '+r.time:''))}</td><td>${gradeText(r.value)}</td></tr>`).join('')}</tbody></table></div></details>`;
}
function progressView(id){
 const ratings=historyFor(id),area=progressArea==='overall'?-1:Number(progressArea),label=area<0?'Valutazione generale':skillNames[area];
 const records=ratings.map(r=>({...r,value:area<0?r.overall:r.scores[area]}));
 const sessions=journalsFor(id).map(j=>({...j,value:j.grade}));
 return `<div class="progress-panels">${!activeCourse?`<section class="panel"><div class="panel-head"><div><div class="eyebrow">Il percorso nel tempo</div><h2>Progressi tecnici</h2></div></div><label class="field chart-select">Valutazione da mostrare<select id="progress-area"><option value="overall" ${area<0?'selected':''}>Valutazione generale</option>${skillNames.map((s,i)=>`<option value="${i}" ${area===i?'selected':''}>${esc(s)}</option>`).join('')}</select></label>${progressChart(records,label)}</section>`:''}<section class="panel"><div class="panel-head"><div><div class="eyebrow">Una lezione alla volta</div><h2>Andamento degli allenamenti</h2></div></div><p>Il voto descrive la singola lezione e non modifica la valutazione generale.</p>${progressChart(sessions,'Voti delle lezioni')}</section></div>`;
}
