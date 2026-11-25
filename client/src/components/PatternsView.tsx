import { computePatterns } from '../lib/patterns';
import type { Db } from '../lib/types';

interface Props {
  db: Db;
}

export default function PatternsView({ db }: Props) {
  const report = computePatterns(db.readings);

  return (
    <div className="patterns-layout">
      <div className="card patterns-intro">
        <h2>Patterns</h2>
        <p className="muted">{report.caveat}</p>
        {report.readingCount === 0 && (
          <p>
            Complete a few readings and the patterns will show up here — which cards keep
            returning, which pairs travel together.
          </p>
        )}
      </div>

      {report.topCards.length > 0 && (
        <div className="card pattern-list">
          <h3>Cards that keep appearing</h3>
          <ul>
            {report.topCards.map((c) => (
              <li key={c.cardId}>
                <strong>{c.name}</strong> — {c.count} time{c.count === 1 ? '' : 's'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.topPairs.length > 0 && (
        <div className="card pattern-list">
          <h3>Pairs that travel together</h3>
          <ul>
            {report.topPairs.map((p) => (
              <li key={`${p.a}|${p.b}`}>
                <strong>
                  {p.nameA} + {p.nameB}
                </strong>{' '}
                — {p.count} time{p.count === 1 ? '' : 's'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
