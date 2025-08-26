import LeaderboardClient from "./ui/LeaderboardClient";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  return (
    <div>
      <h1
        style={{
          color: "#fff",
          fontSize: 32,
          fontWeight: 900,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        Cookie NFT Leaderboard
      </h1>
      <div
        style={{
          height: 2,
          width: 160,
          background: "linear-gradient(90deg,#7c3aed,#a855f7)",
          borderRadius: 999,
          marginBottom: 14,
        }}
      />
      <p style={{ marginBottom: 20, color: "#9ca3af" }}>
        Ranked by number of cookie <strong>mints</strong> to each wallet (Top-20). <strong>Updates every 10 minutes.</strong>
      </p>
      <LeaderboardClient />
    </div>
  );
}
