import {NextRequest} from 'next/server';
import {createClient} from '@/lib/supabase/server';

function csvCell(value:unknown){
  const s=String(value??'');
  return '"'+s.replace(/"/g,'""')+'"';
}
function pad(n:number){return String(n).padStart(2,'0')}
function localDate(d:Date){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}

export async function GET(req:NextRequest){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId)return new Response('Unauthorized',{status:401});

  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId)return new Response('No team',{status:403});

  const {data:membership}=await supabase.from('team_members').select('member_role,permissions').eq('team_id',teamId).eq('user_id',userId).maybeSingle();
  const role=membership?.member_role??'coach';
  const permissions=(membership?.permissions??{}) as Record<string,boolean>;
  const canReport=['owner','admin'].includes(role)||Boolean(permissions.wallet_reports);
  if(!canReport)return new Response('Forbidden',{status:403});

  const now=new Date();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const from=req.nextUrl.searchParams.get('from')||localDate(monthStart);
  const to=req.nextUrl.searchParams.get('to')||localDate(now);
  const fromIso=from+'T00:00:00+08:00';
  const toDate=new Date(to+'T00:00:00+08:00');toDate.setDate(toDate.getDate()+1);
  const toIso=toDate.toISOString();

  const [{data:txRows},{data:studentRows},{data:categoryRows}]=await Promise.all([
    supabase.from('wallet_transactions')
      .select('transaction_no,student_id,transaction_type,amount,balance_before,balance_after,category_id,payment_method,note,status,created_at,operator_user_id')
      .eq('team_id',teamId).gte('created_at',fromIso).lt('created_at',toIso).order('created_at'),
    supabase.from('students').select('id,display_name').eq('team_id',teamId),
    supabase.from('wallet_categories').select('id,name').eq('team_id',teamId),
  ]);

  const studentMap=new Map((studentRows??[]).map((s:any)=>[s.id,s.display_name]));
  const categoryMap=new Map((categoryRows??[]).map((c:any)=>[c.id,c.name]));
  const header=['交易編號','時間','學生','類型','金額','交易前餘額','交易後餘額','消費類別','收款方式','狀態','備註'];
  const lines=[header.map(csvCell).join(',')];

  for(const t of txRows??[]){
    const type=t.transaction_type==='top_up'?'儲值':t.transaction_type==='charge'?'扣款':t.transaction_type==='reversal'?'沖正':t.transaction_type;
    const method=t.payment_method==='cash'?'現金':t.payment_method==='transfer'?'匯款':t.payment_method==='other'?'其他':'';
    lines.push([
      t.transaction_no,
      new Date(t.created_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}),
      studentMap.get(t.student_id)||'',
      type,
      t.amount,
      t.balance_before,
      t.balance_after,
      t.category_id?(categoryMap.get(t.category_id)||''):'',
      method,
      t.status==='reversed'?'已沖正':'有效',
      t.note??''
    ].map(csvCell).join(','));
  }

  const bom='\uFEFF';
  const body=bom+lines.join('\r\n');
  return new Response(body,{
    headers:{
      'Content-Type':'text/csv; charset=utf-8',
      'Content-Disposition':'attachment; filename="wallet-report-'+from+'-'+to+'.csv"',
      'Cache-Control':'no-store'
    }
  });
}
