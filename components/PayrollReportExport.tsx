'use client';

import { useState } from 'react';
import { canvasToBlob, saveOrShareBlob } from '@/lib/client-download';
import { getTeamBranding, loadBrandLogo, teamDisplayName } from '@/lib/client-team-branding';

type MoneyItem={label:string;amount:number;description?:string|null};
type StaffRow={name:string;pay:number;weight:number;rawWeight:number;share:number;configuredMonthlySalary:number;weightMultiplier:number;fixedPay:number;weightedPay:number};

const money=(v:number)=>`$${Math.round(v).toLocaleString()}`;
const monthLabel=(month:string)=>{const [y,m]=month.split('-');return `${y}年${Number(m)}月`;};
function wrapText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number){const out:string[]=[];let line='';for(const ch of text){const next=line+ch;if(line&&ctx.measureText(next).width>maxWidth){out.push(line);line=ch;}else line=next;}if(line)out.push(line);return out;}
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.closePath();}

function buildText(props:{month:string;incomeItems:MoneyItem[];expenseItems:MoneyItem[];income:number;operatingExpense:number;fixedPayTotal:number;weightedPool:number;coachPayTotal:number;finalBalance:number;staff:StaffRow[]},teamName?:string){
  const {month,incomeItems,expenseItems,income,operatingExpense,fixedPayTotal,weightedPool,coachPayTotal,finalBalance,staff}=props;
  const lines=[`📊 ${monthLabel(month)} 教練薪酬月報`,...(teamName?[`🏓 ${teamName}`]:[]),'','【收入】'];
  if(incomeItems.length) incomeItems.forEach(x=>lines.push(`・${x.label}${x.description?`｜${x.description}`:''}：${money(x.amount)}`)); else lines.push('・本月尚無收入項目');
  lines.push(`收入合計：${money(income)}`,'','【支出】');
  if(expenseItems.length) expenseItems.forEach(x=>lines.push(`・${x.label}${x.description?`｜${x.description}`:''}：${money(x.amount)}`)); else lines.push('・本月尚無支出項目');
  lines.push(`營運支出合計：${money(operatingExpense)}`,'',`固定月薪合計：${money(fixedPayTotal)}`,`加權教練可分配池：${money(weightedPool)}`,'','【教練薪酬】');
  staff.forEach(s=>{const parts=[`・${s.name}`];if(s.fixedPay>0)parts.push(`固定 ${money(s.fixedPay)}`);if(s.weightMultiplier>0)parts.push(`原始 ${s.rawWeight.toFixed(1)} 人時 × ${s.weightMultiplier.toFixed(2)}＝${s.weight.toFixed(1)} 加權`,`占比 ${(s.share*100).toFixed(1)}%`,`加權 ${money(s.weightedPay)}`);parts.push(`本月總薪酬 ${money(s.pay)}`);lines.push(parts.join('｜'));});
  lines.push('',`教練薪酬合計：${money(coachPayTotal)}`,`分配後餘額：${money(finalBalance)}`,'','※ 固定月薪與加權分配可同時存在；加權薪酬依「教練實際出勤時間 × 同時段學生人數 × 管理員設定加權比例」計算。');
  return lines.join('\n');
}

