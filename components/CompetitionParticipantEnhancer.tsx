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
          const role=members.every(m=>m.participantRole==='reserve')?'reserve':'competitor';
          const date=members[0]?.date||'';
          const header=document.createElement('div');
          header.className='participantTeamHead';
          header.innerHTML=`<div><strong>${category}</strong><small>${date} · ${members.length} 人</small></div><button type="button" class="secondaryButton" data-team-edit>編輯隊伍</button>`;
          const body=document.createElement('div');body.className='participantTeamMembers';
          const roleOrder:Record<string,number>={competitor:0,reserve:1};
          members
            .sort((a,b)=>{
              const roleDiff=(roleOrder[a.participantRole]??9)-(roleOrder[b.participantRole]??9);
              return roleDiff!==0?roleDiff:a.studentName.localeCompare(b.studentName,'zh-Hant');
            })
            .forEach(m=>{
              const badge=Array.from(m.row.children).find(el=>el.tagName==='SPAN') as HTMLSpanElement|undefined;
              if(badge)badge.textContent=m.participantRole==='reserve'?'後備':'參賽';
              body.appendChild(m.row);
            });
          team.append(header,body);
          list.appendChild(team);

          qs<HTMLButtonElement>(header,'[data-team-edit]')?.addEventListener('click',()=>{
            if(team.querySelector('.participantTeamEditor'))return;
            const selectedIds=new Set(members.map(m=>m.studentId).filter(Boolean));
            const editor=document.createElement('div');editor.className='participantTeamEditor';
            editor.innerHTML=`
              <div class="teamEditorGrid">
                <label>比賽日期<input type="date" data-field="competition_date" value="${date}" ${minDate?`min="${minDate}"`:''} ${maxDate?`max="${maxDate}"`:''}></label>
                <label>組別名稱<input data-field="category" value="${category.replace(/"/g,'&quot;')}"></label>
                <label>身分<select data-field="participant_role"><option value="competitor" ${role==='competitor'?'selected':''}>參賽</option><option value="reserve" ${role==='reserve'?'selected':''}>後備</option></select></label>
              </div>
              <div class="teamEditorHint">隊員以勾選名單為準：取消勾選＝換下，勾選新學生＝換上。</div>
              <div class="teamStudentPicker"></div>
              <div class="participantEditActions"><button type="button" class="primaryButton" data-team-save>儲存整隊</button><button type="button" class="secondaryButton" data-team-cancel>取消</button></div>
            `;
            const picker=qs<HTMLElement>(editor,'.teamStudentPicker');
            if(picker){
              for(const student of catalog){
                const label=document.createElement('label');
                label.innerHTML=`<input type="checkbox" value="${student.id}" ${selectedIds.has(student.id)?'checked':''}><span><b>${student.name}</b><small>${student.meta}</small></span>`;
                picker.appendChild(label);
              }
            }
            team.appendChild(editor);
            (header.querySelector('[data-team-edit]') as HTMLButtonElement).style.display='none';
            qs<HTMLButtonElement>(editor,'[data-team-cancel]')?.addEventListener('click',()=>{editor.remove();(header.querySelector('[data-team-edit]') as HTMLButtonElement).style.display='';});
            qs<HTMLButtonElement>(editor,'[data-team-save]')?.addEventListener('click',async()=>{
              const save=qs<HTMLButtonElement>(editor,'[data-team-save]');if(!save)return;
              const newDate=(qs<HTMLInputElement>(editor,'[data-field="competition_date"]')?.value||'').trim();
              const newCategory=(qs<HTMLInputElement>(editor,'[data-field="category"]')?.value||'').trim();
              const newRole=qs<HTMLSelectElement>(editor,'[data-field="participant_role"]')?.value||'competitor';
              const newStudents=Array.from(editor.querySelectorAll<HTMLInputElement>('.teamStudentPicker input[type="checkbox"]:checked')).map(x=>x.value);
              if(!newDate||!newCategory||!newStudents.length){alert('請確認比賽日期、組別名稱，並至少保留一位隊員');return;}
              save.disabled=true;save.textContent='儲存中…';
              const fd=new FormData();fd.set('intent','update_team');fd.set('competition_id',competitionId);fd.set('old_competition_date',date);fd.set('old_category',category);fd.set('competition_date',newDate);fd.set('category',newCategory);fd.set('participant_role',newRole);newStudents.forEach(id=>fd.append('student_ids',id));
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
      #participants{scroll-margin-top:18px}.participantList{display:grid;gap:12px}.participantTeam{border:1px solid var(--theme-border,#dfe4eb);border-radius:16px;background:color-mix(in srgb,var(--theme-soft,#f7f4ff) 45%,white);overflow:hidden}.participantTeamHead{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--theme-border,#e5e7eb)}.participantTeamHead>div{display:grid;gap:3px}.participantTeamHead strong{font-size:14px}.participantTeamHead small{font-size:11px;color:#778196}.participantTeamMembers{display:grid;gap:8px;padding:10px}.participantTeamMembers>.participant{margin:0}.participantTeamEditor{padding:14px;border-top:1px solid var(--theme-border,#e5e7eb);background:#fff}.teamEditorGrid{display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:10px}.teamEditorGrid label{display:grid;gap:5px;font-size:11px;font-weight:800;color:#687386}.teamEditorGrid input,.teamEditorGrid select{width:100%;padding:9px 10px;border:1px solid #dfe4eb;border-radius:10px;background:#fff;color:#172033;font:inherit}.teamEditorHint{margin:12px 0 8px;padding:9px 10px;border-radius:10px;background:var(--theme-soft,#f7f4ff);font-size:11px;color:#667085}.teamStudentPicker{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-height:280px;overflow:auto}.teamStudentPicker label{display:flex;gap:8px;align-items:flex-start;padding:9px;border:1px solid #e6e9ef;border-radius:11px;cursor:pointer}.teamStudentPicker span{display:grid}.teamStudentPicker b{font-size:12px}.teamStudentPicker small{font-size:10px;color:#8791a1}.participantEditActions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}@media(max-width:700px){.teamEditorGrid,.teamStudentPicker{grid-template-columns:1fr}.participantTeamHead{align-items:flex-start}.participantTeamHead button{white-space:nowrap}}
    `;document.head.appendChild(style);
    return()=>{stopped=true;observer?.disconnect();style.remove();};
  },[]);
  return null;
}
