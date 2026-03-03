import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Match, SupabaseProfile, toUserProfile } from '../types';
import { MessageCircleHeart, Loader2, RefreshCw } from 'lucide-react';
import { timeAgo } from '../utils/helpers';

interface Props {
  onSelectMatch: (match: Match) => void;
  currentUserId: string;
}

interface MatchRow {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
}

interface MatchWithMeta extends Match {
  matchedAt: string;
  lastMessageAt: string | null;
  isNew: boolean;
}

export default function Matches({ onSelectMatch, currentUserId }: Props) {
  const [matches, setMatches] = useState<MatchWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: matchRows, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`);

      if (matchError) throw new Error(matchError.message);
      if (!matchRows || matchRows.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      const typedRows = matchRows as MatchRow[];
      const otherUserIds = typedRows.map((m) =>
        m.user_a === currentUserId ? m.user_b : m.user_a
      );

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', otherUserIds);

      if (profileError) throw new Error(profileError.message);

      const profileMap = new Map(
        (profiles as SupabaseProfile[]).map((p) => [p.id, toUserProfile(p)])
      );

      const now = Date.now();
      const matchList: MatchWithMeta[] = [];
      for (const row of typedRows) {
        const otherId = row.user_a === currentUserId ? row.user_b : row.user_a;
        const profile = profileMap.get(otherId);
        if (!profile) continue;

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('body, sender_id, created_at')
          .eq('match_id', row.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMsgTime = lastMsg && lastMsg.length > 0 ? lastMsg[0].created_at as string : null;
        const matchAge = now - new Date(row.created_at).getTime();
        const isNew = matchAge < 86400000; // less than 24 hours

        matchList.push({
          id: row.id,
          user: profile,
          lastMessage: lastMsg && lastMsg.length > 0 ? (lastMsg[0].body as string) : 'Say hello! 👋',
          unread: false,
          matchedAt: row.created_at,
          lastMessageAt: lastMsgTime,
          isNew,
        });
      }

      // Sort by most recent message first, then by match date
      matchList.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.matchedAt).getTime();
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.matchedAt).getTime();
        return bTime - aTime;
      });

      console.log(`[Matches] Loaded ${matchList.length} matches`);
      setMatches(matchList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load matches.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="h-full bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f5f5f5]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-[#0a0a0a] p-6 flex flex-col items-center justify-center text-center">
        <p className="text-[#ef4444] font-light mb-4">{error}</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="h-full bg-[#0a0a0a] p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full border border-[#262626] flex items-center justify-center mb-6">
          <MessageCircleHeart className="w-6 h-6 text-[#737373]" />
        </div>
        <h2 className="text-2xl font-serif text-[#f5f5f5] mb-4">It's quiet right now.</h2>
        <p className="text-[#a3a3a3] font-light leading-relaxed max-w-sm">
          That's completely normal. We'll let you know the moment someone connects with you.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0a0a0a] p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-serif text-[#f5f5f5]">Connections</h1>
        <button onClick={fetchMatches} className="p-2 text-[#737373] hover:text-[#f5f5f5] transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-6">
        {matches.map((match) => (
          <button
            key={match.id}
            onClick={() => onSelectMatch(match)}
            className="w-full flex items-center gap-5 group text-left"
          >
            <div className="relative w-14 h-14 shrink-0">
              <img
                src={match.user.photos[0]?.url ?? ''}
                alt={match.user.name}
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
              {match.isNew && (
                <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-[#f5f5f5] rounded-full">
                  <span className="text-[9px] font-semibold text-[#0a0a0a]">NEW</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 border-b border-[#171717] pb-4 group-hover:border-[#262626] transition-colors">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="text-base font-medium truncate text-[#d4d4d4]">
                  {match.user.name}
                </h3>
                <span className="text-xs text-[#737373] font-light shrink-0 ml-2">
                  {timeAgo(match.lastMessageAt ?? match.matchedAt)}
                </span>
              </div>
              <p className="text-sm truncate font-light text-[#737373]">
                {match.lastMessage}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}



