'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

function valueOf(card:Element,name:string){
  const el=card.querySelector(`[name="${name}"]`) as HTMLInputElement|HTMLSelectElement|null;
  if(!el)return '';
  return String(el.value??'').trim();
}

export default function StudentRosterTableEnhancer(){
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname!=='/students')return;
    let cleanup=()=>{};
    const timer=window.setTimeout(()=>{
      const list=document.querySelector('.studentList');
      if(!list||document.querySelector('.studentRosterCompact'))return;
      const cards=[...list.querySelectorAll('.studentManageCard')];
      if(!cards.length)return;

      const host=document.createElement('div');
      host.className='studentRosterCompact';
      const toolbar=document.createElement('div');
      toolbar.className='studentRosterCompactToolbar';
      const info=document.createElement('div');
      info.innerHTML='<b>名單總覽</b><small>平常用表格快速查看；需要修改時再進入編輯模式。</small>';
      const edit=document.createElement('button'); edit.type='button'; edit.className='secondaryButton'; edit.textContent='✎ 進入編輯模式';
      toolbar.append(info,edit);

      const wrap=document.createElement('div'); wrap.className='studentRosterCompactTableWrap';
      const table=document.createElement('table'); table.className='studentRosterCompactTable';
      table.innerHTML='<thead><tr><th>姓名</th><th>年級</th><th>班級</th><th>座號</th><th>性別</th><th>狀態</th><th></th></tr></thead>';
      const tbody=document.createElement('tbody');
      for(const card of cards){
        const name=valueOf(card,'display_name')||card.querySelector('.studentProfileLink b')?.textContent?.trim()||'';
        const grade=valueOf(card,'grade'); const className=valueOf(card,'class_name'); const seat=valueOf(card,'seat_number'); const gender=valueOf(card,'gender');
        const active=card.classList.contains('inactive')?false:true;
        const profile=card.querySelector('.studentProfileLink') as HTMLAnchorElement|null;
        const tr=document.createElement('tr'); if(!active)tr.className='inactive';
        const cells=[name,grade?`${grade} 年級`:'—',className||'—',seat||'—',gender||'—'];
        for(const text of cells){const td=document.createElement('td');td.textContent=text;tr.appendChild(td);}
        const status=document.createElement('td');status.innerHTML=`<span class="studentRosterStatus ${active?'active':''}">${active?'啟用中':'已停用'}</span>`;tr.appendChild(status);
        const action=document.createElement('td'); if(profile){const a=document.createElement('a');a.href=profile.href;a.textContent='個人資料 ›';a.className='studentRosterProfileLink';action.appendChild(a);}tr.appendChild(action);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);wrap.appendChild(table);host.append(toolbar,wrap);list.parentElement?.insertBefore(host,list);

      const setEditing=(editing:boolean)=>{
        document.documentElement.classList.toggle('studentRosterEditMode',editing);
        edit.textContent=editing?'✓ 完成編輯／返回總覽':'✎ 進入編輯模式';
        if(editing)setTimeout(()=>list.scrollIntoView({behavior:'smooth',block:'start'}),30);
      };
      edit.addEventListener('click',()=>setEditing(!document.documentElement.classList.contains('studentRosterEditMode')));
      cleanup=()=>{edit.remove();host.remove();document.documentElement.classList.remove('studentRosterEditMode');};
    },50);
    return()=>{window.clearTimeout(timer);cleanup();};
  },[pathname]);

  if(pathname!=='/students')return null;
  return <style jsx global>{`
    .studentRosterCompact{margin-top:4px}.studentRosterCompactToolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.studentRosterCompactToolbar>div{display:flex;flex-direction:column;gap:2px}.studentRosterCompactToolbar small{color:#7b8795;font-size:12px}.studentRosterCompactTableWrap{overflow:auto;border:1px solid #e3e8ee;border-radius:15px}.studentRosterCompactTable{width:100%;border-collapse:collapse;min-width:720px;background:#fff}.studentRosterCompactTable th,.studentRosterCompactTable td{padding:10px 12px;border-bottom:1px solid #edf0f3;text-align:left;white-space:nowrap}.studentRosterCompactTable th{position:sticky;top:0;background:#f7f9fb;color:#6d7988;font-size:11px;letter-spacing:.03em;z-index:1}.studentRosterCompactTable td{font-size:13px;color:#273444}.studentRosterCompactTable tr:last-child td{border-bottom:0}.studentRosterCompactTable tr.inactive td{opacity:.55;background:#fafafa}.studentRosterStatus{display:inline-flex;padding:4px 8px;border-radius:999px;background:#eef1f4;color:#77818f;font-size:11px;font-weight:900}.studentRosterStatus.active{background:#e8f7f0;color:#177253}.studentRosterProfileLink{color:var(--theme-accent,#0f766e);font-weight:850;text-decoration:none}.studentRosterCompact~.studentList{display:none}.studentRosterEditMode .studentRosterCompactTableWrap{display:none}.studentRosterEditMode .studentRosterCompactToolbar{position:sticky;top:8px;z-index:12;padding:8px 10px;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border:1px solid #e5e9ee;border-radius:14px}.studentRosterEditMode .studentRosterCompact~.studentList{display:block}.studentRosterEditMode .studentRosterCompactToolbar small{display:none}@media(max-width:680px){.studentRosterCompactToolbar{align-items:flex-start;flex-direction:column}.studentRosterCompactToolbar button{width:100%}.studentRosterCompactTable th,.studentRosterCompactTable td{padding:9px 10px}.studentRosterCompactTable{min-width:650px}}
  `}</style>;
}
