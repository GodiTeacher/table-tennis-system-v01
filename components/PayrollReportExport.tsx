'use client';

import { useState } from 'react';
import { canvasToBlob, saveOrShareBlob } from '@/lib/client-download';

type MoneyItem={label:string;amount:number;description?:string|null};
type StaffRow={name:string;method:'fixed_monthly'|'weighted_students'|string;pay:number;weight:number;rawWeight:number;share:number;configuredMonthlySalary:number;weightMultiplier:number};

const money=(v:number)=>`$${Math.round(v).toLocaleString()}`;
const monthLabel=(month:string)=>{const [y,m]=month.split('-');return `${y}年${Number(m)}月`;};
function wrapText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number){const out:string[]=[];let line='';for(const ch of text){const next=line+ch;if(line&&ctx.measureText(next).width>maxWidth){out.push(line);line=ch;}else line=next;}if(line)out.push(line);return out;}

function buildText(props:{month:string;incomeItems:MoneyItem[];expenseItems:MoneyItem[];income:number;operatingExpense:number;fixedPayTotal:number;weightedPool:number;coachPayTotal:number;finalBalance:number;staff:StaffRow[]}){
  const {month,incomeItems,expenseItems,income,operatingExpense,fixedPayTotal,weightedPool,coachPayTotal,finalBalance,staff}=props;
  const lines=[`📊 ${monthLabel(month)} 教練薪酬月報`,'','【收入】'];
  if(incomeItems.length) incomeItems.forEach(x=>lines.push(`・${x.label}${x.description?`｜${x.description}`:''}：${money(x.amount)}`)); else lines.push('・本月尚無收入項目');
  lines.push(`收入合計：${money(income)}`,'','【支出】');
  if(expenseItems.length) expenseItems.forEach(x=>lines.push(`・${x.label}${x.description?`｜${x.description}`:''}：${money(x.amount)}`)); else lines.push('・本月尚無支出項目');
  lines.push(`營運支出合計：${money(operatingExpense)}`,'',`固定月薪合計：${money(fixedPayTotal)}`,`加權教練可分配池：${money(weightedPool)}`,'','【教練薪酬】');
  staff.forEach(s=>{
    if(s.method==='fixed_monthly') lines.push(`・${s.name}｜固定月薪 ${money(s.configuredMonthlySalary)}｜本月薪酬 ${money(s.pay)}`);
    else lines.push(`・${s.name}｜原始 ${s.rawWeight.toFixed(1)} 人時 × ${s.weightMultiplier.toFixed(2)}＝加權 ${s.weight.toFixed(1)}｜占比 ${(s.share*100).toFixed(1)}%｜本月薪酬 ${money(s.pay)}`);
  });
  lines.push('',`教練薪酬合計：${money(coachPayTotal)}`,`分配後餘額：${money(finalBalance)}`,'','※ 加權薪酬依「教練實際出勤時間 × 同時段學生人數 × 管理員設定加權比例」計算整月權重後分配。');
  return lines.join('\n');
}

