import { useState } from 'react';
import type { Profile, VoiceId } from '../lib/types';
import { nowIso } from '../lib/types';

interface Props {
  initial: Profile | null;
  onSave: (profile: Profile) => void;
  onCancel?: () => void;
}

const VOICE_OPTIONS: { id: VoiceId; label: string; blurb: string }[] = [
  { id: 'familiar', label: 'The Familiar', blurb: 'Warm, plain-spoken, like someone who knows you.' },
  { id: 'mystic', label: 'The Mystic', blurb: 'Symbolic, image-led, reads the card as a dream first.' },
  { id: 'interpreter', label: 'The Interpreter', blurb: 'Precise and structured — card, position, and what recurs.' },
];

export default function Onboarding({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [lifeContext, setLifeContext] = useState(initial?.lifeContext ?? '');
  const [people, setPeople] = useState(initial?.people ?? '');
  const [goals, setGoals] = useState(initial?.goals ?? '');
  const [concerns, setConcerns] = useState(initial?.concerns ?? '');
  const [themes, setThemes] = useState((initial?.themes ?? []).join(', '));
  const [voice, setVoice] = useState<VoiceId>(initial?.preferredVoice ?? 'familiar');

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
    });
  }

  return (
    <div className="card">
      <h2>{initial ? 'Your profile' : 'Welcome to The Living Tarot'}</h2>
      <p className="muted">
        {initial
          ? 'Edit what the reader knows about you. Nothing here is shared; it only shapes how readings speak to you.'
          : 'Before your first reading, tell the reader a little about your life. This is what makes readings yours instead of generic — and you can change any of it later.'}
      </p>

      <label>What should the reader call you?</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />

      <label>Your life, in your own words</label>
      <textarea
        rows={4}
        value={lifeContext}
        onChange={(e) => setLifeContext(e.target.value)}
        placeholder="Where you are right now, what matters, what is shifting…"
      />

      <label>People who matter right now</label>
      <input value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Names or roles, separated by commas" />

      <label>Goals you are carrying</label>
      <input value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="What you are working toward" />

      <label>Concerns on your mind</label>
      <input value={concerns} onChange={(e) => setConcerns(e.target.value)} placeholder="What is weighing on you" />

      <label>Themes — words that keep coming up for you</label>
      <input value={themes} onChange={(e) => setThemes(e.target.value)} placeholder="e.g. change, home, work, rest" />

      <label>Who reads for you?</label>
      <div className="spread-grid">
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

      <div className="row" style={{ marginTop: '1.2rem' }}>
        <button className="primary" onClick={save}>
          {initial ? 'Save profile' : 'Begin'}
        </button>
        {onCancel && (
          <button className="ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
