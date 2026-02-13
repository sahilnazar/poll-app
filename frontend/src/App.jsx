import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const API = ''; // relative: same origin (nginx proxies /api in prod, vite in dev)

function usePolls(wsConnected) {
  const [polls, setPolls] = useState([]);
  const [error, setError] = useState(null);

  const fetchPolls = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/polls`);
      if (!r.ok) throw new Error('Failed to load polls');
      const data = await r.json();
      setPolls(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls, wsConnected]);

  return { polls, error, refetch: fetchPolls };
}

function useWebSocket(onPollsUpdate) {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws`);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'polls_updated' || msg.type === 'results_updated') onPollsUpdate();
      } catch (_) {}
    };
    return () => ws.close();
  }, [onPollsUpdate]);
  return connected;
}

function CreatePollForm({ onCreated }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const addOption = () => {
    if (options.length < 4) setOptions((o) => [...o, '']);
  };
  const removeOption = (i) => {
    if (options.length > 2) setOptions((o) => o.filter((_, j) => j !== i));
  };
  const setOption = (i, v) => {
    setOptions((o) => o.map((x, j) => (j === i ? v : x)));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q) {
      setErr('Enter a question.');
      return;
    }
    if (opts.length < 2) {
      setErr('Add at least 2 options.');
      return;
    }
    if (opts.length > 4) {
      setErr('Maximum 4 options.');
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, options: opts }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Create failed');
      setQuestion('');
      setOptions(['', '']);
      onCreated();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card create-form">
      <h2>Create a poll</h2>
      <form onSubmit={submit}>
        <label>
          Question
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What should we decide in this?"
            maxLength={200}
          />
        </label>
        <label>Options (2–4)</label>
        {options.map((opt, i) => (
          <div key={i} className="option-row">
            <input
              type="text"
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              maxLength={100}
            />
            {options.length > 2 && (
              <button type="button" className="btn-ghost" onClick={() => removeOption(i)} aria-label="Remove option">
                −
              </button>
            )}
          </div>
        ))}
        {options.length < 4 && (
          <button type="button" className="btn-ghost add-opt" onClick={addOption}>
            + Add option
          </button>
        )}
        {err && <p className="form-error">{err}</p>}
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create poll'}
        </button>
      </form>
    </section>
  );
}

function PollCard({ poll, onVote, onResultsRefresh }) {
  const [voting, setVoting] = useState(false);
  const [msg, setMsg] = useState('');

  const vote = async (optionIndex) => {
    if (poll.closed) {
      setMsg('Poll is closed.');
      return;
    }
    setMsg('');
    setVoting(true);
    try {
      const r = await fetch(`${API}/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndex }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Vote failed');
      onResultsRefresh();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setVoting(false);
    }
  };

  const total = poll.options.reduce((s, o) => s + o.votes, 0);
  const chartData = poll.options.map((o, i) => ({
    name: o.text,
    votes: o.votes,
    fill: ['#57bdbb', '#6dd4d2', '#45a5a3', '#7ee8e6'][i % 4],
  }));

  return (
    <article className="card poll-card">
      <h3>{poll.question}</h3>
      {poll.closed && <span className="badge closed">Closed</span>}
      <div className="poll-actions">
        {!poll.closed &&
          poll.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className="btn vote-btn"
              onClick={() => vote(i)}
              disabled={voting}
            >
              {opt.text}
            </button>
          ))}
      </div>
      {msg && <p className="form-error">{msg}</p>}
      <div className="results-section">
        <h4>Results</h4>
        <ul className="results-list">
          {poll.options.map((opt, i) => (
            <li key={i}>
              <span className="opt-label">{opt.text}</span>
              <span className="opt-votes">
                {opt.votes} {total > 0 ? `(${Math.round((100 * opt.votes) / total)}%)` : ''}
              </span>
            </li>
          ))}
        </ul>
        {total > 0 && (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <XAxis dataKey="name" tick={{ fill: '#9b9893', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9b9893' }} />
                <Tooltip contentStyle={{ background: '#1a1a20', border: '1px solid #25252d' }} />
                <Bar dataKey="votes" fill="#57bdbb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="votes"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a20', border: '1px solid #25252d' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </article>
  );
}

export default function App() {
  const [refreshTick, setRefreshTick] = useState(0);
  const onPollsUpdate = useCallback(() => setRefreshTick((t) => t + 1), []);
  const wsConnected = useWebSocket(onPollsUpdate);
  const { polls, error, refetch } = usePolls(wsConnected);

  useEffect(() => {
    if (refreshTick > 0) refetch();
  }, [refreshTick, refetch]);

  return (
    <div className="app">
      <header className="header">
        <h1>eQuip Poll</h1>
        <p className="tagline">Real-time team decisions</p>
        {wsConnected && <span className="live-dot" title="Live updates">● Live</span>}
      </header>
      <main className="main">
        <CreatePollForm onCreated={refetch} />
        {error && <p className="form-error"> {error}</p>}
        <section className="polls-section">
          <h2>Active polls</h2>
          {polls.length === 0 && !error && <p className="muted">No polls yet. Create one above.</p>}
          <div className="poll-grid">
            {polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} onVote={refetch} onResultsRefresh={refetch} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
