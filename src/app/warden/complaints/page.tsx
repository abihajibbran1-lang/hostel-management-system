import { WardenComplaintQueue } from "../../../components/complaints/warden-complaint-queue.tsx";
import Link from "next/link";

export default async function WardenComplaintsPage({
  searchParams,
}: { searchParams: Promise<{ queue?: string }> }) {
  const queue = (await searchParams).queue === "intake" ? "intake" : "house";
  return (
    <main className="min-h-screen">
      <nav aria-label="Complaint queues" className="flex gap-4 p-4">
        <Link href="/warden/complaints" aria-current={queue === "house" ? "page" : undefined}>House complaints</Link>
        <Link href="/warden/complaints?queue=intake" aria-current={queue === "intake" ? "page" : undefined}>Unassigned intake</Link>
      </nav>
      <WardenComplaintQueue key={queue} queue={queue} />
    </main>
  );
}
