import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, MessageCircle, Loader2 } from 'lucide-react';
import { Match, SupabaseProfile, toUserProfile, UserProfile } from '../types';
import { supabase } from '../supabase';
import { timeAgo } from '../utils/helpers';

interface Props {
  onMatch: (match: Match) => void;
  currentUserId: string;
}

interface IncomingLike {
  id: string;          // interaction id
  user: UserProfile;
  userId: string;      // Supabase user id of the person who liked
  createdAt: string;
}

export default function Likes({ onMatch, currentUserId }: Props) {
  const [likes, setLikes] = useState<IncomingLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLikes = async () => {
      setLoading(true);
      setError(null);

      // Get interactions where someone liked the current user
      const { data: interactions, error: intErr } = await supabase
        .from('interactions')
        .select('id, actor_id, created_at')
        .eq('target_id', currentUserId)
        .eq('type', 'like')
        .order('created_at', { ascending: false });

      if (intErr) {
        setError(intErr.message);
        setLoading(false);
        return;
      }

      if (!interactions || interactions.length === 0) {
        setLoading(false);
        return;
      }

      // Filter out people the current user has already interacted with (liked back / passed)
      const actorIds = interactions.map((i: { actor_id: string }) => i.actor_id);
      const { data: myInteractions } = await supabase
        .from('interactions')
        .select('target_id')
        .eq('actor_id', currentUserId)
        .in('target_id', actorIds);

      const alreadyActedOn = new Set((myInteractions ?? []).map((r: { target_id: string }) => r.target_id));

      const pendingInteractions = interactions.filter(
        (i: { actor_id: string }) => !alreadyActedOn.has(i.actor_id)
      );

      if (pendingInteractions.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch profiles for those users
      const pendingActorIds = pendingInteractions.map((i: { actor_id: string }) => i.actor_id);
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .in('id', pendingActorIds);

      if (profErr) {
        setError(profErr.message);
        setLoading(false);
        return;
      }

      const profileMap = new Map<string, UserProfile>();
      for (const p of (profiles ?? []) as SupabaseProfile[]) {
        profileMap.set(p.id, toUserProfile(p));
      }

      const result: IncomingLike[] = pendingInteractions
        .filter((i: { actor_id: string }) => profileMap.has(i.actor_id))
        .map((i: { id: string; actor_id: string; created_at: string }) => ({
          id: i.id,
          userId: i.actor_id,
          user: profileMap.get(i.actor_id)!,
          createdAt: i.created_at,
        }));

      setLikes(result);
      setLoading(false);
    };

    fetchLikes();
  }, [currentUserId]);

  const handleAction = async (like: IncomingLike, action: 'match' | 'pass') => {
    setLikes((prev) => prev.filter((l) => l.id !== like.id));

    // Record current user's interaction
    await supabase.from('interactions').insert({
      actor_id: currentUserId,
      target_id: like.userId,
      type: action === 'match' ? 'like' : 'pass',
    });

    if (action === 'match') {
      // Create the match row (user_a < user_b for consistency)
      const [user_a, user_b] =
        currentUserId < like.userId
          ? [currentUserId, like.userId]
          : [like.userId, currentUserId];

      const { data: matchRow } = await supabase
        .from('matches')
        .insert({ user_a, user_b })
        .select()
        .single();

      onMatch({
        id: matchRow?.id ?? `match_${Date.now()}`,
        user: like.user,
        lastMessage: 'Matched just now',
        unread: false,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[#737373]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-[#ef4444] mb-2 text-sm">Something went wrong</p>
        <p className="text-[#737373] text-xs font-light">{error}</p>
      </div>
    );
  }

  if (likes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-full border border-[#262626] flex items-center justify-center mb-6">
          <Heart className="w-6 h-6 opacity-50" />
        </div>
        <h2 className="text-2xl font-serif text-[#f5f5f5] mb-4">No new likes</h2>
        <p className="text-[#a3a3a3] font-light leading-relaxed">
          When someone likes your profile, they'll appear here. Quality connections take time.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0a0a0a] p-6 overflow-y-auto">
      <h1 className="text-3xl font-serif text-[#f5f5f5] mb-8">Likes You</h1>
      
      <div className="space-y-6">
        <AnimatePresence>
          {likes.map((like) => (
            <motion.div
              key={like.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#171717] border border-[#262626] rounded-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-[#262626] flex items-center gap-4">
                <img 
                  src={like.user.photos[0]?.url ?? ''} 
                  alt={like.user.name} 
                  className="w-12 h-12 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1">
                  <h3 className="text-[#f5f5f5] font-medium">{like.user.name}, {like.user.age}</h3>
                  <p className="text-xs text-[#737373] font-light">{timeAgo(like.createdAt)}</p>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-4">
                  <p className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-2">
                    Liked your profile
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-6">
                  <button 
                    onClick={() => handleAction(like, 'pass')}
                    className="flex-1 py-3 rounded-xl border border-[#262626] text-[#a3a3a3] hover:bg-[#262626] hover:text-[#f5f5f5] transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <X size={16} /> Pass
                  </button>
                  <button 
                    onClick={() => handleAction(like, 'match')}
                    className="flex-1 py-3 rounded-xl bg-[#f5f5f5] text-[#0a0a0a] hover:bg-[#e5e5e5] transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} /> Match
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
