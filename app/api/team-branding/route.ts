import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: teamId } = await supabase.rpc('current_team_id');
  if (!teamId) return NextResponse.json({ team: null });

  const { data: team, error } = await supabase
    .from('teams')
    .select('name,short_name,logo_data_url,brand_color,tagline,school_name,sport_name')
    .eq('id', teamId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    team: {
      name: team.name,
      shortName: team.short_name,
      logoDataUrl: team.logo_data_url,
      brandColor: team.brand_color || '#7c3aed',
      tagline: team.tagline,
      schoolName: team.school_name,
      sportName: team.sport_name,
    },
  });
}
