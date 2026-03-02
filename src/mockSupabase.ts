/**
 * Mock Supabase client for demo mode.
 * Provides in-memory data so the app can be previewed without real credentials.
 */

export const DEMO_USER_ID = 'demo-user';

// ── Demo profiles (SupabaseProfile shape) ──────────────────────────

const demoUserProfile = {
  id: DEMO_USER_ID,
  display_name: 'Alex',
  dob: '1997-06-15',
  gender: 'Non-binary',
  bio: 'Design enthusiast and coffee lover. Always looking for the next adventure.',
  location_city: 'London, UK',
  job_title: 'Creative Director',
  photos: [
    'https://picsum.photos/seed/demo1/400/600',
    'https://picsum.photos/seed/demo2/400/600',
  ],
  prompts: [
    { question: 'A perfect day for me looks like', answer: 'Morning yoga, brunch with friends, and an evening gallery opening.' },
    { question: "I'm weirdly attracted to", answer: 'People who can make me laugh at the most inappropriate times.' },
  ],
  is_paid: true,
  created_at: '2025-01-01T00:00:00Z',
};

const allProfiles = [
  demoUserProfile,
  {
    id: 'profile-sarah',
    display_name: 'Sarah',
    dob: '1999-03-22',
    gender: 'Woman',
    bio: 'Looking for someone to explore the city with.',
    location_city: 'London, UK',
    job_title: 'Product Designer',
    photos: [
      'https://picsum.photos/seed/sarah1/400/600',
      'https://picsum.photos/seed/sarah2/400/600',
      'https://picsum.photos/seed/sarah3/400/600',
    ],
    prompts: [
      { question: 'I geek out on', answer: 'Figma auto-layout and finding the perfect matcha latte.' },
      { question: 'A shower thought I recently had', answer: 'Why do we press harder on the remote control when the batteries are dying?' },
    ],
    is_paid: true,
    created_at: '2025-02-01T00:00:00Z',
  },
  {
    id: 'profile-james',
    display_name: 'James',
    dob: '1996-08-10',
    gender: 'Man',
    bio: 'Always down for a spontaneous road trip.',
    location_city: 'Manchester, UK',
    job_title: 'Software Engineer',
    photos: [
      'https://picsum.photos/seed/james1/400/600',
      'https://picsum.photos/seed/james2/400/600',
    ],
    prompts: [
      { question: 'My simple pleasures', answer: 'A clean codebase and a good cup of coffee.' },
    ],
    is_paid: true,
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'profile-emma',
    display_name: 'Emma',
    dob: '2001-11-05',
    gender: 'Woman',
    bio: 'Dog mom to a very energetic golden retriever.',
    location_city: 'Bristol, UK',
    job_title: 'Marketing Manager',
    photos: [
      'https://picsum.photos/seed/emma1/400/600',
      'https://picsum.photos/seed/emma2/400/600',
      'https://picsum.photos/seed/emma3/400/600',
    ],
    prompts: [
      { question: 'The way to win me over is', answer: 'Knowing the best hidden food spots in the city.' },
      { question: "I'm looking for", answer: "Someone who doesn't take themselves too seriously." },
    ],
    is_paid: true,
    created_at: '2025-03-01T00:00:00Z',
  },
  {
    id: 'profile-olivia',
    display_name: 'Olivia',
    dob: '1998-07-20',
    gender: 'Woman',
    bio: 'Part-time bookworm, full-time dreamer.',
    location_city: 'London, UK',
    job_title: 'Journalist',
    photos: [
      'https://picsum.photos/seed/olivia1/400/600',
      'https://picsum.photos/seed/olivia2/400/600',
    ],
    prompts: [
      { question: 'My most controversial opinion', answer: 'Pineapple absolutely belongs on pizza.' },
      { question: 'The way to win me over is', answer: 'A handwritten note or a really good Spotify playlist.' },
    ],
    is_paid: true,
    created_at: '2025-01-15T00:00:00Z',
  },
  {
    id: 'profile-aisha',
    display_name: 'Aisha',
    dob: '2000-01-12',
    gender: 'Woman',
    bio: 'Med student who still finds time for art galleries.',
    location_city: 'London, UK',
    job_title: 'Medical Student',
    photos: [
      'https://picsum.photos/seed/aisha1/400/600',
      'https://picsum.photos/seed/aisha2/400/600',
    ],
    prompts: [
      { question: 'I recently discovered that', answer: 'I can actually cook a decent risotto if I focus for more than 10 minutes.' },
    ],
    is_paid: true,
    created_at: '2025-02-20T00:00:00Z',
  },
  {
    id: 'profile-maya',
    display_name: 'Maya',
    dob: '1998-09-03',
    gender: 'Woman',
    bio: 'Photographer with a passion for street art.',
    location_city: 'London, UK',
    job_title: 'Photographer',
    photos: [
      'https://picsum.photos/seed/maya1/400/600',
      'https://picsum.photos/seed/maya2/400/600',
      'https://picsum.photos/seed/maya3/400/600',
    ],
    prompts: [
      { question: 'My favorite quality in a person', answer: 'When they get genuinely excited about the little things.' },
    ],
    is_paid: true,
    created_at: '2025-02-10T00:00:00Z',
  },
];

// ── In-memory database ─────────────────────────────────────────────

let idCounter = 100;

