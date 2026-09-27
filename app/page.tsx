import Link from "next/link";
import CoachTrainingPlanner from "@/components/CoachTrainingPlanner";

export default function Page(){
  return (
    <>
      <div className="quickNav">
        <Link href="/students">學生名單</Link>
        <Link href="/login">教練登入</Link>
      </div>
      <CoachTrainingPlanner />
    </>
  );
}
