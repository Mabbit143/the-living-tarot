import { useState } from 'react';
import DeckPicker from './DeckPicker';
import type { DeckId, Profile, VoiceId } from '../lib/types';
import { nowIso } from '../lib/types';

interface Props {
  initial: Profile;
  initialDeck: DeckId;
  onSave: (profile: Profile, deck: DeckId) => void;
  onCancel: () => void;
}

export const VOICE_OPTIONS: { id: VoiceId; label: string; blurb: string }[] = [
  { id: 'familiar', label: 'The Familiar', blurb: 'Warm, plain-spoken, like someone who knows you.' },
  { id: 'mystic', label: 'The Mystic', blurb: 'Symbolic, image-led, reads the card as a dream first.' },
  { id: 'interpreter', label: 'The Interpreter', blurb: 'Precise and structured — card, position, and what recurs.' },
];

export default function Onboarding({ initial, initialDeck, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [lifeContext, setLifeContext] = useState(initial?.lifeContext ?? '');
  const [people, setPeople] = useState(initial?.people ?? '');
  const [goals, setGoals] = useState(initial?.goals ?? '');
  const [concerns, setConcerns] = useState(initial?.concerns ?? '');
  const [themes, setThemes] = useState((initial?.themes ?? []).join(', '));
  const [voice, setVoice] = useState<VoiceId>(initial?.preferredVoice ?? 'familiar');
  const [deck, setDeck] = useState(initialDeck);

  function save() {
    onSave({
      name: name.trim(),
      lifeContext: lifeContext.trim(),
      people: people.trim(),
      goals: goals.trim(),
      concerns: concerns.trim(),
      themes: themes.split(',').map((t) => t.trim()).filter(Boolean),
      preferredVoice: voice,
      createdAt: initial?.createdAt ?? nowIso(),
    }, deck);
  }

  return (
    <div className="card profile-sheet">
      <h2>Your profile</h2>
      <p className="muted">
        Edit what your reader knows about you and how it speaks to you.
      </p>

      <label htmlFor="onboarding-name">What should the reader call you?</label>
      <input id="onboarding-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />

      <label htmlFor="onboarding-life-context">Your life, in your own words</label>
      <textarea
        id="onboarding-life-context"
        rows={4}
        value={lifeContext}
        onChange={(e) => setLifeContext(e.target.value)}
        placeholder="Where you are right now, what matters, what is shifting…"
      />

      <label htmlFor="onboarding-people">People who matter right now</label>
      <input id="onboarding-people" value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Names or roles, separated by commas" />

      <label htmlFor="onboarding-goals">Goals you are carrying</label>
      <input id="onboarding-goals" value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="What you are working toward" />

      <label htmlFor="onboarding-concerns">Concerns on your mind</label>
      <input id="onboarding-concerns" value={concerns} onChange={(e) => setConcerns(e.target.value)} placeholder="What is weighing on you" />

      <label htmlFor="onboarding-themes">Themes — words that keep coming up for you</label>
      <input id="onboarding-themes" value={themes} onChange={(e) => setThemes(e.target.value)} placeholder="e.g. change, home, work, rest" />

      <span id="onboarding-voice-label" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', margin: '0.9rem 0 0.3rem' }}>Who reads for you?</span>
      <div className="spread-grid" role="group" aria-labelledby="onboarding-voice-label">
        {VOICE_OPTIONS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVoice(v.id)}
            style={voice === v.id ? { borderColor: 'var(--gold)', color: 'var(--gold-soft)' } : undefined}
          >
            <strong>{v.label}</strong>
            <br />
            <span className="small muted">{v.blurb}</span>
          </button>
        ))}
      </div>

      <DeckPicker id="profile-deck" value={deck} onChange={setDeck} />

      <div className="row" style={{ marginTop: '1.2rem' }}>
        <button className="primary" onClick={save}>
          Save profile
        </button>
        <button className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
