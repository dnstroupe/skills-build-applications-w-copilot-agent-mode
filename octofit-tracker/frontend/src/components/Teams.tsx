import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

interface Team {
  name: string;
  mascot?: string;
  members?: string[];
}

interface TeamsResponse {
  teams: Team[];
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<TeamsResponse>('/api/teams')
      .then(({ teams: result }) => {
        if (active) setTeams(result);
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
        <h2 className="h4">Teams</h2>
        <p>Manage teams and members.</p>
        {hasError ? (
          <p role="alert">Unable to load teams. Please try again.</p>
        ) : teams === null ? (
          <p role="status">Loading teams...</p>
        ) : teams.length === 0 ? (
          <p>No teams yet.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {teams.map((team) => (
              <li className="list-group-item" key={team.name}>
                <h3 className="h5">{team.name}</h3>
                <p>Mascot: {team.mascot ?? 'Not specified'}</p>
                <p>Members: {team.members?.length ? team.members.join(', ') : 'None yet'}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
