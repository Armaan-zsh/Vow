// @ts-nocheck
// Mock Prisma for tests
const prisma = {
  user: {
    findUnique: async () => null,
  },
};

const ADJECTIVES = [
  'clever',
  'bright',
  'swift',
  'bold',
  'wise',
  'keen',
  'sharp',
  'quick',
  'smart',
  'witty',
  'agile',
  'brave',
  'calm',
  'cool',
  'eager',
  'fair',
  'gentle',
  'happy',
  'kind',
  'lively',
  'merry',
  'nice',
  'proud',
  'quiet',
];

const NOUNS = [
  'reader',
  'scholar',
  'thinker',
  'learner',
  'seeker',
  'explorer',
  'dreamer',
  'writer',
  'student',
  'teacher',
  'mentor',
  'guide',
  'sage',
  'philosopher',
  'bookworm',
  'bibliophile',
  'wordsmith',
  'storyteller',
  'narrator',
  'scribe',
];

export async function generateUsername(baseInput?: string): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    let username: string;

    if (baseInput && attempts === 0) {
      username = cleanUsername(baseInput);
    } else if (baseInput && attempts < 3) {
      username = `${cleanUsername(baseInput)}${Math.floor(Math.random() * 1000)}`;
    } else {
      const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
      const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
      const number = Math.floor(Math.random() * 1000);
      username = `${adjective}${noun}${number}`;
    }

    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (!existing) {
      return username;
    }

    attempts++;
  }

  return `user${Date.now()}`;
}

function cleanUsername(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^[0-9]+/, '')
    .slice(0, 20);
}

export function validateUsername(username: string): boolean {
  const reservedWords = [
    'admin',
    'api',
    'www',
    'mail',
    'ftp',
    'localhost',
    'root',
    'support',
    'help',
    'info',
    'contact',
    'about',
    'terms',
    'privacy',
    'login',
    'signup',
    'auth',
    'oauth',
    'callback',
    'webhook',
    'test',
    'demo',
    'example',
  ];

  if (username.length < 3 || username.length > 20) {
    return false;
  }

  if (!/^[a-z][a-z0-9]*$/.test(username)) {
    return false;
  }

  if (reservedWords.includes(username.toLowerCase())) {
    return false;
  }

  return true;
}
