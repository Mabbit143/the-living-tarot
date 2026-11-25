import './welcome.css';

const cards = [
  { id: 'the-fool', name: 'The Fool', width: 300, height: 524 },
  { id: 'strength', name: 'Strength', width: 300, height: 524 },
  { id: 'the-star', name: 'The Star', width: 300, height: 524 },
];

export default function LandingPage({ onStart, onSetup }: { onStart: () => void; onSetup: () => void }) {
  return (
    <div className="welcome">
      <header className="welcome-header">The Living Tarot</header>
      <main className="welcome-hero" aria-labelledby="welcome-heading">
        <div className="welcome-copy">
          <h1 id="welcome-heading">A tarot reader<br /> of your own</h1>
          <p>Personal tarot guidance for moms and homemakers, without the cost of booking a private reading. Bring a question whenever you have a moment and get guidance shaped by what you choose to share.</p>
          <p className="welcome-tagline">A reader that remembers you.</p>
          <div className="welcome-actions">
            <button className="primary" onClick={onStart}>Start a reading</button>
            <button className="ghost" onClick={onSetup}>Set up my reader</button>
          </div>
          <p className="small muted">You can start without a profile.</p>
        </div>
        <div className="welcome-spread" role="group" aria-label="Three cards from the Rider–Waite–Smith deck">
          {cards.map(({ id, name, width, height }) => (
            <img key={id} src={`${import.meta.env.BASE_URL}decks/rws/${id}.webp`} alt={name} width={width} height={height} />
          ))}
        </div>
      </main>
    </div>
  );
}
