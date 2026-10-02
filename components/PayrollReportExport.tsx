'use client';

import { useState } from 'react';
import { canvasToBlob, saveOrShareBlob } from '@/lib/client-download';
import { getTeamBranding, loadBrandLogo, teamDisplayName } from '@/lib/client-team-branding';

type MoneyItem={label:string;amount:number;description?:string|null};
type StaffRow={name:string;pay:number;weight:number;rawWeight:number;share:number;configuredMonthlySalary:number;weightMultiplier:number;fixedPay:number;weightedPay:number};
const money=(v:number)=>`$${Math.round(v).toLocaleString()}`;
const monthLabel=(month:string)=>{const [y,m]=month.split('-');return `${y}年${Number(m)}月`;};
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.closePath();}
function wrap(ctx:CanvasRenderingContext2D,text:string,max:number){const a:string[]=[];let s='';for(const ch of text){const n=s+ch;if(s&&ctx.measureText(n).width>max){a.push(s);s=ch}else s=n}if(s)a.push(s);return a;}
function buildText(p:any,teamName?:string){const l=[`📊 ${monthLabel(p.month)} 教練薪酬月報`,...(teamName?[`🏓 ${teamName}`]:[]),'','【收入】'];p.incomeItems.forEach((x:MoneyItem)=>l.push(`・${x.label}${x.description?`｜${x.description}`:''}：${money(x.amount)}`));l.push(`收入合計：${money(p.income)}`,'','【支出】');p.expenseItems.forEach((x:MoneyItem)=>l.push(`・${x.label}${x.description?`｜${x.description}`:''}：${money(x.amount)}`));l.push(`營運支出：${money(p.operatingExpense)}`,`固定月薪：${money(p.fixedPayTotal)}`,`加權可分配池：${money(p.weightedPool)}`,'','【教練薪酬】');p.staff.forEach((s:StaffRow)=>l.push(`・${s.name}｜固定 ${money(s.fixedPay)}｜加權 ${money(s.weightedPay)}｜本月 ${money(s.pay)}`));l.push('',`薪酬合計：${money(p.coachPayTotal)}`,`本月餘額：${money(p.finalBalance)}`);return l.join('\n');}

