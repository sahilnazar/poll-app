const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// In-memory store (no external DB - runs entirely in Docker)
const polls = new Map();
let nextPollId = 1;

// WebSocket broadcast helper
let wss = null;
function broadcast(data) {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(JSON.stringify(data));
    });
  }
}

// Validation: 2-4 options
function validatePollBody(body) {
  if (!body.question || typeof body.question !== 'string') {
    return { error: 'Poll must have a non-empty question.' };
  }
  const q = body.question.trim();
  if (q.length === 0) return { error: 'Poll question cannot be empty.' };
  if (!Array.isArray(body.options) || body.options.length < 2 || body.options.length > 4) {
    return { error: 'Poll must have between 2 and 4 options.' };
  }
  const options = body.options
    .filter((o) => o != null && typeof o === 'string')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  if (options.length < 2) return { error: 'At least 2 non-empty options required.' };
  if (options.length > 4) return { error: 'Maximum 4 options allowed.' };
  return { question: q, options };
}

// POST /polls - Create new poll
app.post('/polls', (req, res) => {
  const validated = validatePollBody(req.body);
  if (validated.error) {
    return res.status(400).json({ error: validated.error });
  }
  const id = String(nextPollId++);
  const poll = {
    id,
    question: validated.question,
    options: validated.options.map((text) => ({ text, votes: 0 })),
    closed: false,
    createdAt: new Date().toISOString(),
  };
  polls.set(id, poll);
  broadcast({ type: 'polls_updated' });
  res.status(201).json(poll);
});

// GET /polls - List all polls
app.get('/polls', (req, res) => {
  const list = Array.from(polls.values()).map((p) => ({
    id: p.id,
    question: p.question,
    options: p.options,
    closed: p.closed,
    createdAt: p.createdAt,
  }));
  res.json(list);
});

// GET /polls/:id - Get single poll (for voting view)
app.get('/polls/:id', (req, res) => {
  const poll = polls.get(req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found.' });
  res.json(poll);
});

// GET /polls/:id/results - Get current results
app.get('/polls/:id/results', (req, res) => {
  const poll = polls.get(req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found.' });
  res.json({
    id: poll.id,
    question: poll.question,
    options: poll.options,
    closed: poll.closed,
  });
});

// POST /polls/:id/vote - Submit vote (optionIndex 0-based)
app.post('/polls/:id/vote', (req, res) => {
  const poll = polls.get(req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found.' });
  if (poll.closed) return res.status(400).json({ error: 'This poll is closed. Voting is not allowed.' });
  const optionIndex = req.body.optionIndex;
  if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex >= poll.options.length) {
    return res.status(400).json({ error: 'Invalid option index.' });
  }
  poll.options[optionIndex].votes += 1;
  broadcast({ type: 'results_updated', pollId: poll.id });
  res.json(poll);
});

// POST /polls/:id/close - Close poll (optional, for error-handling demo)
app.post('/polls/:id/close', (req, res) => {
  const poll = polls.get(req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found.' });
  poll.closed = true;
  broadcast({ type: 'polls_updated' });
  res.json(poll);
});

// Health for CI/Docker
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);

// WebSocket server (bonus: real-time updates)
wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Poll API listening on port ${PORT}`);
});
