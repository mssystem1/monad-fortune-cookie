import LeaderboardClient from '../../../app/leaderboard/ui/LeaderboardClient'

export default function MiniLeaderboard() {
  return (
    <>
  
      <div className="grid">
        <div className="card">
          <div className="card__title">Leaderboard</div>
          <LeaderboardClient size="mini" /> {/* implement compact sizes */}
        </div>
      </div>
    </>
  )
}