export default function PayrollReportExport(props:{month:string;incomeItems:MoneyItem[];expenseItems:MoneyItem[];income:number;operatingExpense:number;fixedPayTotal:number;weightedPool:number;coachPayTotal:number;finalBalance:number;staff:StaffRow[]}){
  const [copied,setCopied]=useState(false);

  async function copyLine(){const team=await getTeamBranding();await navigator.clipboard.writeText(buildText(props,teamDisplayName(team)));setCopied(true);window.setTimeout(()=>setCopied(false),1600);}

  async function exportImage(){
    const team=await getTeamBranding();const logo=await loadBrandLogo(team?.logoDataUrl);
    const canvas=document.createElement('canvas');const width=1080,pad=64,contentWidth=width-pad*2;const ctx=canvas.getContext('2d');if(!ctx)return;
    const detailBlocks:Array<{text:string;size:number;weight:number;gap:number;kind?:'accent'|'muted'}>=[];
    detailBlocks.push({text:'收入明細',size:34,weight:800,gap:8});
    (props.incomeItems.length?props.incomeItems:[{label:'本月尚無收入項目',amount:0}]).forEach(x=>detailBlocks.push({text:`${x.label}${x.description?`｜${x.description}`:''}　${money(x.amount)}`,size:26,weight:550,gap:5}));
    detailBlocks.push({text:'支出明細',size:34,weight:800,gap:8});
    (props.expenseItems.length?props.expenseItems:[{label:'本月尚無支出項目',amount:0}]).forEach(x=>detailBlocks.push({text:`${x.label}${x.description?`｜${x.description}`:''}　${money(x.amount)}`,size:26,weight:550,gap:5}));
    detailBlocks.push({text:`固定月薪合計 ${money(props.fixedPayTotal)}｜加權可分配池 ${money(props.weightedPool)}`,size:29,weight:750,gap:24,kind:'accent'});
    detailBlocks.push({text:'教練薪酬',size:34,weight:800,gap:8});
    props.staff.forEach(s=>{const parts=[s.name];if(s.fixedPay>0)parts.push(`固定 ${money(s.fixedPay)}`);if(s.weightMultiplier>0)parts.push(`${s.rawWeight.toFixed(1)} 人時 × ${s.weightMultiplier.toFixed(2)}＝${s.weight.toFixed(1)} 加權`,`占比 ${(s.share*100).toFixed(1)}%`,`加權 ${money(s.weightedPay)}`);parts.push(`本月 ${money(s.pay)}`);detailBlocks.push({text:parts.join('｜'),size:27,weight:650,gap:8});});
    detailBlocks.push({text:`教練薪酬合計 ${money(props.coachPayTotal)}｜分配後餘額 ${money(props.finalBalance)}`,size:31,weight:800,gap:20,kind:'accent'});
    detailBlocks.push({text:'※ 固定月薪與加權分配可同時存在；加權薪酬＝出勤時間 × 同時段學生人數 × 加權比例。',size:23,weight:500,gap:0,kind:'muted'});

    ctx.font='30px system-ui, sans-serif';let bodyHeight=0;for(const b of detailBlocks){ctx.font=`${b.weight} ${b.size}px system-ui, sans-serif`;bodyHeight+=wrapText(ctx,b.text,contentWidth).length*(b.size*1.45)+b.gap;}
    canvas.width=width;canvas.height=Math.ceil(330+bodyHeight+pad+70);
    const bg=ctx.createLinearGradient(0,0,width,canvas.height);bg.addColorStop(0,'#f7f1ff');bg.addColorStop(.5,'#fff7fb');bg.addColorStop(1,'#edfdfb');ctx.fillStyle=bg;ctx.fillRect(0,0,width,canvas.height);
    const brand=team?.brandColor||'#7c3aed';const header=ctx.createLinearGradient(pad,48,width-pad,270);header.addColorStop(0,brand);header.addColorStop(.55,'#ec4899');header.addColorStop(1,'#14b8a6');ctx.fillStyle=header;roundRect(ctx,pad,48,width-pad*2,220,34);ctx.fill();
    let titleX=pad+38;if(logo){ctx.fillStyle='rgba(255,255,255,.96)';roundRect(ctx,pad+30,79,96,96,24);ctx.fill();ctx.drawImage(logo,pad+40,89,76,76);titleX=pad+150;}
    ctx.fillStyle='#fff';ctx.font='800 50px system-ui,sans-serif';ctx.fillText(`${monthLabel(props.month)} 教練薪酬月報`,titleX,126);ctx.font='650 24px system-ui,sans-serif';ctx.fillText(teamDisplayName(team),titleX,161);ctx.font='650 27px system-ui,sans-serif';ctx.fillText(`收入 ${money(props.income)}｜營運支出 ${money(props.operatingExpense)}`,titleX,202);ctx.fillText(`教練薪酬 ${money(props.coachPayTotal)}｜本月餘額 ${money(props.finalBalance)}`,titleX,240);

    let y=326;for(const b of detailBlocks){ctx.font=`${b.weight} ${b.size}px system-ui, sans-serif`;ctx.fillStyle=b.kind==='accent'?'#7c3aed':b.kind==='muted'?'#667085':'#1f2937';for(const line of wrapText(ctx,b.text,contentWidth)){ctx.fillText(line,pad,y);y+=b.size*1.45;}y+=b.gap;}
    try{const blob=await canvasToBlob(canvas);await saveOrShareBlob(blob,`${props.month}-教練薪酬月報.png`,`${monthLabel(props.month)} 教練薪酬月報`);}catch{alert('圖片產生失敗，請稍後再試。');}
  }

  return <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}><button type="button" className="primaryButton" onClick={copyLine}>{copied?'✓ 已複製':'複製 LINE 文字'}</button><button type="button" className="secondaryButton" onClick={exportImage}>圖片／分享</button></div>;
}
