'use client';

import { useState } from 'react';
import { canvasToBlob, saveOrShareBlob } from '@/lib/client-download';
import { getTeamBranding, loadBrandLogo, teamDisplayName } from '@/lib/client-team-branding';

type StaffPay={name:string;pay:number;weight:number;rawWeight:number;weightMultiplier:number;share:number;fixedPay:number;weightedPay:number};
type MoneyItem={label:string;amount:number;description?:string|null};
const money=(v:number)=>`$${Math.round(v).toLocaleString()}`;
const monthLabel=(month:string)=>{const [y,m]=month.split('-');return `${y}年${Number(m)}月`;};
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.closePath();}

export default function OperationsCloseReportExport(props:{month:string;attendanceDays:number;attendanceSegments:number;airconCost:number;incomeItems:MoneyItem[];expenseItems:MoneyItem[];income:number;operatingExpense:number;fixedPayTotal:number;weightedPool:number;coachPayTotal:number;finalBalance:number;staff:StaffPay[];completeCount:number}){
  const [copied,setCopied]=useState(false);
  async function buildText(){const team=await getTeamBranding();const l=[`📊 ${monthLabel(props.month)} 球隊營運月結報告`,`🏓 ${teamDisplayName(team)}`,'',`完成度：${props.completeCount}/4`,`學生出勤：${props.attendanceDays} 天／${props.attendanceSegments} 時段`,`冷氣費：${money(props.airconCost)}`,'','【收入】'];props.incomeItems.forEach(x=>l.push(`・${x.label}${x.description?`｜${x.description}`:''}：${money(x.amount)}`));l.push(`收入合計：${money(props.income)}`,'','【營運支出】');props.expenseItems.forEach(x=>l.push(`・${x.label}${x.description?`｜${x.description}`:''}：${money(x.amount)}`));l.push(`營運支出：${money(props.operatingExpense)}`,`固定月薪：${money(props.fixedPayTotal)}`,`加權分配池：${money(props.weightedPool)}`,'','【教練薪酬】');props.staff.forEach(s=>l.push(`・${s.name}｜固定 ${money(s.fixedPay)}｜加權 ${money(s.weightedPay)}｜本月 ${money(s.pay)}`));l.push('',`教練薪酬合計：${money(props.coachPayTotal)}`,`本月最終餘額：${money(props.finalBalance)}`);return l.join('\n');}
  async function copyLine(){await navigator.clipboard.writeText(await buildText());setCopied(true);setTimeout(()=>setCopied(false),1600);}
  async function exportImage(){
    const team=await getTeamBranding();const logo=await loadBrandLogo(team?.logoDataUrl);const canvas=document.createElement('canvas');const context=canvas.getContext('2d');if(!context)return;const ctx:CanvasRenderingContext2D=context;
    const width=1080,pad=64,content=width-pad*2,gap=22,staffH=148;
    const incomeH=Math.max(142,82+props.incomeItems.length*38),expenseH=Math.max(142,82+props.expenseItems.length*38);
    canvas.width=width;canvas.height=610+incomeH+expenseH+props.staff.length*(staffH+gap)+160;
    const bg=ctx.createLinearGradient(0,0,width,canvas.height);bg.addColorStop(0,'#f7f1ff');bg.addColorStop(.5,'#fff7fb');bg.addColorStop(1,'#edfdfb');ctx.fillStyle=bg;ctx.fillRect(0,0,width,canvas.height);
    const brand=team?.brandColor||'#7c3aed';const hg=ctx.createLinearGradient(pad,48,width-pad,268);hg.addColorStop(0,brand);hg.addColorStop(.56,'#ec4899');hg.addColorStop(1,'#14b8a6');ctx.fillStyle=hg;roundRect(ctx,pad,48,content,220,34);ctx.fill();
    let tx=pad+38;if(logo){ctx.fillStyle='#fff';roundRect(ctx,pad+30,82,92,92,22);ctx.fill();ctx.drawImage(logo,pad+40,92,72,72);tx=pad+145;}
    ctx.fillStyle='#fff';ctx.font='800 50px system-ui';ctx.fillText(`${monthLabel(props.month)} 球隊營運月結`,tx,126);ctx.font='650 24px system-ui';ctx.fillText(teamDisplayName(team),tx,162);ctx.font='700 27px system-ui';ctx.fillText(`完成度 ${props.completeCount}/4｜出勤 ${props.attendanceDays} 天｜冷氣 ${money(props.airconCost)}`,tx,207);ctx.fillText(`收入 ${money(props.income)}｜支出 ${money(props.operatingExpense)}｜餘額 ${money(props.finalBalance)}`,tx,243);

    const sy=300;const sw=(content-24*3)/4;[['出勤天數',`${props.attendanceDays} 天`],['出勤時段',`${props.attendanceSegments} 段`],['冷氣費',money(props.airconCost)],['完成度',`${props.completeCount}/4`]].forEach((x,i)=>{const xx=pad+i*(sw+24);ctx.fillStyle='#fff';roundRect(ctx,xx,sy,sw,92,20);ctx.fill();ctx.fillStyle='#7b8492';ctx.font='500 18px system-ui';ctx.fillText(x[0],xx+16,sy+31);ctx.fillStyle='#2d2548';ctx.font='800 27px system-ui';ctx.fillText(x[1],xx+16,sy+68);});
    const fy=414;const fw=(content-24*2)/3;[['收入',money(props.income)],['營運支出',money(props.operatingExpense)],['最終餘額',money(props.finalBalance)]].forEach((x,i)=>{const xx=pad+i*(fw+24);ctx.fillStyle=i===2?'#fff1f6':'#f5f1ff';roundRect(ctx,xx,fy,fw,94,20);ctx.fill();ctx.fillStyle='#7c8390';ctx.font='500 19px system-ui';ctx.fillText(x[0],xx+18,fy+32);ctx.fillStyle=i===2?'#d92f75':'#392a62';ctx.font='800 31px system-ui';ctx.fillText(x[1],xx+18,fy+70);});

    let y=540;
    function listCard(title:string,items:MoneyItem[],total:number){const h=Math.max(142,82+items.length*38);ctx.fillStyle='rgba(255,255,255,.97)';roundRect(ctx,pad,y,content,h,26);ctx.fill();ctx.strokeStyle='#e6e0ef';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#202838';ctx.font='800 31px system-ui';ctx.fillText(title,pad+28,y+44);ctx.fillStyle='#7c3aed';ctx.textAlign='right';ctx.font='800 25px system-ui';ctx.fillText(money(total),width-pad-28,y+44);ctx.textAlign='left';let yy=y+83;ctx.font='500 22px system-ui';ctx.fillStyle='#606a79';(items.length?items:[{label:'本月無項目',amount:0}]).forEach(it=>{ctx.fillText(`${it.label}${it.description?`｜${it.description}`:''}`,pad+28,yy);ctx.textAlign='right';ctx.fillText(money(it.amount),width-pad-28,yy);ctx.textAlign='left';yy+=38});y+=h+gap;}
    listCard('收入明細',props.incomeItems,props.income);listCard('支出明細',props.expenseItems,props.operatingExpense);
    ctx.fillStyle='#202838';ctx.font='800 32px system-ui';ctx.fillText('教練薪酬摘要',pad,y+35);ctx.fillStyle='#7c3aed';ctx.textAlign='right';ctx.font='800 25px system-ui';ctx.fillText(`合計 ${money(props.coachPayTotal)}`,width-pad,y+35);ctx.textAlign='left';y+=58;
    for(const s of props.staff){ctx.fillStyle='rgba(255,255,255,.97)';roundRect(ctx,pad,y,content,staffH,24);ctx.fill();ctx.strokeStyle='#e6e0ef';ctx.stroke();ctx.fillStyle='#202838';ctx.font='800 29px system-ui';ctx.fillText(s.name,pad+26,y+41);ctx.fillStyle='#ec3f83';ctx.textAlign='right';ctx.fillText(money(s.pay),width-pad-26,y+41);ctx.textAlign='left';ctx.fillStyle='#737c8a';ctx.font='500 20px system-ui';ctx.fillText(`固定 ${money(s.fixedPay)}｜加權 ${money(s.weightedPay)}｜占比 ${(s.share*100).toFixed(1)}%`,pad+26,y+77);const cw=(content-52-28)/2;[['原始人時',`${s.rawWeight.toFixed(1)} 人時`],['加權比例',`× ${s.weightMultiplier.toFixed(2)}`]].forEach((a,i)=>{const xx=pad+26+i*(cw+28);ctx.fillStyle='#f5f1ff';roundRect(ctx,xx,y+94,cw,38,12);ctx.fill();ctx.fillStyle='#635a7e';ctx.font='650 18px system-ui';ctx.fillText(`${a[0]} ${a[1]}`,xx+12,y+120);});y+=staffH+gap;}
    ctx.fillStyle='#727c8c';ctx.font='500 21px system-ui';ctx.fillText('※ 月結報告依目前系統資料即時產生。',pad,y+22);
    try{const blob=await canvasToBlob(canvas);await saveOrShareBlob(blob,`${props.month}-球隊營運月結.png`,`${monthLabel(props.month)} 球隊營運月結`);}catch{alert('圖片產生失敗，請稍後再試。');}
  }
  return <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14}}><button type="button" className="primaryButton" onClick={copyLine}>{copied?'✓ 已複製':'複製 LINE 文字'}</button><button type="button" className="secondaryButton" onClick={exportImage}>圖片／分享</button></div>;
}
