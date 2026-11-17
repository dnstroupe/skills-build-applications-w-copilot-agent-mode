import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

const users = [
  { name: 'Mona', email: 'mona@example.com' },
  { name: 'Hubot', email: 'hubot@example.com' },
  { name: 'Riley', email: 'riley@example.com' },
];

interface WorkoutSuggestion {
  title: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
}

interface SuggestionsResponse {
  suggestions: WorkoutSuggestion[];
}

export default function Workouts() {
  const [userEmail, setUserEmail] = useState(users[0].email);
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    setSuggestions(null);
    setHasError(false);
    getJson<SuggestionsResponse>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then(({ suggestions: result }) => {
        if (active) setSuggestions(result);
      })
      .catch(() => {
        if (active) setHasError(true);
      });
    return () => {
      active = false;
    };
  }, [userEmail]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        <label className="form-label" htmlFor="workout-user">Choose a user</label>
        <select
          className="form-select mb-3"
          id="workout-user"
          value={userEmail}
          onChange={(event) => setUserEmail(event.target.value)}
        >
          {users.map((user) => (
            <option key={user.email} value={user.email}>{user.name} ({user.email})</option>
          ))}
        </select>
        {hasError ? (
          <p role="alert">Unable to load workout suggestions. Please try again.</p>
        ) : suggestions === null ? (
          <p role="status">Loading workout suggestions...</p>
        ) : suggestions.length === 0 ? (
          <p>No workout suggestions found.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {suggestions.map((suggestion, index) => (
              <li className="list-group-item" key={`${suggestion.title}-${index}`}>
                <h3 className="h5">{suggestion.title}</h3>
                {suggestion.focus && <p>Focus: {suggestion.focus}</p>}
                {suggestion.minutes !== undefined && <p>Duration: {suggestion.minutes} minutes</p>}
                {suggestion.difficulty && <p>Difficulty: {suggestion.difficulty}</p>}
                {suggestion.reason && <p>{suggestion.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