export default function PayrollReportExport(props:{month:string;incomeItems:MoneyItem[];expenseItems:MoneyItem[];income:number;operatingExpense:number;fixedPayTotal:number;weightedPool:number;coachPayTotal:number;finalBalance:number;staff:StaffRow[]}){
  const [copied,setCopied]=useState(false);
  async function copyLine(){const team=await getTeamBranding();await navigator.clipboard.writeText(buildText(props,teamDisplayName(team)));setCopied(true);setTimeout(()=>setCopied(false),1600);}
  async function exportImage(){
    const team=await getTeamBranding();const logo=await loadBrandLogo(team?.logoDataUrl);const canvas=document.createElement('canvas');const context=canvas.getContext('2d');if(!context)return;const ctx:CanvasRenderingContext2D=context;
    const width=1080,pad=64,content=width-pad*2,staffH=190,gap=22;
    const incomeH=Math.max(150,90+props.incomeItems.length*42),expenseH=Math.max(150,90+props.expenseItems.length*42);
    canvas.width=width;canvas.height=360+incomeH+expenseH+props.staff.length*(staffH+gap)+240;
    const bg=ctx.createLinearGradient(0,0,width,canvas.height);bg.addColorStop(0,'#f7f1ff');bg.addColorStop(.5,'#fff7fb');bg.addColorStop(1,'#edfdfb');ctx.fillStyle=bg;ctx.fillRect(0,0,width,canvas.height);
    const brand=team?.brandColor||'#7c3aed';const hg=ctx.createLinearGradient(pad,48,width-pad,268);hg.addColorStop(0,brand);hg.addColorStop(.56,'#ec4899');hg.addColorStop(1,'#14b8a6');ctx.fillStyle=hg;roundRect(ctx,pad,48,content,220,34);ctx.fill();
    let tx=pad+38;if(logo){ctx.fillStyle='#fff';roundRect(ctx,pad+30,82,92,92,22);ctx.fill();ctx.drawImage(logo,pad+40,92,72,72);tx=pad+145;}
    ctx.fillStyle='#fff';ctx.font='800 50px system-ui';ctx.fillText(`${monthLabel(props.month)} 教練薪酬月報`,tx,126);ctx.font='650 24px system-ui';ctx.fillText(teamDisplayName(team),tx,162);ctx.font='700 27px system-ui';ctx.fillText(`收入 ${money(props.income)}｜支出 ${money(props.operatingExpense)}｜薪酬 ${money(props.coachPayTotal)}`,tx,207);ctx.fillText(`本月餘額 ${money(props.finalBalance)}`,tx,243);

    const summaryY=300;const sw=(content-24*2)/3;[['固定月薪',props.fixedPayTotal],['加權分配池',props.weightedPool],['薪酬合計',props.coachPayTotal]].forEach((x,i)=>{const xx=pad+i*(sw+24);ctx.fillStyle='#fff';roundRect(ctx,xx,summaryY,sw,92,20);ctx.fill();ctx.fillStyle='#7c8390';ctx.font='500 20px system-ui';ctx.fillText(x[0] as string,xx+18,summaryY+31);ctx.fillStyle='#27213f';ctx.font='800 30px system-ui';ctx.fillText(money(x[1] as number),xx+18,summaryY+68);});
    let y=420;
    function moneyCard(title:string,items:MoneyItem[],total:number){const h=Math.max(150,90+items.length*42);ctx.fillStyle='rgba(255,255,255,.96)';roundRect(ctx,pad,y,content,h,26);ctx.fill();ctx.strokeStyle='#e6e0ef';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#202838';ctx.font='800 32px system-ui';ctx.fillText(title,pad+28,y+46);ctx.fillStyle='#7c3aed';ctx.font='800 26px system-ui';ctx.textAlign='right';ctx.fillText(money(total),width-pad-28,y+46);ctx.textAlign='left';ctx.font='500 23px system-ui';ctx.fillStyle='#5f6876';let yy=y+88;(items.length?items:[{label:'本月無項目',amount:0}]).forEach(it=>{ctx.fillText(`${it.label}${it.description?`｜${it.description}`:''}`,pad+28,yy);ctx.textAlign='right';ctx.fillText(money(it.amount),width-pad-28,yy);ctx.textAlign='left';yy+=40});y+=h+gap;}
    moneyCard('收入明細',props.incomeItems,props.income);moneyCard('支出明細',props.expenseItems,props.operatingExpense);
    ctx.fillStyle='#202838';ctx.font='800 34px system-ui';ctx.fillText('教練薪酬',pad,y+36);y+=60;
    for(const s of props.staff){ctx.fillStyle='rgba(255,255,255,.97)';roundRect(ctx,pad,y,content,staffH,26);ctx.fill();ctx.strokeStyle='#e6e0ef';ctx.stroke();ctx.fillStyle='#202838';ctx.font='800 32px system-ui';ctx.fillText(s.name,pad+28,y+45);ctx.fillStyle='#ec3f83';ctx.textAlign='right';ctx.fillText(money(s.pay),width-pad-28,y+45);ctx.textAlign='left';ctx.fillStyle='#707887';ctx.font='500 22px system-ui';ctx.fillText(`原始 ${s.rawWeight.toFixed(1)} 人時 × ${s.weightMultiplier.toFixed(2)}｜占比 ${(s.share*100).toFixed(1)}%`,pad+28,y+82);const cw=(content-56)/3;[['固定月薪',s.fixedPay],['加權分配',s.weightedPay],['本月薪酬',s.pay]].forEach((a,i)=>{const xx=pad+28+i*(cw+14);ctx.fillStyle=i===2?'#fff1f6':'#f5f1ff';roundRect(ctx,xx,y+105,cw,62,16);ctx.fill();ctx.fillStyle='#7d8592';ctx.font='500 17px system-ui';ctx.fillText(a[0] as string,xx+14,y+128);ctx.fillStyle=i===2?'#d92f75':'#392a62';ctx.font='800 24px system-ui';ctx.fillText(money(a[1] as number),xx+14,y+156);});y+=staffH+gap;}
    ctx.fillStyle='#5e6878';ctx.font='500 22px system-ui';for(const line of wrap(ctx,'※ 固定月薪與加權分配可同時存在；加權薪酬＝出勤時間 × 同時段學生人數 × 加權比例。',content)){ctx.fillText(line,pad,y+20);y+=32;}
    try{const blob=await canvasToBlob(canvas);await saveOrShareBlob(blob,`${props.month}-教練薪酬月報.png`,`${monthLabel(props.month)} 教練薪酬月報`);}catch{alert('圖片產生失敗，請稍後再試。');}
  }
  return <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}><button type="button" className="primaryButton" onClick={copyLine}>{copied?'✓ 已複製':'複製 LINE 文字'}</button><button type="button" className="secondaryButton" onClick={exportImage}>圖片／分享</button></div>;
}
