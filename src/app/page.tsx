import { Dashboard } from "@/components/Dashboard";
import { fetchQuotes } from "@/lib/quotes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const initial = await fetchQuotes();
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <Dashboard initial={initial} />
    </div>
  );
}
