import { LeaderboardSection } from "@/components/leaderboard/LeaderboardSection";

export const metadata = {
  title: "Leaderboard | Predictify",
  description: "View top predictors and their rankings on the Predictify platform.",
};

export default function LeaderboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <LeaderboardSection />
    </div>
  );
}
