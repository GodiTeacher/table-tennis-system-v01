'use client';

import { useState } from 'react';
import { canvasToBlob, saveOrShareBlob } from '@/lib/client-download';
import { getTeamBranding, loadBrandLogo, teamDisplayName } from '@/lib/client-team-branding';

type StaffPay={name:string;pay:number;weight:number;rawWeight:number;weightMultiplier:number;share:number;fixedPay:number;weightedPay:number};
type MoneyItem={label:string;amount:number;description?:string|null};

const money=(v:number)=>`$${Math.round(v).toLocaleString()}`;
const monthLabel=(month:string)=>{const [y,m]=month.split('-');return `${y}年${Number(m)}月`;};
function wrapText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number){const out:string[]=[];let line='';for(const ch of text){const next=line+ch;if(line&&ctx.measureText(next).width>maxWidth){out.push(line);line=ch;}else line=next;}if(line)out.push(line);return out;}
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.closePath();}

export default function OperationsCloseReportExport(props:{month:string;attendanceDays:number;attendanceSegments:number;airconCost:number;incomeItems:MoneyItem[];expenseItems:MoneyItem[];income:number;operatingExpense:number;fixedPayTotal:number;weightedPool:number;coachPayTotal:number;finalBalance:number;staff:StaffPay[];completeCount:number}){
  const [copied,setCopied]=useState(false);

  async function buildText(){
    const team=await getTeamBranding();
    const lines=[`📊 ${monthLabel(props.month)} 球隊營運月結報告`,`🏓 ${teamDisplayName(team)}`,'',`完成度：${props.completeCount}/4`,`學生出勤：${props.attendanceDays} 天／${props.attendanceSegments} 時段`,`冷氣費：${money(props.airconCost)}`,'','【收入】'];
    if(props.incomeItems.length)props.incomeItems.forEach(x=>lines.push(`・${x.label}${x.description?`｜${x.description}`:''}：${money(x.amount)}`));else lines.push('・本月尚無收入項目');
    lines.push(`收入合計：${money(props.income)}`,'','【營運支出】');
    if(props.expenseItems.length)props.expenseItems.forEach(x=>lines.push(`・${x.label}${x.description?`｜${x.description}`:''}：${money(x.amount)}`));else lines.push('・本月尚無支出項目');
    lines.push(`營運支出合計：${money(props.operatingExpense)}`,'',`固定月薪合計：${money(props.fixedPayTotal)}`,`加權教練可分配池：${money(props.weightedPool)}`,'','【教練薪酬】');
    props.staff.forEach(s=>{const parts=[`・${s.name}`];if(s.fixedPay>0)parts.push(`固定 ${money(s.fixedPay)}`);if(s.weightMultiplier>0)parts.push(`${s.rawWeight.toFixed(1)} 人時 × ${s.weightMultiplier.toFixed(2)}`,`占比 ${(s.share*100).toFixed(1)}%`,`加權 ${money(s.weightedPay)}`);parts.push(`本月 ${money(s.pay)}`);lines.push(parts.join('｜'));});
    lines.push('',`教練薪酬合計：${money(props.coachPayTotal)}`,`本月最終餘額：${money(props.finalBalance)}`,'','※ 報告依目前系統資料即時產生，固定月薪與加權分配可同時存在。');
    return lines.join('\n');
  }

  async function copyLine(){await navigator.clipboard.writeText(await buildText());setCopied(true);window.setTimeout(()=>setCopied(false),1600);}
  async function exportImage(){
    const team=await getTeamBranding();const logo=await loadBrandLogo(team?.logoDataUrl);
    const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');if(!ctx)return;const width=1080,pad=64,content=width-pad*2;
    const blocks:Array<{text:string;size:number;weight:number;gap:number;accent?:boolean;muted?:boolean}>=[];
    blocks.push({text:'收入明細',size:34,weight:850,gap:8});
    (props.incomeItems.length?props.incomeItems:[{label:'本月尚無收入項目',amount:0}]).forEach(x=>blocks.push({text:`${x.label}${x.description?`｜${x.description}`:''}　${money(x.amount)}`,size:26,weight:550,gap:5}));
    blocks.push({text:'支出明細',size:34,weight:850,gap:8});
    (props.expenseItems.length?props.expenseItems:[{label:'本月尚無支出項目',amount:0}]).forEach(x=>blocks.push({text:`${x.label}${x.description?`｜${x.description}`:''}　${money(x.amount)}`,size:26,weight:550,gap:5}));
    blocks.push({text:`固定月薪合計 ${money(props.fixedPayTotal)}｜加權可分配池 ${money(props.weightedPool)}`,size:29,weight:750,gap:22,accent:true});
    blocks.push({text:'教練薪酬',size:34,weight:850,gap:8});
    props.staff.forEach(s=>{const parts=[s.name];if(s.fixedPay>0)parts.push(`固定 ${money(s.fixedPay)}`);if(s.weightMultiplier>0)parts.push(`${s.rawWeight.toFixed(1)} 人時 × ${s.weightMultiplier.toFixed(2)}`,`占比 ${(s.share*100).toFixed(1)}%`,`加權 ${money(s.weightedPay)}`);parts.push(`本月 ${money(s.pay)}`);blocks.push({text:parts.join('｜'),size:27,weight:650,gap:7});});
    blocks.push({text:`本月最終餘額 ${money(props.finalBalance)}`,size:34,weight:900,gap:20,accent:true});
    blocks.push({text:'※ 此報告依目前系統資料即時產生。',size:23,weight:500,gap:0,muted:true});

    ctx.font='30px system-ui, sans-serif';let h=0;for(const b of blocks){ctx.font=`${b.weight} ${b.size}px system-ui, sans-serif`;h+=wrapText(ctx,b.text,content).length*b.size*1.45+b.gap;}
    canvas.width=width;canvas.height=Math.ceil(330+h+pad+70);
    const bg=ctx.createLinearGradient(0,0,width,canvas.height);bg.addColorStop(0,'#f7f1ff');bg.addColorStop(.5,'#fff7fb');bg.addColorStop(1,'#edfdfb');ctx.fillStyle=bg;ctx.fillRect(0,0,width,canvas.height);
    const brand=team?.brandColor||'#7c3aed';const header=ctx.createLinearGradient(pad,48,width-pad,270);header.addColorStop(0,brand);header.addColorStop(.55,'#ec4899');header.addColorStop(1,'#14b8a6');ctx.fillStyle=header;roundRect(ctx,pad,48,width-pad*2,220,34);ctx.fill();
    let titleX=pad+38;if(logo){ctx.fillStyle='rgba(255,255,255,.96)';roundRect(ctx,pad+30,79,96,96,24);ctx.fill();ctx.drawImage(logo,pad+40,89,76,76);titleX=pad+150;}
    ctx.fillStyle='#fff';ctx.font='800 50px system-ui,sans-serif';ctx.fillText(`${monthLabel(props.month)} 球隊營運月結`,titleX,126);ctx.font='650 24px system-ui,sans-serif';ctx.fillText(teamDisplayName(team),titleX,161);ctx.font='650 27px system-ui,sans-serif';ctx.fillText(`完成度 ${props.completeCount}/4｜出勤 ${props.attendanceDays} 天｜冷氣 ${money(props.airconCost)}`,titleX,202);ctx.fillText(`收入 ${money(props.income)}｜支出 ${money(props.operatingExpense)}｜餘額 ${money(props.finalBalance)}`,titleX,240);

    let y=326;for(const b of blocks){ctx.font=`${b.weight} ${b.size}px system-ui, sans-serif`;ctx.fillStyle=b.accent?'#7c3aed':b.muted?'#667085':'#1f2937';for(const line of wrapText(ctx,b.text,content)){ctx.fillText(line,pad,y);y+=b.size*1.45;}y+=b.gap;}
    try{const blob=await canvasToBlob(canvas);await saveOrShareBlob(blob,`${props.month}-球隊營運月結.png`,`${monthLabel(props.month)} 球隊營運月結`);}catch{alert('圖片產生失敗，請稍後再試。');}
  }
  return <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14}}><button type="button" className="primaryButton" onClick={copyLine}>{copied?'✓ 已複製':'複製 LINE 文字'}</button><button type="button" className="secondaryButton" onClick={exportImage}>圖片／分享</button></div>;
}
