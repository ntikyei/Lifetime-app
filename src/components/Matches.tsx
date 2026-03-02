import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Match, SupabaseProfile, toUserProfile } from '../types';
import { MessageCircleHeart, Loader2 } from 'lucide-react';

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

export default function Matches({ onSelectMatch, currentUserId }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch matches where current user is user_a or user_b
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

        // Get the other person's IDs
        const typedRows = matchRows as MatchRow[];
        const otherUserIds = typedRows.map((m) =>
          m.user_a === currentUserId ? m.user_b : m.user_a
        );

        // Fetch their profiles
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', otherUserIds);

        if (profileError) throw new Error(profileError.message);

        const profileMap = new Map(
          (profiles as SupabaseProfile[]).map((p) => [p.id, toUserProfile(p)])
        );

        // Fetch the last message for each match
        const matchList: Match[] = [];
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

          matchList.push({
            id: row.id,
            user: profile,
            lastMessage: lastMsg && lastMsg.length > 0 ? (lastMsg[0].body as string) : 'Start chatting!',
            unread: false, // Could be enhanced with read receipts
          });
        }

        setMatches(matchList);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load matches.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

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
      <h1 className="text-3xl font-serif text-[#f5f5f5] mb-8">Connections</h1>
      
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
              {match.unread && (
                <div className="absolute top-0 right-0 w-3 h-3 bg-[#f5f5f5] border-2 border-[#0a0a0a] rounded-full" />
              )}
            </div>
            
            <div className="flex-1 min-w-0 border-b border-[#171717] pb-4 group-hover:border-[#262626] transition-colors">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className={`text-base font-medium truncate ${match.unread ? 'text-[#f5f5f5]' : 'text-[#d4d4d4]'}`}>
                  {match.user.name}
                </h3>
              </div>
              <p className={`text-sm truncate font-light ${match.unread ? 'text-[#e5e5e5]' : 'text-[#737373]'}`}>
                {match.lastMessage}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}



