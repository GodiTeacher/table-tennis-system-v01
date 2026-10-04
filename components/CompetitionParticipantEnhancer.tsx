'use client';

import {useEffect} from 'react';

function qs<T extends Element>(root:ParentNode, selector:string){return root.querySelector(selector) as T|null}

export default function CompetitionParticipantEnhancer(){
  useEffect(()=>{
    let observer:MutationObserver|undefined;
    let stopped=false;

    const init=()=>{
      if(stopped)return false;
      const sections=Array.from(document.querySelectorAll('section.card'));
      const participantSection=sections.find(section=>section.querySelector('h2')?.textContent?.trim()==='參賽名單') as HTMLElement|undefined;
      if(!participantSection)return false;
      participantSection.id='participants';

      const addForm=Array.from(participantSection.querySelectorAll('form')).find(form=>
        form.querySelector('input[name="student_ids"]')&&form.querySelector('input[name="competition_date"]')
      ) as HTMLFormElement|undefined;
      if(!addForm)return false;

      const addDate=addForm.querySelector('input[name="competition_date"]') as HTMLInputElement|null;
      const minDate=addDate?.min||'';
      const maxDate=addDate?.max||'';
      const competitionId=(addForm.querySelector('input[name="competition_id"]') as HTMLInputElement|null)?.value||'';
      if(!competitionId)return false;

      const catalog=Array.from(addForm.querySelectorAll('label')).map(label=>{
        const checkbox=label.querySelector('input[name="student_ids"]') as HTMLInputElement|null;
        const name=label.querySelector('b')?.textContent?.trim()||'';
        const meta=label.querySelector('small')?.textContent?.trim()||'';
        return checkbox?{id:checkbox.value,name,meta}:null;
      }).filter(Boolean) as Array<{id:string;name:string;meta:string}>;

      const rowMeta=(row:HTMLElement)=>{
        const participantId=qs<HTMLInputElement>(row,'input[name="participant_id"]')?.value||'';
        const studentName=row.querySelector('div b')?.textContent?.trim()||'';
        const student=catalog.find(s=>s.name===studentName);
        const badge=Array.from(row.children).find(el=>el.tagName==='SPAN') as HTMLSpanElement|undefined;
        const text=badge?.textContent?.trim()||'';
        const parts=text.split('·').map(x=>x.trim()).filter(Boolean);
        const roleText=parts[0]||'參賽';
        const category=parts.slice(1).join(' · ')||'未命名組別';
        const participantRole=roleText==='後備'?'reserve':'competitor';
        const date=row.closest('.competitionDay')?.querySelector('h3')?.textContent?.trim()||'';
        return {row,participantId,studentId:student?.id||'',studentName,category,participantRole,date};
      };

      participantSection.querySelectorAll<HTMLElement>('.competitionDay').forEach(day=>{
        const list=day.querySelector('.participantList') as HTMLElement|null;
        if(!list||list.dataset.teamGrouped==='1')return;
        const directRows=Array.from(list.children).filter(el=>(el as HTMLElement).classList.contains('participant')) as HTMLElement[];
        if(!directRows.length)return;
        list.dataset.teamGrouped='1';
        const metas=directRows.map(rowMeta);
        const groups=new Map<string,typeof metas>();
        for(const meta of metas){
          const key=meta.category;
          const arr=groups.get(key)??[];arr.push(meta);groups.set(key,arr);
        }
        const sorted=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b,'zh-Hant'));
        for(const [category,members] of sorted){
          const team=document.createElement('section');
          team.className='participantTeam';
          const date=members[0]?.date||'';
          const header=document.createElement('div');
          header.className='participantTeamHead';
          const competitorCount=members.filter(m=>m.participantRole==='competitor').length;
          const reserveCount=members.filter(m=>m.participantRole==='reserve').length;
          header.innerHTML=`<div><strong>${category}</strong><small>${date} · 參賽 ${competitorCount} 人${reserveCount?` · 後備 ${reserveCount} 人`:''}</small></div><button type="button" class="secondaryButton" data-team-edit>編輯隊伍</button>`;
          const body=document.createElement('div');body.className='participantTeamMembers';

          const roleOrder:Record<string,number>={competitor:0,reserve:1};
          const orderedMembers=[...members].sort((a,b)=>{
            const roleDiff=(roleOrder[a.participantRole]??9)-(roleOrder[b.participantRole]??9);
            return roleDiff!==0?roleDiff:a.studentName.localeCompare(b.studentName,'zh-Hant');
          });

          let lastRole='';
          orderedMembers.forEach(m=>{
            if(m.participantRole!==lastRole){
              const divider=document.createElement('div');
              divider.className=`participantRoleDivider ${m.participantRole==='reserve'?'reserve':'competitor'}`;
              divider.textContent=m.participantRole==='reserve'?'後備':'參賽';
              body.appendChild(divider);
              lastRole=m.participantRole;
            }
            const badge=Array.from(m.row.children).find(el=>el.tagName==='SPAN') as HTMLSpanElement|undefined;
            m.row.classList.remove('participantCompetitor','participantReserve');
            m.row.classList.add(m.participantRole==='reserve'?'participantReserve':'participantCompetitor');
            if(badge){
              badge.textContent=m.participantRole==='reserve'?'後備':'參賽';
              badge.classList.remove('participantRoleBadgeCompetitor','participantRoleBadgeReserve');
              badge.classList.add(m.participantRole==='reserve'?'participantRoleBadgeReserve':'participantRoleBadgeCompetitor');
            }
            body.appendChild(m.row);
          });
          team.append(header,body);
          list.appendChild(team);

          qs<HTMLButtonElement>(header,'[data-team-edit]')?.addEventListener('click',()=>{
            if(team.querySelector('.participantTeamEditor'))return;
            const competitorIds=new Set(members.filter(m=>m.participantRole==='competitor').map(m=>m.studentId).filter(Boolean));
            const reserveIds=new Set(members.filter(m=>m.participantRole==='reserve').map(m=>m.studentId).filter(Boolean));
            const editor=document.createElement('div');editor.className='participantTeamEditor';
            editor.innerHTML=`
              <div class="teamEditorGrid compact">
                <label>比賽日期<input type="date" data-field="competition_date" value="${date}" ${minDate?`min="${minDate}"`:''} ${maxDate?`max="${maxDate}"`:''}></label>
                <label>組別名稱<input data-field="category" value="${category.replace(/"/g,'&quot;')}"></label>
              </div>
              <div class="teamEditorHint">參賽與後備分開編輯；同一位選手不能同時出現在兩邊。勾選另一邊時，系統會自動從原本那邊取消。</div>
              <div class="dualRosterEditor">
                <section class="rosterPicker competitorPicker">
                  <div class="rosterPickerHead"><strong>參賽選手</strong><span data-count-competitor>${competitorIds.size} 人</span></div>
                  <div class="teamStudentPicker" data-picker="competitor"></div>
                </section>
                <section class="rosterPicker reservePicker">
                  <div class="rosterPickerHead"><strong>後備選手</strong><span data-count-reserve>${reserveIds.size} 人</span></div>
                  <div class="teamStudentPicker" data-picker="reserve"></div>
                </section>
              </div>
              <div class="participantEditActions"><button type="button" class="primaryButton" data-team-save>儲存整隊</button><button type="button" class="secondaryButton" data-team-cancel>取消</button></div>
            `;

            const competitorPicker=qs<HTMLElement>(editor,'[data-picker="competitor"]');
            const reservePicker=qs<HTMLElement>(editor,'[data-picker="reserve"]');
            const countCompetitor=qs<HTMLElement>(editor,'[data-count-competitor]');
            const countReserve=qs<HTMLElement>(editor,'[data-count-reserve]');

            const updateCounts=()=>{
              const c=editor.querySelectorAll<HTMLInputElement>('[data-picker="competitor"] input[type="checkbox"]:checked').length;
              const r=editor.querySelectorAll<HTMLInputElement>('[data-picker="reserve"] input[type="checkbox"]:checked').length;
              if(countCompetitor)countCompetitor.textContent=`${c} 人`;
              if(countReserve)countReserve.textContent=`${r} 人`;
            };

            const makeStudentLabel=(student:{id:string;name:string;meta:string},role:'competitor'|'reserve')=>{
              const label=document.createElement('label');
              label.className=role==='competitor'?'competitorChoice':'reserveChoice';
              const checked=role==='competitor'?competitorIds.has(student.id):reserveIds.has(student.id);
              label.innerHTML=`<input type="checkbox" value="${student.id}" ${checked?'checked':''}><span><b>${student.name}</b><small>${student.meta}</small></span>`;
              const box=label.querySelector('input') as HTMLInputElement;
              box.addEventListener('change',()=>{
                if(box.checked){
                  const opposite=editor.querySelector<HTMLInputElement>(`[data-picker="${role==='competitor'?'reserve':'competitor'}"] input[value="${CSS.escape(student.id)}"]`);
                  if(opposite)opposite.checked=false;
                }
                updateCounts();
              });
              return label;
            };

            for(const student of catalog){
              competitorPicker?.appendChild(makeStudentLabel(student,'competitor'));
              reservePicker?.appendChild(makeStudentLabel(student,'reserve'));
            }

            team.appendChild(editor);
            (header.querySelector('[data-team-edit]') as HTMLButtonElement).style.display='none';
            qs<HTMLButtonElement>(editor,'[data-team-cancel]')?.addEventListener('click',()=>{editor.remove();(header.querySelector('[data-team-edit]') as HTMLButtonElement).style.display='';});
            qs<HTMLButtonElement>(editor,'[data-team-save]')?.addEventListener('click',async()=>{
              const save=qs<HTMLButtonElement>(editor,'[data-team-save]');if(!save)return;
              const newDate=(qs<HTMLInputElement>(editor,'[data-field="competition_date"]')?.value||'').trim();
              const newCategory=(qs<HTMLInputElement>(editor,'[data-field="category"]')?.value||'').trim();
              const newCompetitors=Array.from(editor.querySelectorAll<HTMLInputElement>('[data-picker="competitor"] input[type="checkbox"]:checked')).map(x=>x.value);
              const newReserves=Array.from(editor.querySelectorAll<HTMLInputElement>('[data-picker="reserve"] input[type="checkbox"]:checked')).map(x=>x.value);
              const overlap=newCompetitors.filter(id=>newReserves.includes(id));
              if(!newDate||!newCategory||(!newCompetitors.length&&!newReserves.length)){alert('請確認比賽日期、組別名稱，並至少保留一位參賽或後備選手');return;}
              if(overlap.length){alert('同一位選手不能同時設定為參賽與後備');return;}
              save.disabled=true;save.textContent='儲存中…';
              const fd=new FormData();
              fd.set('intent','update_team');
              fd.set('competition_id',competitionId);
              fd.set('old_competition_date',date);
              fd.set('old_category',category);
              fd.set('competition_date',newDate);
              fd.set('category',newCategory);
              newCompetitors.forEach(id=>fd.append('competitor_student_ids',id));
              newReserves.forEach(id=>fd.append('reserve_student_ids',id));
              try{
                const res=await fetch('/api/competition-participants',{method:'POST',body:fd});const data=await res.json();
                if(!res.ok||!data.ok)throw new Error(data.error||'儲存失敗');
                window.location.href=`${window.location.pathname}?team_updated=1#participants`;
              }catch(err){alert(err instanceof Error?err.message:'儲存失敗');save.disabled=false;save.textContent='儲存整隊';}
            });
          });
        }
      });

      if(addForm.dataset.stableSubmit!=='1'){
        addForm.dataset.stableSubmit='1';
        addForm.addEventListener('submit',async(e)=>{
          e.preventDefault();
          const button=addForm.querySelector('button[type="submit"],button:not([type])') as HTMLButtonElement|null;
          if(button){button.disabled=true;button.textContent='加入中…';}
          const fd=new FormData(addForm);fd.set('intent','add');
          try{
            const res=await fetch('/api/competition-participants',{method:'POST',body:fd});const data=await res.json();
            if(!res.ok||!data.ok)throw new Error(data.error||'加入失敗');
            window.location.href=`${window.location.pathname}?participant_added=${data.added??0}#participants`;
          }catch(err){alert(err instanceof Error?err.message:'加入失敗');if(button){button.disabled=false;button.textContent='加入勾選學生';}}
        });
      }
      return true;
    };

    init();
    observer=new MutationObserver(()=>init());observer.observe(document.body,{childList:true,subtree:true});
    [100,300,700,1500].forEach(ms=>window.setTimeout(init,ms));

    const style=document.createElement('style');style.dataset.participantEnhancer='1';style.textContent=`
      #participants{scroll-margin-top:18px}.participantList{display:grid;gap:12px}.participantTeam{border:1px solid var(--theme-border,#dfe4eb);border-radius:16px;background:color-mix(in srgb,var(--theme-soft,#f7f4ff) 45%,white);overflow:hidden}.participantTeamHead{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--theme-border,#e5e7eb)}.participantTeamHead>div{display:grid;gap:3px}.participantTeamHead strong{font-size:14px}.participantTeamHead small{font-size:11px;color:#778196}.participantTeamMembers{display:grid;gap:8px;padding:10px}.participantTeamMembers>.participant{margin:0}.participantRoleDivider{margin:2px 0 0;padding:5px 9px;border-radius:999px;width:max-content;font-size:10px;font-weight:900;letter-spacing:.05em}.participantRoleDivider.competitor{background:#e8f7ef;color:#127a47}.participantRoleDivider.reserve{background:#fff1dc;color:#a75a05}.participantCompetitor{border-color:#cfeadb!important;background:#f8fffb!important}.participantReserve{border-color:#f3dfbd!important;background:#fffaf2!important}.participantRoleBadgeCompetitor{background:#e8f7ef!important;color:#127a47!important;border:1px solid #c8ead6!important}.participantRoleBadgeReserve{background:#fff1dc!important;color:#a75a05!important;border:1px solid #f2d5aa!important}.participantTeamEditor{padding:14px;border-top:1px solid var(--theme-border,#e5e7eb);background:#fff}.teamEditorGrid{display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:10px}.teamEditorGrid.compact{grid-template-columns:1fr 1.5fr}.teamEditorGrid label{display:grid;gap:5px;font-size:11px;font-weight:800;color:#687386}.teamEditorGrid input,.teamEditorGrid select{width:100%;padding:9px 10px;border:1px solid #dfe4eb;border-radius:10px;background:#fff;color:#172033;font:inherit}.teamEditorHint{margin:12px 0 10px;padding:9px 10px;border-radius:10px;background:var(--theme-soft,#f7f4ff);font-size:11px;color:#667085}.dualRosterEditor{display:grid;grid-template-columns:1fr 1fr;gap:12px}.rosterPicker{border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;background:#fff}.rosterPicker.competitorPicker{border-color:#cfeadb}.rosterPicker.reservePicker{border-color:#f3dfbd}.rosterPickerHead{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;font-size:12px}.competitorPicker .rosterPickerHead{background:#eefaf3;color:#127a47}.reservePicker .rosterPickerHead{background:#fff6e7;color:#a75a05}.rosterPickerHead span{font-size:10px;font-weight:900}.teamStudentPicker{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:320px;overflow:auto;padding:10px}.teamStudentPicker label{display:flex;gap:8px;align-items:flex-start;padding:9px;border:1px solid #e6e9ef;border-radius:11px;cursor:pointer}.teamStudentPicker label.competitorChoice:has(input:checked){background:#f2fbf6;border-color:#bfe4cf}.teamStudentPicker label.reserveChoice:has(input:checked){background:#fff8ec;border-color:#efcf9c}.teamStudentPicker span{display:grid}.teamStudentPicker b{font-size:12px}.teamStudentPicker small{font-size:10px;color:#8791a1}.participantEditActions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}@media(max-width:850px){.dualRosterEditor{grid-template-columns:1fr}.teamStudentPicker{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.teamEditorGrid,.teamEditorGrid.compact,.teamStudentPicker{grid-template-columns:1fr}.participantTeamHead{align-items:flex-start}.participantTeamHead button{white-space:nowrap}}
    `;document.head.appendChild(style);
    return()=>{stopped=true;observer?.disconnect();style.remove();};
  },[]);
  return null;
}
