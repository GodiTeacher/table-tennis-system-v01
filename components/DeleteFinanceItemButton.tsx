'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DeleteFinanceItemButton({
  id,
  month,
}:{id:string;month:string}){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const remove=async()=>{
    if(busy)return;
    if(!window.confirm('確定要刪除這筆收支嗎？'))return;

    setBusy(true);
    setError('');

    const supabase=createClient();
    const {error}=await supabase
      .from('finance_items')
      .delete()
      .eq('id',id);

    if(error){
      setError(error.message);
      setBusy(false);
      return;
    }

    window.location.href=`/payroll?month=${encodeURIComponent(month)}#finance`;
  };

  return <div>
    <button
      type="button"
      className="dangerButton"
      onClick={remove}
      disabled={busy}
    >
      {busy?'刪除中…':'刪除'}
    </button>
    {error?<small style={{display:'block',color:'#b42318',marginTop:4}}>{error}</small>:null}
  </div>;
}
