import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

interface LeaderboardEntry {
  teamName: string;
  totalPoints: number;
  rank: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<LeaderboardResponse>('/api/leaderboard')
      .then(({ leaderboard: result }) => {
        if (active) setLeaderboard(result);
      })
      .catch(() => {
        if (active) setHasError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Leaderboard</h2>
        <p>Compare team point totals.</p>
        {hasError ? (
          <p role="alert">Unable to load leaderboard. Please try again.</p>
        ) : leaderboard === null ? (
          <p role="status">Loading leaderboard...</p>
        ) : leaderboard.length === 0 ? (
          <p>No leaderboard scores yet.</p>
        ) : (
          <ol className="list-group list-group-numbered">
            {leaderboard.map((entry) => (
              <li className="list-group-item" key={entry.rank}>
                <span>{entry.teamName}</span>
                <span className="float-end">{entry.totalPoints} points</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
