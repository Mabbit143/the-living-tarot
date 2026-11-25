import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Archive from './components/Archive';
import ChatReader from './components/ChatReader';
import Lexicon from './components/Lexicon';
import LifeMemory from './components/LifeMemory';
import Onboarding from './components/Onboarding';
import PatternsView from './components/PatternsView';
import ReadingTable from './components/ReadingTable';
import SymbolJournal from './components/SymbolJournal';
import { preferredDeck } from './lib/decks';
import { emptyDb, store } from './lib/store';
import type { Db } from './lib/types';

type Tab = 'read' | 'lexicon' | 'memories' | 'archive' | 'patterns' | 'journal';

const TABS: { id: Tab; label: string }[] = [
  { id: 'read', label: 'Reading Table' },
  { id: 'lexicon', label: 'Lexicon' },
  { id: 'memories', label: 'Life Memory' },
  { id: 'archive', label: 'Archive' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'journal', label: 'Symbol Journal' },
];

export default function App() {
  const [db, setDb] = useState<Db | null>(null);
  const [tab, setTab] = useState<Tab>('read');
  const [activeReadingId, setActiveReadingId] = useState<string | null>(null);
  const [completedReadingId, setCompletedReadingId] = useState<string | null>(null);
  const savedNotice = useRef<HTMLElement>(null);
  const activeReading = db?.readings.find((reading) => reading.id === activeReadingId);
  const showSavedNotice = tab === 'archive' && db?.readings.some((reading) => reading.id === completedReadingId);
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    let alive = true;
    void store.load().then((loaded) => {
      if (alive) setDb(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!showSavedNotice) return;
    savedNotice.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [showSavedNotice, completedReadingId]);

  const updateDb = useCallback((fn: (d: Db) => Db) => {
    setDb((prev) => {
      const base = prev ?? emptyDb();
      const next = fn(base);
      void store.save(next);
      return next;
    });
  }, []);

  if (db === null) {
    return (
      <main className="app">
        <p className="muted">Lighting the candles…</p>
      </main>
    );
  }

  if (!db.profile || editingProfile) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>The Living Tarot</h1>
          <p className="tagline">A reader that remembers you.</p>
        </header>
        <main>
          <Onboarding
            initial={db.profile}
            initialDeck={preferredDeck(db.preferredDeck)}
            onSave={(profile, deck) => {
              updateDb((d) => ({ ...d, profile, preferredDeck: deck }));
              setEditingProfile(false);
            }}
            onCancel={db.profile ? () => setEditingProfile(false) : undefined}
          />
        </main>
      </div>
    );
  }

  const pendingMemoryCount = db.memories.filter((memory) => memory.status === 'suggested').length;

  return (
    <div className="app">
      <header className="app-header">
        <h1>The Living Tarot</h1>
        <p className="tagline">
          A reader that remembers you{db.profile.name ? `, ${db.profile.name}` : ''}.
        </p>
        <nav className="nav" aria-label="Main navigation">
          {TABS.map((t) => (
            <button
              key={t.id}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => {
                setTab(t.id);
                setActiveReadingId(null);
                setCompletedReadingId(null);
              }}
            >
              {t.label}
              {t.id === 'memories' && pendingMemoryCount > 0 && ` (${pendingMemoryCount} to review)`}
            </button>
          ))}
          <button className="ghost" onClick={() => setEditingProfile(true)}>
            Profile
          </button>
        </nav>
      </header>

      <main>
        {activeReading ? (
          <ChatReader
            key={activeReading.id}
            reading={activeReading}
            db={db}
            updateDb={updateDb}
            onDone={() => {
              setCompletedReadingId(activeReading.id);
              setActiveReadingId(null);
              setTab('archive');
            }}
            onBack={() => setActiveReadingId(null)}
          />
        ) : (
          <>
            {tab === 'read' && (
              <ReadingTable
                db={db}
                updateDb={updateDb}
                onStartChat={(r) => setActiveReadingId(r.id)}
                onResumeChat={(r) => setActiveReadingId(r.id)}
              />
            )}
            {tab === 'lexicon' && <Lexicon db={db} updateDb={updateDb} />}
            {tab === 'memories' && <LifeMemory db={db} updateDb={updateDb} />}
            {tab === 'archive' && (
              <>
                {(showSavedNotice || pendingMemoryCount > 0) && (
                  <div className="banner row space-between">
                    <div>
                      {showSavedNotice && <strong className="gold" ref={savedNotice} tabIndex={-1}>Reading saved</strong>}
                      {pendingMemoryCount > 0 && (
                        <div role="status">
                          {pendingMemoryCount} memory {pendingMemoryCount === 1 ? 'suggestion' : 'suggestions'} to review
                        </div>
                      )}
                    </div>
                    {pendingMemoryCount > 0 && (
                      <button className="primary" onClick={() => {
                        setCompletedReadingId(null);
                        setTab('memories');
                      }}>
                        Review {pendingMemoryCount === 1 ? 'memory' : 'memories'}
                      </button>
                    )}
                  </div>
                )}
                <Archive db={db} updateDb={updateDb} />
              </>
            )}
            {tab === 'patterns' && <PatternsView db={db} />}
            {tab === 'journal' && <SymbolJournal db={db} updateDb={updateDb} />}
          </>
        )}
      </main>
    </div>
  );
}
