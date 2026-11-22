/* NEXORA sample templates and seed data. Illustrative planning examples only:
   no legal, immigration, financial or professional requirements are implied. */
(function (root) {
  const CATS = {
    milestone: { label: 'Main event', color: '#8B7CFF', soft: '#F3F0FF', icon: 'flag' },
    housing: { label: 'Housing', color: '#64B5F6', soft: '#EAF4FE', icon: 'home' },
    work: { label: 'Work', color: '#B9AFFF', soft: '#F3F0FF', icon: 'briefcase' },
    documents: { label: 'Documents', color: '#5CCFDF', soft: '#E3F7F9', icon: 'file' },
    budget: { label: 'Budget', color: '#A397FF', soft: '#F1EEFF', icon: 'wallet' },
    travel: { label: 'Travel', color: '#7EE6D8', soft: '#E5F9F6', icon: 'plane' },
    study: { label: 'Study', color: '#64B5F6', soft: '#EAF4FE', icon: 'book' },
    research: { label: 'Research', color: '#5CCFDF', soft: '#E3F7F9', icon: 'search' },
    people: { label: 'People', color: '#B9AFFF', soft: '#F3F0FF', icon: 'users' }
  };

  /* rule specs: rel = relative to the milestone, fix / flex = absolute date set at creation */
  const T = [
    {
      key: 'move', name: 'Moving to a new country', goal: 'Plan a move', icon: 'home',
      blurb: 'Housing, work, documents, budget and travel around one move day.',
      milestone: { title: 'Move day', date: '2027-05-15', desc: 'The day you arrive at the new home. Most tasks are planned around it.' },
      nodes: [
        ['research', 'Research housing options', 'task', 'housing', { flex: -56 }, 60, 70, { desc: 'Collect neighbourhoods, price ranges and commute times.', priority: 'medium' }],
        ['budget', 'Prepare moving budget', 'task', 'budget', { rel: -60 }, 60, 270, { desc: 'Estimate moving costs, deposits and a contingency.', priority: 'high' }],
        ['housing', 'Confirm housing plan', 'decision', 'housing', { rel: -21 }, 390, 170, { desc: 'Choose where you will live first and book it.', priority: 'high' }],
        ['docs', 'Review document requirements', 'task', 'documents', { fix: -40 }, 60, 500, { desc: 'Build a personal checklist and verify each item with the official source. NEXORA does not supply legal requirements.', review: true, priority: 'high' }],
        ['travel', 'Plan travel arrangements', 'task', 'travel', { rel: -14 }, 390, 400, { desc: 'Pick the route and book the trip.', priority: 'medium' }],
        ['transport', 'Confirm transport', 'task', 'travel', { flex: -12 }, 720, 400, { desc: 'Confirm movers or luggage transport for the chosen travel day.', priority: 'medium' }],
        ['handover', 'Arrange work handover', 'task', 'work', { flex: -10 }, 60, 700, { desc: 'Agree a handover plan with your current team.', review: true, priority: 'medium' }],
        ['pack', 'Pack essentials', 'task', 'travel', { rel: -7 }, 720, 600, { desc: 'Pack what you need for the first two weeks.', priority: 'low' }],
        ['final', 'Final checks', 'task', 'milestone', { flex: -3 }, 1040, 300, { desc: 'Walk through housing, transport and documents one last time.', priority: 'high' }]
      ],
      mpos: [1340, 330],
      deps: [['research', 'housing'], ['budget', 'housing'], ['housing', 'final'], ['travel', 'transport'], ['transport', 'final'], ['docs', 'final'], ['final', 'm'], ['pack', 'm'], ['handover', 'm', 'informational']]
    },
    {
      key: 'career', name: 'Career transition', goal: 'Change careers', icon: 'briefcase',
      blurb: 'From target role to first day, with notice and handover in view.',
      milestone: { title: 'Start new role', date: '2027-03-01', desc: 'Your first working day in the new role.' },
      nodes: [
        ['goal', 'Define target role', 'decision', 'research', { flex: -120 }, 60, 80, { desc: 'Write down the role, industry and must-haves.' }],
        ['portfolio', 'Prepare portfolio', 'task', 'work', { rel: -90 }, 390, 80, { desc: 'Update CV, portfolio and profiles.' }],
        ['apply', 'Send applications', 'task', 'work', { rel: -75 }, 390, 300, { desc: 'Apply to the shortlisted companies.' }],
        ['interviews', 'Interview round', 'task', 'people', { rel: -45 }, 720, 300, { desc: 'Prepare stories and questions for each interview.' }],
        ['offer', 'Review offer', 'decision', 'budget', { rel: -30 }, 720, 520, { desc: 'Compare the offer with your budget and goals.' }],
        ['notice', 'Hand in notice', 'task', 'work', { flex: -28 }, 1040, 520, { desc: 'Notice periods depend on your own contract. Check it yourself.', review: true }],
        ['transition', 'Transition plan', 'task', 'work', { rel: -7 }, 1040, 300, { desc: 'Close open work and plan your first week.' }]
      ],
      mpos: [1340, 300],
      deps: [['goal', 'portfolio'], ['portfolio', 'apply'], ['apply', 'interviews'], ['interviews', 'offer'], ['offer', 'notice'], ['notice', 'transition'], ['transition', 'm']]
    },
    {
      key: 'study', name: 'Starting a degree', goal: 'Start studying', icon: 'book',
      blurb: 'Programs, application, budget and accommodation before day one.',
      milestone: { title: 'First day of the program', date: '2027-09-27', desc: 'The start date of your program.' },
      nodes: [
        ['programs', 'Research programs', 'task', 'research', { flex: -290 }, 60, 80, { desc: 'Compare programs, formats and start dates.' }],
        ['application', 'Prepare application', 'task', 'study', { rel: -240 }, 390, 80, { desc: 'Collect what each program asks for.' }],
        ['submit', 'Submit application', 'task', 'documents', { fix: -224 }, 720, 80, { desc: 'Deadlines are set by each program. Enter yours and verify it.', review: true }],
        ['money', 'Budget for studies', 'task', 'budget', { rel: -120 }, 390, 330, { desc: 'Fees, living costs and a buffer.' }],
        ['room', 'Find accommodation', 'decision', 'housing', { rel: -45 }, 720, 330, { desc: 'Shortlist and book a place to live.' }],
        ['trip', 'Arrange travel', 'task', 'travel', { rel: -10 }, 1040, 330, { desc: 'Plan how and when you arrive.' }],
        ['orient', 'Orientation checklist', 'task', 'study', { rel: -3 }, 1040, 560, { desc: 'Timetable, campus map, first-week list.' }]
      ],
      mpos: [1340, 300],
      deps: [['programs', 'application'], ['application', 'submit'], ['money', 'room'], ['submit', 'room'], ['room', 'trip'], ['trip', 'm'], ['orient', 'm']]
    },
    {
      key: 'purchase', name: 'Major purchase', goal: 'Plan a major purchase', icon: 'wallet',
      blurb: 'Requirements, affordability and comparison before you decide.',
      milestone: { title: 'Purchase decision', date: '2027-04-30', desc: 'The day you plan to decide.' },
      nodes: [
        ['needs', 'Define requirements', 'task', 'research', { flex: -80 }, 60, 120, { desc: 'Must-haves, nice-to-haves and deal-breakers.' }],
        ['afford', 'Check affordability', 'task', 'budget', { rel: -60 }, 60, 380, { desc: 'What you can spend without stretching.' }],
        ['options', 'Compare options', 'task', 'research', { rel: -45 }, 390, 120, { desc: 'List realistic options side by side.' }],
        ['finance', 'Research financing', 'task', 'budget', { rel: -50 }, 390, 380, { desc: 'Collect general information. This is not financial advice.', review: true }],
        ['short', 'Shortlist', 'decision', 'research', { rel: -21 }, 720, 250, { desc: 'Keep the best two or three.' }],
        ['compare', 'Final comparison', 'decision', 'milestone', { rel: -7 }, 1040, 250, { desc: 'Score the shortlist against your requirements.' }]
      ],
      mpos: [1340, 250],
      deps: [['needs', 'options'], ['afford', 'finance'], ['options', 'short'], ['finance', 'short'], ['short', 'compare'], ['compare', 'm']]
    },
    {
      key: 'shared', name: 'Shared life event', goal: 'Plan a joint event', icon: 'users',
      blurb: 'Budget, venue, people and coordination for a shared day.',
      milestone: { title: 'Event day', date: '2027-08-21', desc: 'The day of the shared event.' },
      nodes: [
        ['agree', 'Agree on budget', 'decision', 'budget', { rel: -200 }, 60, 120, { desc: 'Agree on a total and who covers what.' }],
        ['venues', 'Shortlist venues and services', 'task', 'research', { rel: -180 }, 390, 120, { desc: 'Two or three options per need.' }],
        ['guests', 'Guest list', 'task', 'people', { rel: -120 }, 390, 360, { desc: 'Who you invite and how many.' }],
        ['book', 'Book venue', 'task', 'housing', { fix: -150 }, 720, 120, { desc: 'Booking terms come from the venue. Enter your own date.', review: true }],
        ['helpers', 'Coordinate helpers', 'task', 'people', { rel: -30 }, 720, 360, { desc: 'Roles for friends and family.' }],
        ['final', 'Final coordination', 'task', 'milestone', { rel: -5 }, 1040, 240, { desc: 'Timeline for the day, shared with everyone involved.' }]
      ],
      mpos: [1340, 240],
      deps: [['agree', 'venues'], ['venues', 'book'], ['guests', 'helpers'], ['book', 'final'], ['helpers', 'final'], ['final', 'm']]
    }
  ];

  const DAY = 864e5;
  const toN = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / DAY; };
  const toS = n => new Date(n * DAY).toISOString().slice(0, 10);
  let seq = 0;
  const uid = p => p + Date.now().toString(36) + (seq++).toString(36);

  /* build an editable map from a template; ids are scoped so copies never collide */
  function fromTemplate(key, opts) {
    const t = T.find(x => x.key === key) || T[0];
    opts = opts || {};
    const date = opts.date || t.milestone.date;
    const mid = opts.id || uid('m');
    const pre = mid + '_';
    const mNode = {
      id: pre + 'm', title: opts.milestoneTitle || t.milestone.title, description: t.milestone.desc, type: 'milestone', category: 'milestone',
      status: 'todo', rule: { kind: 'fixed', date }, x: Math.round(t.mpos[0] * 0.86), y: t.mpos[1], priority: 'high', notes: '', checklist: []
    };
    const nodes = [mNode].concat(t.nodes.map(([id, title, type, category, r, x, y, ex]) => {
      let rule;
      if ('rel' in r) rule = { kind: 'relative', anchor: mNode.id, offset: r.rel };
      else if ('fix' in r) rule = { kind: 'fixed', date: toS(toN(date) + r.fix) };
      else rule = { kind: 'flexible', date: toS(toN(date) + r.flex) };
      const n = { id: pre + id, title, description: ex.desc || '', type, category, status: 'todo', rule, x: Math.round(x * 0.86), y, priority: ex.priority || 'medium', notes: '', checklist: [] };
      if (ex.review) n.reviewWith = mNode.id;
      return n;
    }));
    const deps = t.deps.map(([a, b, rel], i) => ({ id: pre + 'e' + i, from: pre + a, to: pre + b, relation: rel || 'finish_to_start' }));
    return {
      id: mid, title: opts.title || t.name, template: t.key, status: opts.status || 'active', budget: opts.budget || null,
      createdAt: opts.now || new Date().toISOString(), updatedAt: opts.now || new Date().toISOString(),
      nodes, deps, scenarios: []
    };
  }

  function customMap(opts) {
    const mid = uid('m'), pre = mid + '_', date = opts.date;
    const m = { id: pre + 'm', title: opts.milestoneTitle || 'My milestone', description: 'Your main event.', type: 'milestone', category: 'milestone', status: 'todo', rule: { kind: 'fixed', date }, x: 900, y: 260, priority: 'high', notes: '', checklist: [] };
    const a = { id: pre + 'a', title: 'First step', description: 'Rename me and add details.', type: 'task', category: 'research', status: 'todo', rule: { kind: 'relative', anchor: m.id, offset: -30 }, x: 120, y: 160, priority: 'medium', notes: '', checklist: [] };
    const b = { id: pre + 'b', title: 'Second step', description: '', type: 'task', category: 'work', status: 'todo', rule: { kind: 'relative', anchor: m.id, offset: -7 }, x: 480, y: 330, priority: 'medium', notes: '', checklist: [] };
    return { id: mid, title: opts.title || 'Custom plan', template: 'custom', status: 'active', budget: opts.budget || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), nodes: [m, a, b], deps: [{ id: pre + 'e0', from: a.id, to: b.id, relation: 'finish_to_start' }, { id: pre + 'e1', from: b.id, to: m.id, relation: 'finish_to_start' }], scenarios: [] };
  }

  function seed() {
    const now = '2026-11-18T18:20:00.000Z';
    const move = fromTemplate('move', { id: 'move', now, budget: 6000 });
    move.nodes.find(n => n.id === 'move_research').status = 'in_progress';
    /* user-entered cost estimates (illustrative); some are left empty on purpose to show missing information */
    const est = { housing: 2400, travel: 450, transport: 900, pack: 60, budget: 0, research: 0 };
    Object.keys(est).forEach(k => { move.nodes.find(n => n.id === 'move_' + k).cost = est[k]; });
    move.contingency = 10;
    move.nodes.find(n => n.id === 'move_research').checklist = [{ t: 'List three neighbourhoods', done: true }, { t: 'Check commute times', done: false }, { t: 'Compare price ranges', done: false }];
    const career = fromTemplate('career', { id: 'career', now: '2026-11-12T10:00:00.000Z' });
    career.nodes.find(n => n.id === 'career_goal').status = 'done';
    career.nodes.find(n => n.id === 'career_portfolio').status = 'in_progress';
    return {
      v: 1,
      user: { alias: 'Alex Morgan' },
      prefs: { dateFmt: 'long', reducedMotion: false, onboarded: false },
      maps: [
        move, career,
        fromTemplate('study', { id: 'study', status: 'draft', now: '2026-11-02T09:00:00.000Z' }),
        fromTemplate('purchase', { id: 'purchase', status: 'draft', now: '2026-10-21T09:00:00.000Z' }),
        fromTemplate('shared', { id: 'shared', status: 'archived', now: '2026-09-30T09:00:00.000Z' })
      ],
      activity: [
        { t: '2026-11-18T18:20:00.000Z', text: 'Started “Research housing options”', map: 'move' },
        { t: '2026-11-12T10:00:00.000Z', text: 'Completed “Define target role”', map: 'career' },
        { t: '2026-11-02T09:00:00.000Z', text: 'Created “Starting a degree” from a template', map: 'study' }
      ]
    };
  }

  const api = { CATS, TEMPLATES: T, fromTemplate, customMap, seed, uid };
  root.NXD = api;
})(typeof window !== "undefined" ? window : globalThis);

// ES module marker for Vite and TypeScript; the file still publishes its API on window.
export {};
