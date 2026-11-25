import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Archive from './components/Archive';
import ChatReader from './components/ChatReader';
import Lexicon from './components/Lexicon';
import LandingPage from './components/LandingPage';
import LifeMemory from './components/LifeMemory';
import Onboarding from './components/Onboarding';
import PatternsView from './components/PatternsView';
import ReadingTable from './components/ReadingTable';
import ReaderSetup from './components/ReaderSetup';
import SymbolJournal from './components/SymbolJournal';
import { preferredDeck } from './lib/decks';
import { buildPersonalizedGuidance } from './lib/reader';
import { emptyDb, store } from './lib/store';
import type { Db, Profile } from './lib/types';

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
  const [storageRecovered, setStorageRecovered] = useState(false);
  const [setup, setSetup] = useState<'landing' | 'profile' | 'reading' | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const focusReadingTable = useRef(false);
  const started = Boolean(db && (db.hasStarted || db.profile || db.readings.length));

  useEffect(() => {
    let alive = true;
    void store.load().then((loaded) => {
      if (!alive) return;
      setDb(loaded);
      if (store.recoveredFromCorruptStorage?.()) setStorageRecovered(true);
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

  useLayoutEffect(() => {
    if (!started || !focusReadingTable.current) return;
    focusReadingTable.current = false;
    mainRef.current?.focus();
    window.scrollTo(0, 0);
  }, [started]);

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

  function saveSetup(profile: Profile) {
    if (setup === 'landing') focusReadingTable.current = true;
    const readingId = setup === 'reading' ? activeReading?.id : undefined;
    updateDb((d) => ({
      ...d,
      hasStarted: true,
      profile,
      readings: readingId ? d.readings.map((reading) => (
        reading.id === readingId && reading.interpretation && !reading.personalizedGuidance
          ? { ...reading, personalizedGuidance: buildPersonalizedGuidance(reading, profile, d.lexicon) }
          : reading
      )) : d.readings,
    }));
    setEditingProfile(false);
    setSetup(null);
  }

  const guide = setup && (
    <ReaderSetup initial={db.profile} forReading={setup === 'reading'}
      onSave={saveSetup} onCancel={() => setSetup(null)} />
  );

  if (!started) {
    return (
      <>
        {storageRecovered && (
          <div className="banner" role="status">
            <strong className="gold">Your saved data couldn’t be read</strong>
            <p className="small muted" style={{ margin: '0.3rem 0 0.6rem' }}>
              We started fresh so nothing else could go wrong. A copy of what
              was saved was kept on this device for recovery.
            </p>
            <button className="ghost" onClick={() => setStorageRecovered(false)}>Dismiss</button>
          </div>
        )}
        <LandingPage onStart={() => {
          focusReadingTable.current = true;
          updateDb((d) => ({ ...d, hasStarted: true }));
        }} onSetup={() => setSetup('landing')} />
        {guide}
      </>
    );
  }

  if (editingProfile && db.profile) {
    return (
      <div className="app profile-workspace">
        <header className="app-header">
          <h1 className="wordmark">The Living Tarot</h1>
          <p className="tagline">A reader that remembers you.</p>
        </header>
        <main className="workspace-main view-profile">
          <Onboarding
            initial={db.profile}
            initialDeck={preferredDeck(db.preferredDeck)}
            onSave={(profile, deck) => {
              updateDb((d) => ({ ...d, profile, preferredDeck: deck }));
              setEditingProfile(false);
            }}
            onCancel={() => setEditingProfile(false)}
          />
          <button className="ghost" onClick={() => setSetup('profile')}>Set up my reader</button>
          {guide}
        </main>
      </div>
    );
  }

  const pendingMemoryCount = db.memories.filter((memory) => memory.status === 'suggested').length;

  return (
    <div className="app tarot-workspace">
      {storageRecovered && (
        <div className="banner row space-between" role="status">
          <div>
            <strong className="gold">Your saved data couldn’t be read</strong>
            <p className="small muted" style={{ margin: '0.3rem 0 0' }}>
              A copy of what was saved was kept on this device for recovery.
            </p>
          </div>
          <button className="ghost" onClick={() => setStorageRecovered(false)}>Dismiss</button>
        </div>
      )}
      <header className="app-header">
        <h1 className="wordmark">The Living Tarot</h1>
        <div className="workspace-account">
          <p className="tagline">
            A reader that remembers you{db.profile?.name ? `, ${db.profile.name}` : ''}.
          </p>
          <button className="ghost" onClick={() => db.profile ? setEditingProfile(true) : setSetup('profile')}>
            Profile
          </button>
        </div>
      </header>
      <nav className="nav workspace-nav" aria-label="Main navigation">
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
      </nav>

      <main className={`workspace-main view-${activeReading ? 'reader' : tab}`} ref={mainRef} tabIndex={-1}>
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
            onSetupReader={!db.profile ? () => setSetup('reading') : undefined}
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
      {guide}
    </div>
  );
}