export default function PayrollReportExport(props:{month:string;incomeItems:MoneyItem[];expenseItems:MoneyItem[];income:number;operatingExpense:number;fixedPayTotal:number;weightedPool:number;coachPayTotal:number;finalBalance:number;staff:StaffRow[]}){
  const [copied,setCopied]=useState(false);
  const text=buildText(props);

  async function copyLine(){await navigator.clipboard.writeText(text);setCopied(true);window.setTimeout(()=>setCopied(false),1600);}

  async function exportImage(){
    const canvas=document.createElement('canvas');const width=1080,pad=64,contentWidth=width-pad*2;const ctx=canvas.getContext('2d');if(!ctx)return;
    const blocks:Array<{text:string;size:number;weight:number;gap:number;kind?:'title'|'accent'|'muted'}>=[];
    blocks.push({text:`${monthLabel(props.month)} 教練薪酬月報`,size:50,weight:850,gap:12,kind:'title'});
    blocks.push({text:`收入 ${money(props.income)}｜營運支出 ${money(props.operatingExpense)}｜教練薪酬 ${money(props.coachPayTotal)}`,size:28,weight:700,gap:28,kind:'accent'});
    blocks.push({text:'收入明細',size:34,weight:800,gap:8});
    (props.incomeItems.length?props.incomeItems:[{label:'本月尚無收入項目',amount:0}]).forEach(x=>blocks.push({text:`${x.label}${x.description?`｜${x.description}`:''}　${money(x.amount)}`,size:26,weight:550,gap:5}));
    blocks.push({text:'支出明細',size:34,weight:800,gap:8});
    (props.expenseItems.length?props.expenseItems:[{label:'本月尚無支出項目',amount:0}]).forEach(x=>blocks.push({text:`${x.label}${x.description?`｜${x.description}`:''}　${money(x.amount)}`,size:26,weight:550,gap:5}));
    blocks.push({text:`固定月薪合計 ${money(props.fixedPayTotal)}｜加權可分配池 ${money(props.weightedPool)}`,size:29,weight:750,gap:24,kind:'accent'});
    blocks.push({text:'教練薪酬',size:34,weight:800,gap:8});
    props.staff.forEach(s=>blocks.push({text:s.method==='fixed_monthly'?`${s.name}｜固定月薪 ${money(s.configuredMonthlySalary)}｜本月薪酬 ${money(s.pay)}`:`${s.name}｜${s.rawWeight.toFixed(1)} 人時 × ${s.weightMultiplier.toFixed(2)}＝${s.weight.toFixed(1)} 加權｜占比 ${(s.share*100).toFixed(1)}%｜本月薪酬 ${money(s.pay)}`,size:28,weight:650,gap:8}));
    blocks.push({text:`教練薪酬合計 ${money(props.coachPayTotal)}｜分配後餘額 ${money(props.finalBalance)}`,size:31,weight:800,gap:20,kind:'accent'});
    blocks.push({text:'※ 加權薪酬＝出勤時間 × 同時段學生人數 × 管理員設定加權比例。',size:24,weight:500,gap:0,kind:'muted'});
    ctx.font='30px system-ui, sans-serif';let bodyHeight=0;for(const b of blocks){ctx.font=`${b.weight} ${b.size}px system-ui, sans-serif`;bodyHeight+=wrapText(ctx,b.text,contentWidth).length*(b.size*1.45)+b.gap;}
    canvas.width=width;canvas.height=Math.ceil(bodyHeight+pad*2+120);const grad=ctx.createLinearGradient(0,0,width,0);grad.addColorStop(0,'#efe8ff');grad.addColorStop(.55,'#ffe7f2');grad.addColorStop(1,'#ddfbf6');ctx.fillStyle=grad;ctx.fillRect(0,0,width,150);ctx.fillStyle='#f8f7fc';ctx.fillRect(0,150,width,canvas.height-150);
    let y=92;for(let i=0;i<blocks.length;i++){const b=blocks[i];ctx.font=`${b.weight} ${b.size}px system-ui, sans-serif`;ctx.fillStyle=b.kind==='accent'?'#7c3aed':b.kind==='muted'?'#667085':'#1f2937';if(i===1)y=190;for(const line of wrapText(ctx,b.text,contentWidth)){ctx.fillText(line,pad,y);y+=b.size*1.45;}y+=b.gap;}
    try{const blob=await canvasToBlob(canvas);await saveOrShareBlob(blob,`${props.month}-教練薪酬月報.png`,`${monthLabel(props.month)} 教練薪酬月報`);}catch{alert('圖片產生失敗，請稍後再試。');}
  }

  return <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}><button type="button" className="primaryButton" onClick={copyLine}>{copied?'✓ 已複製':'複製 LINE 文字'}</button><button type="button" className="secondaryButton" onClick={exportImage}>圖片／分享</button></div>;
}
