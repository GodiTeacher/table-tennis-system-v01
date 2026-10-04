import CompetitionParticipantEnhancer from '@/components/CompetitionParticipantEnhancer';

export default function CompetitionDetailLayout({children}:{children:React.ReactNode}){
  return <>
    {children}
    <CompetitionParticipantEnhancer/>
  </>;
}
