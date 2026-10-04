import CompetitionParticipantEnhancer from '@/components/CompetitionParticipantEnhancer';
import CompetitionTeamSaveFix from '@/components/CompetitionTeamSaveFix';

export default function CompetitionDetailLayout({children}:{children:React.ReactNode}){
  return <>
    {children}
    <CompetitionParticipantEnhancer/>
    <CompetitionTeamSaveFix/>
  </>;
}
