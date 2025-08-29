// Server Component (default). Import the client component directly.
import MgidLeaderboardClient from './ui/MgidLeaderboardClient';

export default function Page() {
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
            Cookie NFT Leaderboard for Monad Games ID
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
            Ranked by number of cookie <strong>mints</strong> to each wallet (Top-20). <strong>Updates every 5 minutes</strong>
          </p>
          <MgidLeaderboardClient />
        </div>
      );
}
