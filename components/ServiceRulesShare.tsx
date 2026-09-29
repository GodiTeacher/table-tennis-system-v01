'use client';

import { useState } from 'react';

const NOTICE = `📣 球皮 & 球板更換公告

為了讓孩子們的球具維持良好狀態，也方便家長處理球皮、球板更換問題，教練團提供球具更換及黏貼服務🏓

✅ 由教練協助訂購球皮／球板
可免費協助球皮黏貼、裁切；若後續發生脫膠，也可免費重新黏貼，不另收黏貼耗材費。
加購護邊：30元。

✅ 自行購買球皮／球板
若需要教練協助更換、黏貼或裁切，將依服務規則收費：
・更換球皮（一面）100元
・再次黏貼 50元
・更換球板（一次）200元
・更換護邊 50元

📌 球皮、球板及護邊皆屬消耗品。
詳細服務內容與注意事項請參考 App「球皮／球板代工規則」。如有特殊需求，請先與教練討論，謝謝！`;

export default function ServiceRulesShare(){
  const [copied,setCopied]=useState(false);
  async function copy(){
    await navigator.clipboard.writeText(NOTICE);
    setCopied(true);
    window.setTimeout(()=>setCopied(false),1800);
  }
  return <button type="button" className="primaryButton" onClick={copy}>{copied?'✓ 已複製':'複製家長公告 LINE 文字'}</button>;
}
