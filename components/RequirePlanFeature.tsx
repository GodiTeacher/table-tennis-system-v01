import {redirect} from 'next/navigation';
import {getCurrentTeamEntitlements,hasPlanFeature} from '@/lib/subscription-server';

export default async function RequirePlanFeature({feature,children}:{feature:string;children:React.ReactNode}){
  const {entitlements}=await getCurrentTeamEntitlements();
  if(!entitlements||!hasPlanFeature(entitlements,feature)){
    redirect(`/plans?locked=${encodeURIComponent(feature)}`);
  }
  return <>{children}</>;
}
