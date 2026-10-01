export const dynamic = 'force-static';

export default function HealthPage(){
  return <main style={{fontFamily:'system-ui,sans-serif',maxWidth:720,margin:'48px auto',padding:'24px'}}>
    <h1>桌球系統正常運作</h1>
    <p>這個頁面不讀取資料庫，也不執行月結或出勤計算。</p>
    <p><b>HEALTH: OK</b></p>
  </main>;
}
