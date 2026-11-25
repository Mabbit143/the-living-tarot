import { useLayoutEffect, useRef, useState } from 'react';
import { VOICE_OPTIONS } from './Onboarding';
import { nowIso, type Profile } from '../lib/types';
import './welcome.css';

const steps = ['Your name', 'Your context', 'Your reader'] as const;
const extraFields = [
  { key: 'people', label: 'People who matter right now' },
  { key: 'goals', label: 'Goals you’re working toward' },
  { key: 'concerns', label: 'Concerns on your mind' },
  { key: 'themes', label: 'Recurring themes (separate with commas)' },
] as const;

interface Props {
  initial: Profile | null;
  forReading: boolean;
  onSave: (profile: Profile) => void;
  onCancel: () => void;
}

export default function ReaderSetup({ initial, forReading, onSave, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(() => initial ?? ({
    name: '', lifeContext: '', people: '', goals: '', concerns: '', themes: [],
    preferredVoice: 'familiar', readerName: '', createdAt: nowIso(),
  }));
  const [themes, setThemes] = useState(profile.themes.join(', '));
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const last = step === steps.length - 1;

  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  useLayoutEffect(() => {
    heading.current?.focus();
  }, [step]);

  function save() {
    onSave({
      ...profile,
      name: profile.name.trim(), readerName: (profile.readerName ?? '').trim(),
      lifeContext: profile.lifeContext.trim(),
      people: profile.people.trim(), goals: profile.goals.trim(), concerns: profile.concerns.trim(),
      themes: themes.split(',').map((theme) => theme.trim()).filter(Boolean),
    });
  }

  return (
    <dialog className="reader-setup" ref={dialog} aria-labelledby="reader-setup-title" onCancel={(event) => {
      event.preventDefault();
      onCancel();
    }}>
      <p className="small muted">Step {step + 1} of {steps.length} · Optional</p>
      <h2 id="reader-setup-title" ref={heading} tabIndex={-1}>{steps[step]}</h2>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (last) save();
        else setStep(step + 1);
      }}>
        {step === 0 && (
          <>
            <p>Give your reader a name to use when it speaks to you. You can edit or remove it in Profile.</p>
            <label htmlFor="setup-name">What should the reader call you?</label>
            <input id="setup-name" autoComplete="given-name" value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
          </>
        )}
        {step === 1 && (
          <>
            <p>Share anything you’d like the reader to keep in mind when it helps you reflect on a spread.</p>
            <label htmlFor="setup-context">What’s on your mind lately?</label>
            <textarea id="setup-context" rows={3} value={profile.lifeContext}
              onChange={(event) => setProfile({ ...profile, lifeContext: event.target.value })} />
            <details className="reading-disclosure" open>
              <summary>Add more context — people, goals, concerns, themes</summary>
              {extraFields.map(({ key, label }) => (
                <div key={key}>
                  <label htmlFor={`setup-${key}`}>{label}</label>
                  <input id={`setup-${key}`} value={key === 'themes' ? themes : profile[key]}
                    onChange={(event) => {
                      if (key === 'themes') setThemes(event.target.value);
                      else setProfile({ ...profile, [key]: event.target.value });
                    }} />
                </div>
              ))}
            </details>
          </>
        )}
        {last && (
          <>
            <label htmlFor="setup-reader-name">Give your reader a name</label>
            <input
              id="setup-reader-name"
              value={profile.readerName ?? ''}
              onChange={(event) => setProfile({ ...profile, readerName: event.target.value })}
              placeholder="e.g. Morgana — or leave blank to keep the voice name"
            />
            <fieldset className="setup-voices">
              <legend>How would you like the reader to speak?</legend>
            {VOICE_OPTIONS.map(({ id, label, blurb }) => (
              <label key={id}>
                <input type="radio" name="setup-voice" checked={profile.preferredVoice === id}
                  onChange={() => setProfile({ ...profile, preferredVoice: id })} />
                <span><strong>{label}</strong><br /><span className="muted">{blurb}</span></span>
              </label>
            ))}
            </fieldset>
          </>
        )}
        <div className="row setup-actions">
          <button type="submit" className="primary">{last ? (forReading ? 'Save and see guidance' : 'Save profile') : 'Continue'}</button>
          {!last && <button type="button" className="ghost" onClick={() => setStep(step + 1)}>Skip for now</button>}
          {step > 0 && <button type="button" className="ghost" onClick={() => setStep(step - 1)}>Back</button>}
          <button type="button" className="ghost" onClick={onCancel}>Cancel setup</button>
        </div>
      </form>
    </dialog>
  );
}
