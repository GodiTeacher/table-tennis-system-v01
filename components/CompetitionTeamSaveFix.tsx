'use client';

import {useEffect} from 'react';

export default function CompetitionTeamSaveFix(){
  useEffect(()=>{
    const handler=async(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null;
      const button=target?.closest('[data-team-save]') as HTMLButtonElement|null;
      if(!button)return;

      const editor=button.closest('.participantTeamEditor') as HTMLElement|null;
      const team=button.closest('.participantTeam') as HTMLElement|null;
      const participantSection=document.querySelector('#participants') as HTMLElement|null;
      if(!editor||!team||!participantSection)return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const addForm=Array.from(participantSection.querySelectorAll('form')).find(form=>
        form.querySelector('input[name="competition_id"]')&&form.querySelector('input[name="student_ids"]')
      ) as HTMLFormElement|undefined;
      const competitionId=(addForm?.querySelector('input[name="competition_id"]') as HTMLInputElement|null)?.value||'';
      const head=team.querySelector('.participantTeamHead');
      const oldCategory=head?.querySelector('strong')?.textContent?.trim()||'';
      const oldDate=(head?.querySelector('small')?.textContent||'').split('·')[0]?.trim()||'';
      const newDate=(editor.querySelector('[data-field="competition_date"]') as HTMLInputElement|null)?.value?.trim()||'';
      const newCategory=(editor.querySelector('[data-field="category"]') as HTMLInputElement|null)?.value?.trim()||'';
      const competitorIds=Array.from(editor.querySelectorAll<HTMLInputElement>('[data-picker="competitor"] input[type="checkbox"]:checked')).map(x=>x.value);
      const reserveIds=Array.from(editor.querySelectorAll<HTMLInputElement>('[data-picker="reserve"] input[type="checkbox"]:checked')).map(x=>x.value);
      const overlap=competitorIds.filter(id=>reserveIds.includes(id));

      if(!competitionId||!oldCategory||!oldDate||!newDate||!newCategory||(!competitorIds.length&&!reserveIds.length)){
        alert('請確認比賽日期、組別名稱，並至少保留一位參賽或後備選手');
        return;
      }
      if(overlap.length){
        alert('同一位選手不能同時設定為參賽與後備');
        return;
      }

      button.disabled=true;
      button.textContent='儲存中…';

      const fd=new FormData();
      fd.set('intent','update_team');
      fd.set('competition_id',competitionId);
      fd.set('old_competition_date',oldDate);
      fd.set('old_category',oldCategory);
      fd.set('competition_date',newDate);
      fd.set('category',newCategory);
      competitorIds.forEach(id=>fd.append('competitor_student_ids',id));
      reserveIds.forEach(id=>fd.append('reserve_student_ids',id));

      let navigated=false;
      const refresh=()=>{
        if(navigated)return;
        navigated=true;
        const stamp=Date.now();
        window.location.replace(`${window.location.pathname}?team_updated=1&_=${stamp}#participants`);
      };
      const watchdog=window.setTimeout(refresh,4500);

      try{
        const res=await fetch('/api/competition-participants',{method:'POST',body:fd,keepalive:true,cache:'no-store'});
        const data=await res.json().catch(()=>({ok:false,error:'儲存回應格式異常'}));
        if(!res.ok||!data.ok)throw new Error(data.error||'儲存失敗');
        window.clearTimeout(watchdog);
        refresh();
      }catch(err){
        window.clearTimeout(watchdog);
        if(!navigated){
          alert(err instanceof Error?err.message:'儲存失敗');
          button.disabled=false;
          button.textContent='儲存整隊';
        }
      }
    };

    document.addEventListener('click',handler,true);
    return()=>document.removeEventListener('click',handler,true);
  },[]);
  return null;
}
