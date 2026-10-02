'use client';

import { useState } from 'react';
import { canvasToBlob, saveOrShareBlob } from '@/lib/client-download';
import { getTeamBranding, loadBrandLogo, teamDisplayName } from '@/lib/client-team-branding';

type Row={name:string;monthlyFee:number;members:number;personHours:number;groupCoolingFee:number;coolingPerPerson:number;totalPerPerson:number};
type Unclassified={personHours:number;groupCoolingFee:number}|null;

function money(v:number){return `$${Math.round(v).toLocaleString()}`;}
function monthLabel(month:string){const [y,m]=month.split('-');return `${y}年${Number(m)}月`;}
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.closePath();}

function buildLineText(month:string,totalCost:number,rows:Row[],unclassified:Unclassified,teamName?:string){
  const totalCollected=rows.reduce((s,r)=>s+r.groupCoolingFee,0)+(unclassified?.groupCoolingFee??0);
  const lines=[`📣 ${monthLabel(month)} 冷氣費整理`,...(teamName?[`🏓 ${teamName}`]:[]),`學校實際冷氣費：${money(Math.ceil(totalCost))}`,`群組實際應收合計：${money(totalCollected)}`,'','各月費群組應收：'];
  rows.forEach(r=>{lines.push(`【${r.name}】`);lines.push(`原月費 ${money(r.monthlyFee)}｜收費 ${r.members} 人`);lines.push(`冷氣使用 ${r.personHours.toFixed(1)} 人時｜群組應收 ${money(r.groupCoolingFee)}`);lines.push(`每人冷氣費 ${money(r.coolingPerPerson)}｜每人本月應收 ${money(r.totalPerPerson)}`,'');});
  if(unclassified&&unclassified.groupCoolingFee>0){lines.push('【未分類／其他】');lines.push(`冷氣使用 ${unclassified.personHours.toFixed(1)} 人時｜應分攤 ${money(unclassified.groupCoolingFee)}`,'');}
  lines.push('※ 冷氣費採「每人無條件進位到整元」後收費。');
  return lines.join('\n');
}

export default function AirconGroupFeeExport({month,totalCost,rows,unclassified}:{month:string;totalCost:number;rows:Row[];unclassified:Unclassified}){
  const [copied,setCopied]=useState(false);

  async function copyText(){
    try{const team=await getTeamBranding();await navigator.clipboard.writeText(buildLineText(month,totalCost,rows,unclassified,teamDisplayName(team)));setCopied(true);window.setTimeout(()=>setCopied(false),1600);}catch{alert('無法複製文字，請改用圖片分享。');}
  }

  async function exportImage(){
    const team=await getTeamBranding();
    const logo=await loadBrandLogo(team?.logoDataUrl);
    const canvas=document.createElement('canvas');
    const width=1080,pad=64,cardGap=22,cardH=230;
    const totalCollected=rows.reduce((s,r)=>s+r.groupCoolingFee,0)+(unclassified?.groupCoolingFee??0);
    const extra=unclassified&&unclassified.groupCoolingFee>0?1:0;
    const height=390+(rows.length+extra)*cardH+Math.max(0,rows.length+extra-1)*cardGap+170;
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');if(!ctx)return;

    const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,'#f7f1ff');bg.addColorStop(.5,'#fff7fb');bg.addColorStop(1,'#edfdfb');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);

    const brand=team?.brandColor||'#7c3aed';
    const header=ctx.createLinearGradient(pad,48,width-pad,250);header.addColorStop(0,brand);header.addColorStop(.55,'#ec4899');header.addColorStop(1,'#14b8a6');ctx.fillStyle=header;roundRect(ctx,pad,48,width-pad*2,220,34);ctx.fill();
    let titleX=pad+38;
    if(logo){ctx.fillStyle='rgba(255,255,255,.96)';roundRect(ctx,pad+30,79,96,96,24);ctx.fill();ctx.drawImage(logo,pad+40,89,76,76);titleX=pad+150;}
    ctx.fillStyle='#fff';ctx.font='800 50px system-ui,sans-serif';ctx.fillText(`${monthLabel(month)} 冷氣費整理`,titleX,126);
    ctx.font='650 24px system-ui,sans-serif';ctx.fillText(teamDisplayName(team),titleX,161);
    ctx.font='600 27px system-ui,sans-serif';ctx.fillText(`學校實際冷氣費 ${money(Math.ceil(totalCost))}`,titleX,202);ctx.fillText(`群組實際應收合計 ${money(totalCollected)}`,titleX,240);

    let y=310;
    for(const r of rows){
      ctx.fillStyle='rgba(255,255,255,.96)';roundRect(ctx,pad,y,width-pad*2,cardH,28);ctx.fill();ctx.strokeStyle='#e8e1f2';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#202838';ctx.font='800 38px system-ui,sans-serif';ctx.fillText(r.name,pad+30,y+52);
      ctx.fillStyle='#6f7785';ctx.font='500 25px system-ui,sans-serif';ctx.fillText(`原月費 ${money(r.monthlyFee)}｜${r.members} 人｜${r.personHours.toFixed(1)} 人時`,pad+30,y+92);
      const cols=[['群組冷氣費',money(r.groupCoolingFee)],['每人冷氣費',money(r.coolingPerPerson)],['每人本月應收',money(r.totalPerPerson)]];
      cols.forEach((c,i)=>{const x=pad+30+i*300;ctx.fillStyle=i===2?'#fff3f8':'#f5f1ff';roundRect(ctx,x,y+118,274,82,18);ctx.fill();ctx.fillStyle='#7a8190';ctx.font='500 20px system-ui,sans-serif';ctx.fillText(c[0],x+18,y+147);ctx.fillStyle=i===2?'#d92f75':'#392a62';ctx.font='800 30px system-ui,sans-serif';ctx.fillText(c[1],x+18,y+183);});
      y+=cardH+cardGap;
    }
    if(unclassified&&unclassified.groupCoolingFee>0){ctx.fillStyle='#fffaf0';roundRect(ctx,pad,y,width-pad*2,cardH,28);ctx.fill();ctx.strokeStyle='#efd69b';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#6b4d00';ctx.font='800 36px system-ui,sans-serif';ctx.fillText('未分類／其他',pad+30,y+55);ctx.font='500 25px system-ui,sans-serif';ctx.fillText(`冷氣使用 ${unclassified.personHours.toFixed(1)} 人時｜應分攤 ${money(unclassified.groupCoolingFee)}`,pad+30,y+105);y+=cardH+cardGap;}

    ctx.fillStyle='#596577';ctx.font='500 24px system-ui,sans-serif';ctx.fillText('※ 冷氣費採「每人無條件進位到整元」後收費。',pad,y+35);
    ctx.fillStyle='#9aa2af';ctx.font='500 20px system-ui,sans-serif';ctx.fillText(`${teamDisplayName(team)}｜冷氣費月結`,pad,y+75);

    try{const blob=await canvasToBlob(canvas);await saveOrShareBlob(blob,`${month}-冷氣費群組.png`,`${monthLabel(month)} 冷氣費整理`);}catch{alert('圖片產生失敗，請稍後再試。');}
  }

  if(!rows.length)return null;
  return <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}><button type="button" className="primaryButton" onClick={copyText}>{copied?'✓ 已複製':'複製 LINE 文字'}</button><button type="button" className="secondaryButton" onClick={exportImage}>圖片／分享</button></div>;
}
