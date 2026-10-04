'use client';

import {useEffect} from 'react';

function qs<T extends Element>(root:ParentNode, selector:string){return root.querySelector(selector) as T|null}

export default function CompetitionParticipantEnhancer(){
  useEffect(()=>{
    let disposed=false;
    const cleanups:Array<()=>void>=[];

    const ensureStyle=()=>{
      if(document.head.querySelector('style[data-participant-enhancer="1"]'))return;
      const style=document.createElement('style');
      style.dataset.participantEnhancer='1';
      style.textContent=`
        #participants{scroll-margin-top:18px}
        .participant{position:relative}
        .participantEditButton{margin-left:auto;white-space:nowrap}
        .participantEditPanel{grid-column:1/-1;width:100%;margin-top:10px;padding:12px;border-radius:14px;background:var(--theme-soft,#f7f4ff);display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:10px;align-items:end}
        .participantEditPanel label{display:grid;gap:5px;font-size:11px;color:#6b7587;font-weight:800}
        .participantEditPanel input,.participantEditPanel select{width:100%;padding:9px 10px;border:1px solid #dfe4eb;border-radius:10px;background:#fff;color:#172033;font:inherit}
        .participantEditActions{display:flex;gap:8px;grid-column:1/-1;justify-content:flex-end}
        @media(max-width:640px){.participantEditPanel{grid-template-columns:1fr}.participantEditActions{grid-column:auto}.participantEditButton{margin-left:0}}
      `;
      document.head.appendChild(style);
      cleanups.push(()=>style.remove());
    };

    const enhance=()=>{
      if(disposed)return false;
      const sections=Array.from(document.querySelectorAll('section.card'));
      const participantSection=sections.find(section=>section.querySelector('h2')?.textContent?.trim()==='參賽名單') as HTMLElement|undefined;
      if(!participantSection)return false;

      participantSection.id='participants';
      ensureStyle();

      const addForm=Array.from(participantSection.querySelectorAll('form')).find(form=>
        form.querySelector('input[name="student_ids"]')&&form.querySelector('input[name="competition_date"]')
      ) as HTMLFormElement|undefined;
      const addDate=addForm?.querySelector('input[name="competition_date"]') as HTMLInputElement|null;
      const minDate=addDate?.min||'';
      const maxDate=addDate?.max||'';

      participantSection.querySelectorAll<HTMLElement>('.participant').forEach(row=>{
        if(row.querySelector('.participantEditButton'))return;
        const removeForm=Array.from(row.querySelectorAll('form')).find(form=>form.querySelector('input[name="participant_id"]')) as HTMLFormElement|undefined;
        const participantId=qs<HTMLInputElement>(row,'input[name="participant_id"]')?.value;
        const competitionId=qs<HTMLInputElement>(row,'input[name="competition_id"]')?.value;
        const badge=Array.from(row.children).find(el=>el.tagName==='SPAN') as HTMLSpanElement|undefined;
        const dateHeading=row.closest('.competitionDay')?.querySelector('h3')?.textContent?.trim()||'';
        if(!participantId||!competitionId||!badge||!removeForm)return;

        const text=badge.textContent?.trim()||'';
        const parts=text.split('·').map(x=>x.trim()).filter(Boolean);
        const roleText=parts[0]||'參賽';
        const category=parts.slice(1).join(' · ');
        const participantRole=roleText==='後備'?'reserve':'competitor';

        const editButton=document.createElement('button');
        editButton.type='button';
        editButton.className='secondaryButton participantEditButton';
        editButton.textContent='編輯';
        removeForm.before(editButton);

        const onEdit=()=>{
          if(row.querySelector('.participantEditPanel'))return;
          const panel=document.createElement('div');
          panel.className='participantEditPanel';
          panel.innerHTML=`
            <label>比賽日期<input type="date" data-field="competition_date" value="${dateHeading}" ${minDate?`min="${minDate}"`:''} ${maxDate?`max="${maxDate}"`:''}></label>
            <label>組別<input data-field="category" value="${category.replace(/"/g,'&quot;')}" placeholder="例如：中年級男子組"></label>
            <label>身分<select data-field="participant_role"><option value="competitor" ${participantRole==='competitor'?'selected':''}>參賽</option><option value="reserve" ${participantRole==='reserve'?'selected':''}>後備</option></select></label>
            <div class="participantEditActions"><button type="button" class="primaryButton" data-save>儲存</button><button type="button" class="secondaryButton" data-cancel>取消</button></div>
          `;
          row.appendChild(panel);
          editButton.style.display='none';

          qs<HTMLButtonElement>(panel,'[data-cancel]')?.addEventListener('click',()=>{panel.remove();editButton.style.display='';});
          qs<HTMLButtonElement>(panel,'[data-save]')?.addEventListener('click',async()=>{
            const save=qs<HTMLButtonElement>(panel,'[data-save]');
            if(!save)return;
            const date=(qs<HTMLInputElement>(panel,'[data-field="competition_date"]')?.value||'').trim();
            const cat=(qs<HTMLInputElement>(panel,'[data-field="category"]')?.value||'').trim();
            const role=qs<HTMLSelectElement>(panel,'[data-field="participant_role"]')?.value||'competitor';
            if(!date||!cat){alert('請填寫比賽日期與組別');return;}
            save.disabled=true;save.textContent='儲存中…';
            const fd=new FormData();
            fd.set('intent','update');fd.set('competition_id',competitionId);fd.set('participant_id',participantId);fd.set('competition_date',date);fd.set('category',cat);fd.set('participant_role',role);
            try{
              const res=await fetch('/api/competition-participants',{method:'POST',body:fd});
              const data=await res.json();
              if(!res.ok||!data.ok)throw new Error(data.error||'儲存失敗');
              window.location.assign(`${window.location.pathname}?participant_updated=1#participants`);
            }catch(err){alert(err instanceof Error?err.message:'儲存失敗');save.disabled=false;save.textContent='儲存';}
          });
        };
        editButton.addEventListener('click',onEdit);
        cleanups.push(()=>editButton.removeEventListener('click',onEdit));
      });

      if(addForm && addForm.dataset.stableParticipantSubmit!=='1'){
        addForm.dataset.stableParticipantSubmit='1';
        const submitHandler=async(e:SubmitEvent)=>{
          e.preventDefault();
          const button=addForm.querySelector('button[type="submit"],button:not([type])') as HTMLButtonElement|null;
          if(button){button.disabled=true;button.textContent='加入中…';}
          const fd=new FormData(addForm);fd.set('intent','add');
          try{
            const res=await fetch('/api/competition-participants',{method:'POST',body:fd});
            const data=await res.json();
            if(!res.ok||!data.ok)throw new Error(data.error||'加入失敗');
            const p=new URLSearchParams();
            p.set('participant_added',String(data.added??0));
            if(data.skipped)p.set('participant_skipped',String(data.skipped));
            window.location.assign(`${window.location.pathname}?${p.toString()}#participants`);
          }catch(err){alert(err instanceof Error?err.message:'加入失敗');if(button){button.disabled=false;button.textContent='加入勾選學生';}}
        };
        addForm.addEventListener('submit',submitHandler);
        cleanups.push(()=>{addForm.removeEventListener('submit',submitHandler);delete addForm.dataset.stableParticipantSubmit;});
      }
      return true;
    };

    enhance();
    const observer=new MutationObserver(()=>enhance());
    observer.observe(document.body,{childList:true,subtree:true});
    const timers=[100,300,700,1500].map(ms=>window.setTimeout(enhance,ms));

    return()=>{
      disposed=true;
      observer.disconnect();
      timers.forEach(clearTimeout);
      cleanups.forEach(fn=>fn());
    };
  },[]);
  return null;
}
