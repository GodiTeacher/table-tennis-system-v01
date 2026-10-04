'use client';

import {useEffect} from 'react';

function qs<T extends Element>(root:ParentNode, selector:string){return root.querySelector(selector) as T|null}

export default function CompetitionParticipantEnhancer(){
  useEffect(()=>{
    const sections=Array.from(document.querySelectorAll('section.card'));
    const participantSection=sections.find(section=>section.querySelector('h2')?.textContent?.trim()==='參賽名單') as HTMLElement|undefined;
    if(!participantSection)return;
    participantSection.id='participants';

    const addForm=Array.from(participantSection.querySelectorAll('form')).find(form=>
      form.querySelector('input[name="student_ids"]')&&form.querySelector('input[name="competition_date"]')
    ) as HTMLFormElement|undefined;

    const addDate=addForm?.querySelector('input[name="competition_date"]') as HTMLInputElement|null;
    const minDate=addDate?.min||'';
    const maxDate=addDate?.max||'';

    const enhanceRow=(row:HTMLElement)=>{
      if(row.dataset.participantEnhanced==='1')return;
      const removeForm=qs<HTMLFormElement>(row,'form');
      const participantId=qs<HTMLInputElement>(row,'input[name="participant_id"]')?.value;
      const competitionId=qs<HTMLInputElement>(row,'input[name="competition_id"]')?.value;
      const badge=Array.from(row.children).find(el=>el.tagName==='SPAN') as HTMLSpanElement|undefined;
      const dateHeading=row.closest('.competitionDay')?.querySelector('h3')?.textContent?.trim()||'';
      if(!participantId||!competitionId||!badge||!removeForm)return;

      row.dataset.participantEnhanced='1';
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

      editButton.addEventListener('click',()=>{
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
            window.location.href=`${window.location.pathname}?participant_updated=1#participants`;
          }catch(err){alert(err instanceof Error?err.message:'儲存失敗');save.disabled=false;save.textContent='儲存';}
        });
      });
    };

    participantSection.querySelectorAll<HTMLElement>('.participant').forEach(enhanceRow);

    const submitHandler=async(e:SubmitEvent)=>{
      e.preventDefault();
      if(!addForm)return;
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
        window.location.href=`${window.location.pathname}?${p.toString()}#participants`;
      }catch(err){alert(err instanceof Error?err.message:'加入失敗');if(button){button.disabled=false;button.textContent='加入勾選學生';}}
    };
    addForm?.addEventListener('submit',submitHandler);

    const style=document.createElement('style');
    style.dataset.participantEnhancer='1';
    style.textContent=`
      #participants{scroll-margin-top:18px}
      .participantEditButton{margin-left:auto}
      .participantEditPanel{grid-column:1/-1;width:100%;margin-top:10px;padding:12px;border-radius:14px;background:var(--theme-soft,#f7f4ff);display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:10px;align-items:end}
      .participantEditPanel label{display:grid;gap:5px;font-size:11px;color:#6b7587;font-weight:800}
      .participantEditPanel input,.participantEditPanel select{width:100%;padding:9px 10px;border:1px solid #dfe4eb;border-radius:10px;background:#fff;color:#172033;font:inherit}
      .participantEditActions{display:flex;gap:8px;grid-column:1/-1;justify-content:flex-end}
      @media(max-width:640px){.participantEditPanel{grid-template-columns:1fr}.participantEditActions{grid-column:auto}.participantEditButton{margin-left:0}}
    `;
    document.head.appendChild(style);

    return()=>{addForm?.removeEventListener('submit',submitHandler);style.remove();};
  },[]);
  return null;
}
