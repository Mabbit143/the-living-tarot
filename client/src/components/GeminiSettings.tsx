import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { connectGemini, geminiConfigured } from '../lib/gemini';
import type { Db } from '../lib/types';

interface Props {
  db: Db;
  updateDb: (fn: (db: Db) => Db) => void;
}

export default function GeminiSettings({ db, updateDb }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [configured, setConfigured] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void geminiConfigured(controller.signal).then(setConfigured).catch(() => {
      // The local reader is also available on static builds with no API route.
    });
    return () => controller.abort();
  }, []);

  async function onConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const key = String(new FormData(form).get('key') ?? '').trim();
    form.reset();
    setConnecting(true);
    setError('');
    try {
      await connectGemini(key);
      setConfigured(true);
      updateDb((current) => ({ ...current, useGeminiReader: true }));
      dialog.current?.close();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not connect to Gemini.');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div style={{ marginTop: '0.9rem' }}>
      <div className="row">
        <label className="row" style={{ margin: 0 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={Boolean(db.useGeminiReader)}
            onChange={(event) => {
              const checked = event.target.checked;
              if (checked && !configured) {
                dialog.current?.showModal();
                return;
              }
              updateDb((current) => ({ ...current, useGeminiReader: checked }));
            }} />
          Use Gemini for readings
        </label>
        <button className="ghost" onClick={() => dialog.current?.showModal()}>
          {configured ? 'Change Gemini key' : 'Connect Gemini'}
        </button>
      </div>
      {db.useGeminiReader && (
        <>
          <p className="small muted" style={{ margin: '0.35rem 0' }}>
            Google Gemini receives your cards, question, and recent messages from this reading,
            and writes it richly: what each card means, what it means for you, and the true arc
            of the spread. The local reader stays as the fallback when Gemini is unavailable.
          </p>
          <label className="row" style={{ margin: 0 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={Boolean(db.geminiSavedContext)}
              onChange={(event) => {
                const checked = event.target.checked;
                updateDb((current) => ({ ...current, geminiSavedContext: checked }));
              }} />
            Include card associations, relevant confirmed memories, and names
          </label>
        </>
      )}
      <dialog ref={dialog} className="card lexicon-dialog" aria-labelledby="gemini-title"
        onCancel={(event) => { if (connecting) event.preventDefault(); }}
        onClose={() => { setError(''); dialog.current?.querySelector('form')?.reset(); }}>
        <form onSubmit={onConnect}>
          <h3 id="gemini-title">Connect Gemini</h3>
          <p className="small muted">Google verifies the key. This app holds it in its local server until you restart the server.</p>
          <p className="small muted">Connecting turns on Gemini readings. Google receives the cards, question, and recent messages for those readings.</p>
          <label htmlFor="gemini-api-key">Gemini API key</label>
          <input id="gemini-api-key" name="key" type="password" autoComplete="off" spellCheck={false}
            autoFocus required disabled={connecting} />
          {error && <p className="small" role="alert">{error}</p>}
          {connecting && <p className="small muted" role="status">Checking the key with Google…</p>}
          <div className="row" style={{ marginTop: '0.8rem' }}>
            <button className="primary" type="submit" disabled={connecting}>Connect and use Gemini</button>
            <button className="ghost" type="button" disabled={connecting} onClick={() => dialog.current?.close()}>Cancel</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
