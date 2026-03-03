export type Photo = {
  id: string;
  url: string;
  caption?: string;
};

export type Prompt = {
  id: string;
  question: string;
  answer: string;
};

export type UserProfile = {
  id: string;
  name: string;
  age: number;
  location: string;
  job: string;
  height: string;
  photos: Photo[];
  prompts: Prompt[];
  bio: string;
  lastActive?: string;
  recentlyUpdated?: boolean;
  compatibility?: string[];
  profileCompletion?: number;
};

/** Row shape from Supabase 'profiles' table */
export type SupabaseProfile = {
  id: string;
  display_name: string;
  dob: string;
  gender: string;
  sexuality?: string | null;
  interested_in?: string[] | null;
  religion?: string | null;
  race?: string | null;
  ethnicity?: string | null;
  bio: string | null;
  location_city: string | null;
  job_title: string | null;
  age_min?: number | null;
  age_max?: number | null;
  max_distance?: number | null;
  show_in_discovery?: boolean | null;
  preferences?: {
    religion?: string[];
    race?: string[];
    ethnicity?: string[];
  } | null;
  photos: string[];
  prompts: { question: string; answer: string }[];
  is_paid: boolean;
  created_at: string;
};

/** Convert a Supabase profile row into the existing UserProfile shape used by UI components */
export function toUserProfile(row: SupabaseProfile): UserProfile {
  const birthDate = new Date(row.dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  const photos: Photo[] = (row.photos ?? []).map((url, i) => ({
    id: `photo_${row.id}_${i}`,
    url,
  }));

  const prompts: Prompt[] = (row.prompts ?? []).map((p, i) => ({
    id: `prompt_${row.id}_${i}`,
    question: p.question,
    answer: p.answer,
  }));

  // Calculate profile completion
  let filled = 0;
  const total = 6;
  if (row.display_name) filled++;
  if (row.bio) filled++;
  if (row.location_city) filled++;
  if (row.job_title) filled++;
  if (photos.length > 0) filled++;
  if (prompts.length > 0) filled++;

  return {
    id: row.id,
    name: row.display_name,
    age,
    location: row.location_city ?? '',
    job: row.job_title ?? '',
    height: '',
    photos,
    prompts,
    bio: row.bio ?? '',
    profileCompletion: Math.round((filled / total) * 100),
  };
}

export type MessageType = 'text' | 'voice';

export type MessageReaction = {
  emoji: string;
  userId: string;
};

export type InteractionContext = {
  type: 'photo' | 'prompt' | 'profile';
  contentId?: string;
  contentUrl?: string;
  text?: string;
};

export type Message = {
  id: string;
  senderId: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  replyTo?: { id: string; content: string; type: MessageType };
  reactions: MessageReaction[];
  status: 'sending' | 'sent' | 'delivered' | 'read';
  createdAt: string;
  readAt?: string | null;
  context?: InteractionContext;
};

export type Match = {
  id: string;
  user: UserProfile;
  lastMessage: string;
  unread: boolean;
};

export type Tab = 'discovery' | 'likes' | 'matches' | 'profile';

export type AppSettings = {
  discoveryPaused: boolean;
  hideDistance: boolean;
  readReceipts: boolean;
  typingIndicators: boolean;
  notifications: {
    matches: boolean;
    messages: boolean;
    likes: boolean;
  };
};

export type DiscoveryPreferences = {
  ageRange: [number, number];
  genders: string[];
  maxDistance: number; // 0 means no preference
  race: string[];
  religion: string[];
  ethnicity: string[];
};


