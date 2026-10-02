import type {CSSProperties} from 'react';

export const PUBLIC_THEMES=[
  {id:'current',name:'目前配色',desc:'沿用目前公開網站的紫粉藍漸層。',swatches:['#7c3aed','#ec4899','#16b8aa']},
  {id:'clean',name:'專業清爽',desc:'藍綠＋淡橘，乾淨穩定。',swatches:['#2f7e79','#e7f5f3','#f6b94c']},
  {id:'teaching',name:'活潑教學感',desc:'柔和藍＋暖黃，親切明亮。',swatches:['#4f73b8','#edf3ff','#f2bf4d']},
  {id:'competitive',name:'競技感',desc:'深藍綠＋亮橘，對比清楚。',swatches:['#173f4a','#e8f1f2','#e97835']},
  {id:'sunset',name:'晴空珊瑚',desc:'亮藍＋珊瑚橘＋暖黃。',swatches:['#2f80d0','#ff7a6b','#ffd66b']},
  {id:'berry',name:'莓果繽紛',desc:'莓紫＋粉紅＋奶油黃。',swatches:['#8358b3','#ec6f91','#ffd978']},
  {id:'pingpong',name:'桌球主題',desc:'球桌綠＋球拍紅。',swatches:['#0f6b58','#e23c3c','#ffffff']},
  {id:'equipment',name:'桌球器材風',desc:'深球桌綠＋紅黑器材感。',swatches:['#0b5f4b','#d83a3a','#17191d']},
  {id:'candy',name:'糖果派對',desc:'湖水綠＋珊瑚粉＋亮黃。',swatches:['#11a9a3','#ff6f91','#ffd84d']},
  {id:'neon',name:'霓虹撞色',desc:'紫、桃紅、亮青綠，運動潮流感最強。',swatches:['#6930c3','#ff3d8d','#00c9a7']},
] as const;

const THEME_VARS:Record<string,Record<string,string>>={
  current:{primary:'#7c3aed',accent:'#ec4899',third:'#16b8aa',page:'#f7f5ff',soft:'#f4efff',card:'#ffffff',text:'#172235',border:'#e5e2ef'},
  clean:{primary:'#2f7e79',accent:'#f6b94c',third:'#62a49f',page:'#f4faf9',soft:'#e7f5f3',card:'#ffffff',text:'#18312f',border:'#d8e9e6'},
  teaching:{primary:'#4f73b8',accent:'#f2bf4d',third:'#7ea0de',page:'#f5f8ff',soft:'#edf3ff',card:'#ffffff',text:'#1d2b49',border:'#dce5f6'},
  competitive:{primary:'#173f4a',accent:'#e97835',third:'#267786',page:'#f2f6f7',soft:'#e8f1f2',card:'#ffffff',text:'#132b31',border:'#d4e1e3'},
  sunset:{primary:'#2f80d0',accent:'#ff7a6b',third:'#ffd66b',page:'#f6faff',soft:'#edf6ff',card:'#ffffff',text:'#1d3248',border:'#dce9f5'},
  berry:{primary:'#8358b3',accent:'#ec6f91',third:'#ffd978',page:'#fbf7fd',soft:'#f4ebfa',card:'#ffffff',text:'#392745',border:'#eadcf1'},
  pingpong:{primary:'#0f6b58',accent:'#e23c3c',third:'#2c8b76',page:'#f3f8f6',soft:'#e6f2ee',card:'#ffffff',text:'#17332d',border:'#d4e5df'},
  equipment:{primary:'#0b5f4b',accent:'#d83a3a',third:'#17191d',page:'#f2f6f4',soft:'#e3efeb',card:'#ffffff',text:'#142c27',border:'#d2e1dc'},
  candy:{primary:'#11a9a3',accent:'#ff6f91',third:'#4f9cff',page:'#f7fbff',soft:'#e9fbfa',card:'#ffffff',text:'#25344b',border:'#dcecef'},
  neon:{primary:'#6930c3',accent:'#ff3d8d',third:'#00c9a7',page:'#f8f5ff',soft:'#f0eaff',card:'#ffffff',text:'#261d3f',border:'#e4dafa'},
};

export function getPublicThemeId(mods:Record<string,unknown>|null|undefined){
  const raw=String(mods?.public_theme||'current');
  return THEME_VARS[raw]?raw:'current';
}

export function publicThemeStyle(mods:Record<string,unknown>|null|undefined,brand?:string|null):CSSProperties{
  const id=getPublicThemeId(mods);const t={...THEME_VARS[id]};
  if(id==='current'&&brand)t.primary=brand;
  return {
    '--public-primary':t.primary,'--public-accent':t.accent,'--public-third':t.third,
    '--public-page':t.page,'--public-soft':t.soft,'--public-card':t.card,
    '--public-text':t.text,'--public-border':t.border,'--brand':t.primary,'--public-brand':t.primary,
  } as CSSProperties;
}
