import { useEffect, useRef } from 'react';
import SpreadCards from './SpreadCards';
import { getSpread } from '../lib/knowledge';
import './welcome.css';

const cards = ['the-fool', 'strength', 'the-star'];
const spread = getSpread('Three-Card Spread')!;
const preview = spread.positions.map(({ position, label, meaning }, index) => ({
  cardId: cards[index], position, positionLabel: label, positionMeaning: meaning, reversed: false,
}));

export default function LandingPage({ onStart, onSetup }: { onStart: () => void; onSetup: () => void }) {
  const landing = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = landing.current;
    const modulePath = `${import.meta.env.BASE_URL}taste/moments/moments.js`;
    let disposed = false;
    const ready = import(/* @vite-ignore */ modulePath).then(async (moments) => {
      if (!root || disposed) return;
      await moments.mountAll(root);
      if (disposed) moments.unmountAll(root);
      return moments;
    }).catch((error: unknown) => console.warn('Could not load the landing page text animation.', error));
    return () => {
      disposed = true;
      void ready.then((moments) => { if (root) moments?.unmountAll(root); });
    };
  }, []);

  return (
    <div className="welcome" ref={landing}>
      <a className="welcome-skip" href="#welcome-main">Skip to content</a>
      <header className="welcome-header">
        <div className="wrap welcome-header-inner">
          <span className="wordmark">The Living Tarot</span>
          <span className="welcome-tagline">A reader that remembers you.</span>
        </div>
      </header>
      <main id="welcome-main" tabIndex={-1}>
        <section className="hero welcome-hero" data-enter aria-labelledby="welcome-heading">
          <div className="wrap">
            <div className="hero-text welcome-hero-inner">
              <div className="welcome-copy">
                <h1 id="welcome-heading">A tarot reader<br /> of your own</h1>
                <div className="welcome-intro">
                  <p>Personal tarot guidance for moms and homemakers, without the cost of booking a private reading. Start with a 1-, 3-, or 5-card spread.</p>
                  <div className="welcome-actions">
                    <button className="primary" onClick={onStart}>Start a reading</button>
                    <button className="ghost" onClick={onSetup}>Set up my reader</button>
                  </div>
                  <p className="small muted">You can start without a profile.</p>
                </div>
              </div>
              <div className="welcome-spread" data-visual>
                <div className="app-frame welcome-window" data-ui aria-label="Reading Table preview">
                  <p>The reading table <span className="muted">{spread.name}</span></p>
                  <SpreadCards cards={preview} deck="rws" />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="welcome-statement" data-moment="word-highlight" aria-labelledby="welcome-context-heading">
          <div className="wrap welcome-wrap">
            <h2 id="welcome-context-heading">Guidance for your situation</h2>
            <p className="mo-wh__text">Ask what’s on your mind. After your reading, share as much as you like and get <strong>personal guidance</strong> for the cards you already drew.</p>
            <button className="primary welcome-close" onClick={onStart}>Start a reading</button>
          </div>
        </section>
      </main>
    </div>
  );
}
