'use client';

import { useState } from 'react';
import { canvasToBlob, saveOrShareBlob } from '@/lib/client-download';

type StaffPay={name:string;method:string;pay:number;weight:number;rawWeight:number;weightMultiplier:number;share:number};
type MoneyItem={label:string;amount:number;description?:string|null};

const money=(v:number)=>`$${Math.round(v).toLocaleString()}`;
const monthLabel=(month:string)=>{const [y,m]=month.split('-');return `${y}年${Number(m)}月`;};
function wrapText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number){const out:string[]=[];let line='';for(const ch of text){const next=line+ch;if(line&&ctx.measureText(next).width>maxWidth){out.push(line);line=ch;}else line=next;}if(line)out.push(line);return out;}

export default function OperationsCloseReportExport(props:{month:string;attendanceDays:number;attendanceSegments:number;airconCost:number;incomeItems:MoneyItem[];expenseItems:MoneyItem[];income:number;operatingExpense:number;fixedPayTotal:number;weightedPool:number;coachPayTotal:number;finalBalance:number;staff:StaffPay[];completeCount:number}){
  const [copied,setCopied]=useState(false);
  const lines=[`📊 ${monthLabel(props.month)} 球隊營運月結報告`,'',`完成度：${props.completeCount}/4`,`學生出勤：${props.attendanceDays} 天／${props.attendanceSegments} 時段`,`冷氣費：${money(props.airconCost)}`,'','【收入】'];
  if(props.incomeItems.length)props.incomeItems.forEach(x=>lines.push(`・${x.label}${x.description?`｜${x.description}`:''}：${money(x.amount)}`));else lines.push('・本月尚無收入項目');
  lines.push(`收入合計：${money(props.income)}`,'','【營運支出】');
  if(props.expenseItems.length)props.expenseItems.forEach(x=>lines.push(`・${x.label}${x.description?`｜${x.description}`:''}：${money(x.amount)}`));else lines.push('・本月尚無支出項目');
  lines.push(`營運支出合計：${money(props.operatingExpense)}`,'',`固定月薪合計：${money(props.fixedPayTotal)}`,`加權教練可分配池：${money(props.weightedPool)}`,'','【教練薪酬】');
  props.staff.forEach(s=>lines.push(s.method==='fixed_monthly'?`・${s.name}｜固定月薪｜${money(s.pay)}`:`・${s.name}｜${s.rawWeight.toFixed(1)} 人時 × ${s.weightMultiplier.toFixed(2)}｜占比 ${(s.share*100).toFixed(1)}%｜${money(s.pay)}`));
  lines.push('',`教練薪酬合計：${money(props.coachPayTotal)}`,`本月最終餘額：${money(props.finalBalance)}`,'','※ 報告依目前系統資料即時產生，後續修改原始資料後請重新匯出。');
  const text=lines.join('\n');

  async function copyLine(){await navigator.clipboard.writeText(text);setCopied(true);window.setTimeout(()=>setCopied(false),1600);}
  async function exportImage(){
    const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');if(!ctx)return;const width=1080,pad=62,content=width-pad*2;
    const blocks:Array<{text:string;size:number;weight:number;gap:number;accent?:boolean;muted?:boolean}>=[];
    blocks.push({text:`${monthLabel(props.month)} 球隊營運月結`,size:52,weight:900,gap:12});
    blocks.push({text:`完成度 ${props.completeCount}/4｜出勤 ${props.attendanceDays} 天｜冷氣 ${money(props.airconCost)}`,size:28,weight:750,gap:26,accent:true});
    blocks.push({text:`收入 ${money(props.income)}｜營運支出 ${money(props.operatingExpense)}｜教練薪酬 ${money(props.coachPayTotal)}｜餘額 ${money(props.finalBalance)}`,size:30,weight:800,gap:30,accent:true});
    blocks.push({text:'收入明細',size:34,weight:850,gap:8});
    (props.incomeItems.length?props.incomeItems:[{label:'本月尚無收入項目',amount:0}]).forEach(x=>blocks.push({text:`${x.label}${x.description?`｜${x.description}`:''}　${money(x.amount)}`,size:26,weight:550,gap:5}));
    blocks.push({text:'支出明細',size:34,weight:850,gap:8});
    (props.expenseItems.length?props.expenseItems:[{label:'本月尚無支出項目',amount:0}]).forEach(x=>blocks.push({text:`${x.label}${x.description?`｜${x.description}`:''}　${money(x.amount)}`,size:26,weight:550,gap:5}));
    blocks.push({text:'教練薪酬',size:34,weight:850,gap:8});
    props.staff.forEach(s=>blocks.push({text:s.method==='fixed_monthly'?`${s.name}｜固定月薪｜${money(s.pay)}`:`${s.name}｜${s.rawWeight.toFixed(1)} 人時 × ${s.weightMultiplier.toFixed(2)}｜占比 ${(s.share*100).toFixed(1)}%｜${money(s.pay)}`,size:27,weight:650,gap:7}));
    blocks.push({text:`本月最終餘額 ${money(props.finalBalance)}`,size:34,weight:900,gap:20,accent:true});
    blocks.push({text:'※ 此報告依目前系統資料即時產生。',size:23,weight:500,gap:0,muted:true});
    ctx.font='30px system-ui, sans-serif';let h=0;for(const b of blocks){ctx.font=`${b.weight} ${b.size}px system-ui, sans-serif`;h+=wrapText(ctx,b.text,content).length*b.size*1.45+b.gap;}
    canvas.width=width;canvas.height=Math.ceil(h+pad*2+130);const grad=ctx.createLinearGradient(0,0,width,0);grad.addColorStop(0,'#ede9fe');grad.addColorStop(.55,'#ffe4f1');grad.addColorStop(1,'#dffaf5');ctx.fillStyle=grad;ctx.fillRect(0,0,width,165);ctx.fillStyle='#faf9fd';ctx.fillRect(0,165,width,canvas.height-165);
    let y=100;for(let i=0;i<blocks.length;i++){const b=blocks[i];if(i===1)y=205;ctx.font=`${b.weight} ${b.size}px system-ui, sans-serif`;ctx.fillStyle=b.accent?'#7c3aed':b.muted?'#667085':'#1f2937';for(const line of wrapText(ctx,b.text,content)){ctx.fillText(line,pad,y);y+=b.size*1.45;}y+=b.gap;}
    try{const blob=await canvasToBlob(canvas);await saveOrShareBlob(blob,`${props.month}-球隊營運月結.png`,`${monthLabel(props.month)} 球隊營運月結`);}catch{alert('圖片產生失敗，請稍後再試。');}
  }
  return <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14}}><button type="button" className="primaryButton" onClick={copyLine}>{copied?'✓ 已複製':'複製 LINE 文字'}</button><button type="button" className="secondaryButton" onClick={exportImage}>圖片／分享</button></div>;
}