const db: Record<string, any[]> = {
  profiles: [...allProfiles],
  interactions: [
    // Aisha and Maya liked the demo user
    { id: 'like-1', actor_id: 'profile-aisha', target_id: DEMO_USER_ID, type: 'like', comment: null, created_at: '2026-02-26T10:00:00Z' },
    { id: 'like-2', actor_id: 'profile-maya', target_id: DEMO_USER_ID, type: 'like', comment: null, created_at: '2026-02-27T15:30:00Z' },
  ],
  matches: [
    { id: 'match-1', user_a: DEMO_USER_ID, user_b: 'profile-olivia', created_at: '2026-02-20T14:00:00Z' },
  ],
  messages: [
    { id: 'msg-1', match_id: 'match-1', sender_id: 'profile-olivia', body: 'Hey! I noticed we both love exploring London 😊', created_at: '2026-02-20T14:05:00Z' },
    { id: 'msg-2', match_id: 'match-1', sender_id: DEMO_USER_ID, body: "Hey Olivia! Yes, it's the best city. What's your favorite spot?", created_at: '2026-02-20T14:08:00Z' },
    { id: 'msg-3', match_id: 'match-1', sender_id: 'profile-olivia', body: 'Definitely the South Bank on a sunny day. You?', created_at: '2026-02-20T14:12:00Z' },
    { id: 'msg-4', match_id: 'match-1', sender_id: DEMO_USER_ID, body: "I'm a big fan of Columbia Road on Sundays. The flowers are amazing.", created_at: '2026-02-20T14:15:00Z' },
    { id: 'msg-5', match_id: 'match-1', sender_id: 'profile-olivia', body: 'Oh I love that! We should go together sometime 🌸', created_at: '2026-02-20T14:20:00Z' },
  ],
};

// ── Chainable query builder ────────────────────────────────────────

class MockQueryBuilder {
  private _table: string;
  private _filters: Array<(row: any) => boolean> = [];
  private _orderCol: string | null = null;
  private _orderAsc = true;
  private _limitN: number | null = null;
  private _single = false;
  private _insertedRows: any[] | null = null;
  private _selectAfterInsert = false;

  constructor(table: string) {
    this._table = table;
  }

  select(_cols?: string) {
    if (this._insertedRows) {
      this._selectAfterInsert = true;
    }
    return this;
  }

  eq(col: string, val: any) {
    this._filters.push((row) => String(row[col]) === String(val));
    return this;
  }

  not(col: string, op: string, val: string) {
    if (op === 'in') {
      const ids = val.replace(/^\(|\)$/g, '').split(',').map((s) => s.trim());
      this._filters.push((row) => !ids.includes(String(row[col])));
    }
    return this;
  }

  or(expr: string) {
    const parts = expr.split(',');
    const conditions = parts
      .map((p) => {
        const m = p.trim().match(/^(\w+)\.eq\.(.+)$/);
        return m ? { col: m[1], val: m[2] } : null;
      })
      .filter(Boolean) as { col: string; val: string }[];
    if (conditions.length > 0) {
      this._filters.push((row) => conditions.some((c) => String(row[c.col]) === c.val));
    }
    return this;
  }

  in(col: string, vals: any[]) {
    const strVals = vals.map(String);
    this._filters.push((row) => strVals.includes(String(row[col])));
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this._orderCol = col;
    this._orderAsc = opts?.ascending ?? true;
    return this;
  }

  limit(n: number) {
    this._limitN = n;
    return this;
  }

  single() {
    this._single = true;
    return this as any;
  }

  insert(data: any) {
    const rows = Array.isArray(data) ? data : [data];
    this._insertedRows = rows.map((row) => {
      const newRow = {
        ...row,
        id: row.id ?? `gen_${idCounter++}`,
        created_at: row.created_at ?? new Date().toISOString(),
      };
      db[this._table].push(newRow);
      return newRow;
    });
    return this;
  }

  private _resolve() {
    if (this._insertedRows) {
      if (this._selectAfterInsert) {
        const data = this._single ? (this._insertedRows[0] ?? null) : this._insertedRows;
        return { data, error: null };
      }
      return { data: null, error: null };
    }

    let results = [...(db[this._table] ?? [])];

    for (const filter of this._filters) {
      results = results.filter(filter);
    }

    if (this._orderCol) {
      const col = this._orderCol;
      const asc = this._orderAsc;
      results.sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }

    if (this._limitN != null) {
      results = results.slice(0, this._limitN);
    }

    if (this._single) {
      return { data: results[0] ?? null, error: null };
    }

    return { data: results, error: null };
  }

  then(resolve?: (val: any) => any, reject?: (reason: any) => any) {
    const result = this._resolve();
    return Promise.resolve(result).then(resolve, reject);
  }
}

// ── Mock auth ──────────────────────────────────────────────────────

const mockAuth = {
  getSession: async () => ({
    data: { session: { user: { id: DEMO_USER_ID } } },
  }),
  onAuthStateChange: (_callback: any) => ({
    data: { subscription: { unsubscribe: () => {} } },
  }),
  signOut: async () => {},
  signInWithPassword: async (_creds: any) => ({
    data: { user: { id: DEMO_USER_ID }, session: { user: { id: DEMO_USER_ID } } },
    error: null,
  }),
  signUp: async (_creds: any) => ({
    data: { user: { id: DEMO_USER_ID } },
    error: null,
  }),
};

// ── Mock realtime channel ─────────────────────────────────────────

function createMockChannel() {
  const ch: any = {
    on: () => ch,
    subscribe: () => ch,
    unsubscribe: () => {},
  };
  return ch;
}

// ── Exported mock client ──────────────────────────────────────────

export function createMockSupabaseClient() {
  return {
    auth: mockAuth,
    from: (table: string) => new MockQueryBuilder(table),
    channel: (_name: string) => createMockChannel(),
    removeChannel: (_ch: any) => {},
    storage: {
      from: (_bucket: string) => ({
        upload: async () => ({ data: { path: 'demo.jpg' }, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://picsum.photos/seed/${path}/400/600` } }),
      }),
    },
  };
}
