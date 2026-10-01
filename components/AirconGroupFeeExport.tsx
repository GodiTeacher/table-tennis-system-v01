'use client';

import { useState } from 'react';
import { canvasToBlob, saveOrShareBlob } from '@/lib/client-download';

type Row={name:string;monthlyFee:number;members:number;personHours:number;groupCoolingFee:number;coolingPerPerson:number;totalPerPerson:number};
type Unclassified={personHours:number;groupCoolingFee:number}|null;

function money(v:number){return `$${Math.round(v).toLocaleString()}`;}
function monthLabel(month:string){const [y,m]=month.split('-');return `${y}年${Number(m)}月`;}
function wrapText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number){const out:string[]=[];let line='';for(const ch of text){const next=line+ch;if(line&&ctx.measureText(next).width>maxWidth){out.push(line);line=ch;}else line=next;}if(line)out.push(line);return out;}

function buildLineText(month:string,totalCost:number,rows:Row[],unclassified:Unclassified){
  const lines=[`📣 ${monthLabel(month)} 冷氣費整理`,`本月學校冷氣費：${money(totalCost)}`,'','各月費群組應收：'];
  rows.forEach(r=>{lines.push(`【${r.name}】`);lines.push(`原月費 ${money(r.monthlyFee)}｜收費 ${r.members} 人`);lines.push(`冷氣使用 ${r.personHours.toFixed(1)} 人時｜群組應收冷氣費 ${money(r.groupCoolingFee)}`);lines.push(`每人冷氣費 ${money(r.coolingPerPerson)}｜每人本月應收 ${money(r.totalPerPerson)}`,'');});
  if(unclassified&&unclassified.groupCoolingFee>0){lines.push(`【未分類／其他】`);lines.push(`冷氣使用 ${unclassified.personHours.toFixed(1)} 人時｜應分攤 ${money(unclassified.groupCoolingFee)}`,'');}
  lines.push('※ 冷氣費實際收費採無條件進位至整元。');
  return lines.join('\n');
}

export default function AirconGroupFeeExport({month,totalCost,rows,unclassified}:{month:string;totalCost:number;rows:Row[];unclassified:Unclassified}){
  const [copied,setCopied]=useState(false);const text=buildLineText(month,totalCost,rows,unclassified);
  async function copyText(){await navigator.clipboard.writeText(text);setCopied(true);window.setTimeout(()=>setCopied(false),1600);}
  async function exportImage(){
    const canvas=document.createElement('canvas');const width=1080,pad=68,contentWidth=width-pad*2;const ctx=canvas.getContext('2d');if(!ctx)return;
    const items:Array<{text:string;size:number;weight:number;gap:number;accent?:boolean}>=[];
    items.push({text:`${monthLabel(month)} 冷氣費整理`,size:50,weight:800,gap:14});
    items.push({text:`本月學校冷氣費：${money(totalCost)}`,size:31,weight:700,gap:28,accent:true});
    rows.forEach(r=>{items.push({text:r.name,size:38,weight:800,gap:8});items.push({text:`原月費 ${money(r.monthlyFee)}｜收費 ${r.members} 人｜冷氣使用 ${r.personHours.toFixed(1)} 人時`,size:27,weight:500,gap:5});items.push({text:`群組應收冷氣費 ${money(r.groupCoolingFee)}｜每人冷氣費 ${money(r.coolingPerPerson)}｜每人本月應收 ${money(r.totalPerPerson)}`,size:30,weight:700,gap:24,accent:true});});
    if(unclassified&&unclassified.groupCoolingFee>0){items.push({text:'未分類／其他',size:36,weight:800,gap:8});items.push({text:`冷氣使用 ${unclassified.personHours.toFixed(1)} 人時｜應分攤 ${money(unclassified.groupCoolingFee)}`,size:28,weight:600,gap:24});}
    items.push({text:'※ 冷氣費實際收費採無條件進位至整元。',size:25,weight:500,gap:0});
    ctx.font='30px system-ui, sans-serif';let height=pad*2;for(const it of items){ctx.font=`${it.weight} ${it.size}px system-ui, sans-serif`;height+=wrapText(ctx,it.text,contentWidth).length*(it.size*1.5)+it.gap;}
    canvas.width=width;canvas.height=Math.ceil(height);ctx.fillStyle='#f7f5ff';ctx.fillRect(0,0,width,canvas.height);let y=pad;
    for(const it of items){ctx.font=`${it.weight} ${it.size}px system-ui, sans-serif`;ctx.fillStyle=it.accent?'#7c3aed':it.weight>=700?'#1f2937':'#5f6b7a';for(const line of wrapText(ctx,it.text,contentWidth)){ctx.fillText(line,pad,y);y+=it.size*1.5;}y+=it.gap;}
    try{const blob=await canvasToBlob(canvas);await saveOrShareBlob(blob,`${month}-冷氣費群組.png`,`${monthLabel(month)} 冷氣費整理`);}catch{alert('圖片產生失敗，請稍後再試。');}
  }
  if(!rows.length)return null;
  return <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}><button type="button" className="primaryButton" onClick={copyText}>{copied?'✓ 已複製':'複製 LINE 文字'}</button><button type="button" className="secondaryButton" onClick={exportImage}>圖片／分享</button></div>;
}
