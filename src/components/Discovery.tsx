import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, Infinity, Coffee, MoreHorizontal, Sparkles, Send, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import { DiscoveryPreferences, InteractionContext, UserProfile, SupabaseProfile, toUserProfile } from '../types';
import { calculateAge } from '../utils/helpers';

interface Props {
  onOpenPreferences: () => void;
  preferences: DiscoveryPreferences;
  isPaused: boolean;
  currentUserId: string;
}

export default function Discovery({ onOpenPreferences, preferences, isPaused, currentUserId }: Props) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [interactionContext, setInteractionContext] = useState<InteractionContext | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<UserProfile | null>(null);
  const [interstitialDismissed, setInterstitialDismissed] = useState(false);

  // Fetch real profiles from Supabase
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      // Get IDs the current user has already interacted with
      const { data: interactions } = await supabase
        .from('interactions')
        .select('target_id')
        .eq('actor_id', currentUserId);

      const excludedIds = (interactions ?? []).map((i) => i.target_id as string);
      excludedIds.push(currentUserId);

      let query = supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${excludedIds.join(',')})`)
        .limit(20);

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const userProfiles = (data as SupabaseProfile[]).map(toUserProfile);

      // Apply preference filters
      const filtered = userProfiles.filter((p) => {
        // Filter by age range
        if (p.age < preferences.ageRange[0] || p.age > preferences.ageRange[1]) {
          return false;
        }
        // Filter by gender (if genders array is not empty)
        if (preferences.genders.length > 0) {
          // Match against the raw profile gender field
          const rawMatch = (data as SupabaseProfile[]).find(r => r.id === p.id);
          if (rawMatch && rawMatch.gender && !preferences.genders.some(g => g.toLowerCase() === rawMatch.gender.toLowerCase())) {
            return false;
          }
        }
        return true;
      });

      console.log(`[Discovery] ${userProfiles.length} profiles fetched, ${filtered.length} match preferences`);
      setProfiles(filtered);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profiles.';
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, preferences]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Keyboard shortcuts: ArrowLeft/X to pass, ArrowRight/L to like
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if a modal/input is focused
      if (interactionContext || showMatchCelebration) return;
      if (!currentProfile) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'x') {
        handleInteraction('pass');
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l') {
        handleInteraction('like');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const currentProfile = profiles[currentIndex];

  const handleInteraction = async (type: 'like' | 'pass', context?: InteractionContext) => {
    if (!currentProfile) return;

    if (type === 'like' && context && !interactionContext) {
      // Open comment modal for specific interaction
      setInteractionContext(context);
      return;
    }

    // Animate out
    setDirection(type === 'like' ? 1 : -1);
    setInteractionContext(null);

    // Insert interaction into Supabase
    const interactionData = {
      actor_id: currentUserId,
      target_id: currentProfile.id,
      type,
      comment: type === 'like' ? comment || null : null,
    };

    await supabase.from('interactions').insert(interactionData);

    // Check for mutual like (match)
    if (type === 'like') {
      const { data: mutualLike } = await supabase
        .from('interactions')
        .select()
        .eq('actor_id', currentProfile.id)
        .eq('target_id', currentUserId)
        .eq('type', 'like');

      if (mutualLike && mutualLike.length > 0) {
        // It's a match! Insert into matches table
        const userA = currentUserId < currentProfile.id ? currentUserId : currentProfile.id;
        const userB = currentUserId < currentProfile.id ? currentProfile.id : currentUserId;

        await supabase.from('matches').insert({
          user_a: userA,
          user_b: userB,
        });

        // Show match celebration
        setMatchedProfile(currentProfile);
        setShowMatchCelebration(true);
      }
    }

    setComment('');
    
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setDirection(0);
    }, 400);
  };

  if (isPaused) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#a3a3a3] font-light p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full border border-[#262626] flex items-center justify-center mb-6">
          <Coffee className="w-6 h-6 opacity-50" />
        </div>
        <h2 className="text-2xl font-serif text-[#f5f5f5] mb-4">Discovery is paused.</h2>
        <p className="leading-relaxed mb-6">
          You are currently hidden from new people. You can still message your existing matches.
        </p>
        <button 
          onClick={onOpenPreferences}
          className="bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-3 px-6 hover:bg-[#e5e5e5] transition-colors"
        >
          Change in Settings
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#a3a3a3] font-light p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f5f5f5] mb-4" />
        <p className="text-[#737373] font-light">Finding people near you...</p>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#a3a3a3] font-light p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full border border-[#262626] flex items-center justify-center mb-6">
          <Infinity className="w-6 h-6 opacity-50" />
        </div>
        <h2 className="text-2xl font-serif text-[#f5f5f5] mb-4">Something went wrong.</h2>
        <p className="leading-relaxed mb-6">{fetchError}</p>
        <button 
          onClick={fetchProfiles}
          className="bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-3 px-6 hover:bg-[#e5e5e5] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Interstitial Guidance Card after the first profile
  if (currentIndex === 1 && profiles.length > 1 && !interstitialDismissed) {
    return (
      <div className="h-full w-full relative bg-[#0a0a0a] flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#171717] border border-[#262626] rounded-2xl p-8 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center mx-auto mb-6">
            <Coffee className="w-5 h-5 text-[#f5f5f5]" />
          </div>
          <h2 className="text-2xl font-serif text-[#f5f5f5] mb-4">Quality over quantity.</h2>
          <p className="text-[#a3a3a3] font-light leading-relaxed mb-8">
            You've seen your first profile. Remember, there's no rush. We only show you people who have been active recently. Take your time.
          </p>
          <button 
            onClick={() => setInterstitialDismissed(true)}
            className="w-full bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-3 px-6 hover:bg-[#e5e5e5] transition-colors"
          >
            Got it
          </button>
        </motion.div>
      </div>
    );
  }

  // Honest Empty State
  if (!currentProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#a3a3a3] font-light p-8 text-center max-w-md mx-auto relative">
        <button 
          onClick={onOpenPreferences}
          className="absolute top-6 right-6 p-2 bg-[#171717] border border-[#262626] rounded-full text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
        >
          <MoreHorizontal size={18} />
        </button>
        <div className="w-16 h-16 rounded-full border border-[#262626] flex items-center justify-center mb-6">
          <Infinity className="w-6 h-6 opacity-50" />
        </div>
        <h2 className="text-2xl font-serif text-[#f5f5f5] mb-4">You're all caught up.</h2>
        <p className="leading-relaxed mb-6">
          No profiles match your current preferences right now. Try adjusting your filters or check back later.
        </p>
        <button 
          onClick={onOpenPreferences}
          className="bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-3 px-6 hover:bg-[#e5e5e5] transition-colors mb-4"
        >
          Adjust preferences
        </button>
        <div className="bg-[#171717] border border-[#262626] rounded-xl p-4 text-sm text-[#737373]">
          We don't show you inactive profiles or fake accounts just to keep you swiping. Go enjoy your day.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-[#0a0a0a]">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-end z-20 pointer-events-none">
        <button 
          onClick={onOpenPreferences}
          className="pointer-events-auto p-3 bg-[#0a0a0a]/50 backdrop-blur-md border border-[#262626] rounded-full text-[#f5f5f5] hover:bg-[#171717] transition-colors shadow-lg"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentProfile.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute inset-0 overflow-y-auto pb-32"
        >
          {/* Main Photo */}
          <div className="relative w-full aspect-[4/5] group">
            <img
              src={currentProfile.photos[0]?.url ?? ''}
              alt={currentProfile.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent opacity-90" />
            
            {/* Contextual Like Button */}
            {currentProfile.photos[0] && (
              <button 
                onClick={() => handleInteraction('like', { type: 'photo', contentId: currentProfile.photos[0].id, contentUrl: currentProfile.photos[0].url, text: currentProfile.photos[0].caption })}
                className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-[#171717]/80 backdrop-blur-md border border-[#262626] flex items-center justify-center text-[#f5f5f5] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] transition-all opacity-0 group-hover:opacity-100 shadow-lg z-10"
              >
                <Heart size={20} />
              </button>
            )}

            <div className="absolute bottom-0 left-0 p-6 w-full pointer-events-none">
              <div className="flex items-end justify-between w-full">
                <div>
                  <h1 className="text-4xl font-serif text-[#f5f5f5] mb-1">
                    {currentProfile.name}, {currentProfile.age}
                  </h1>
                  <p className="text-[#a3a3a3] font-light tracking-wide">
                    {currentProfile.job}{currentProfile.job && currentProfile.location ? ' • ' : ''}{currentProfile.location}
                  </p>
                  {currentProfile.photos[0]?.caption && (
                    <p className="text-[#d4d4d4] font-light mt-2 italic">
                      "{currentProfile.photos[0].caption}"
                    </p>
                  )}
                </div>
                {currentProfile.recentlyUpdated && (
                  <div className="flex items-center gap-1.5 bg-[#171717]/80 backdrop-blur-md border border-[#262626] px-3 py-1.5 rounded-full mb-1">
                    <Sparkles size={14} className="text-[#f5f5f5]" />
                    <span className="text-xs font-medium text-[#f5f5f5]">Updated</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-12 max-w-2xl mx-auto">
            {/* Compatibility Signals */}
            {currentProfile.compatibility && currentProfile.compatibility.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentProfile.compatibility.map((signal, idx) => (
                  <div key={idx} className="bg-[#171717] border border-[#262626] rounded-full px-3 py-1 text-xs text-[#a3a3a3] font-medium">
                    {signal}
                  </div>
                ))}
              </div>
            )}

            {/* Activity Signal */}
            {currentProfile.lastActive && (
              <div className="flex items-center justify-center gap-2 text-sm text-[#737373] font-light">
                <div className={`w-2 h-2 rounded-full ${currentProfile.lastActive.includes('now') ? 'bg-emerald-500' : 'bg-[#404040]'}`} />
                {currentProfile.lastActive}
              </div>
            )}

            {/* Bio */}
            {currentProfile.bio && (
              <div className="text-center px-4 relative group">
                <p className="text-lg text-[#d4d4d4] font-light leading-relaxed italic">
                  "{currentProfile.bio}"
                </p>
              </div>
            )}

            {/* Prompt 1 */}
            {currentProfile.prompts[0] && (
              <div className="space-y-3 relative group bg-[#171717] p-6 rounded-2xl border border-[#262626]">
                <p className="text-xs font-medium text-[#737373] uppercase tracking-widest">
                  {currentProfile.prompts[0].question}
                </p>
                <h3 className="text-2xl font-serif text-[#f5f5f5] leading-snug">
                  {currentProfile.prompts[0].answer}
                </h3>
                <button 
                  onClick={() => handleInteraction('like', { type: 'prompt', contentId: currentProfile.prompts[0].id, text: currentProfile.prompts[0].answer })}
                  className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center text-[#f5f5f5] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                >
                  <Heart size={18} />
                </button>
              </div>
            )}

            {/* Photo 2 */}
            {currentProfile.photos[1] && (
              <div className="w-full aspect-square overflow-hidden rounded-2xl relative group">
                <img
                  src={currentProfile.photos[1].url}
                  alt="Profile 2"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {currentProfile.photos[1].caption && (
                  <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[#0a0a0a]/80 to-transparent">
                    <p className="text-[#f5f5f5] font-light italic">"{currentProfile.photos[1].caption}"</p>
                  </div>
                )}
                <button 
                  onClick={() => handleInteraction('like', { type: 'photo', contentId: currentProfile.photos[1].id, contentUrl: currentProfile.photos[1].url, text: currentProfile.photos[1].caption })}
                  className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-[#171717]/80 backdrop-blur-md border border-[#262626] flex items-center justify-center text-[#f5f5f5] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                >
                  <Heart size={18} />
                </button>
              </div>
            )}

            {/* Prompt 2 */}
            {currentProfile.prompts[1] && (
              <div className="space-y-3 relative group bg-[#171717] p-6 rounded-2xl border border-[#262626]">
                <p className="text-xs font-medium text-[#737373] uppercase tracking-widest">
                  {currentProfile.prompts[1].question}
                </p>
                <h3 className="text-2xl font-serif text-[#f5f5f5] leading-snug">
                  {currentProfile.prompts[1].answer}
                </h3>
                <button 
                  onClick={() => handleInteraction('like', { type: 'prompt', contentId: currentProfile.prompts[1].id, text: currentProfile.prompts[1].answer })}
                  className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center text-[#f5f5f5] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                >
                  <Heart size={18} />
                </button>
              </div>
            )}
            
            {/* Photo 3 */}
            {currentProfile.photos[2] && (
              <div className="w-full aspect-square overflow-hidden rounded-2xl relative group">
                <img
                  src={currentProfile.photos[2].url}
                  alt="Profile 3"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {currentProfile.photos[2].caption && (
                  <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[#0a0a0a]/80 to-transparent">
                    <p className="text-[#f5f5f5] font-light italic">"{currentProfile.photos[2].caption}"</p>
                  </div>
                )}
                <button 
                  onClick={() => handleInteraction('like', { type: 'photo', contentId: currentProfile.photos[2].id, contentUrl: currentProfile.photos[2].url, text: currentProfile.photos[2].caption })}
                  className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-[#171717]/80 backdrop-blur-md border border-[#262626] flex items-center justify-center text-[#f5f5f5] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                >
                  <Heart size={18} />
                </button>
              </div>
            )}
            
            <div className="pt-8 pb-12 flex flex-col items-center text-center">
              <p className="text-[#737373] text-sm font-light mb-6">End of {currentProfile.name}'s profile</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Floating Actions (Global Pass/Like) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
        <button
          onClick={() => handleInteraction('pass')}
          className="w-14 h-14 rounded-full bg-[#171717]/80 backdrop-blur-md border border-[#262626] flex items-center justify-center text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#262626] transition-all"
          aria-label="Pass"
        >
          <X size={24} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => handleInteraction('like', { type: 'profile' })}
          className="w-14 h-14 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#0a0a0a] hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,245,245,0.1)]"
          aria-label="Like Profile"
        >
          <Heart size={24} fill="currentColor" strokeWidth={0} />
        </button>
      </div>

      {/* Interaction Modal (Comment) */}
      <AnimatePresence>
        {interactionContext && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-[#171717] border border-[#262626] rounded-t-3xl sm:rounded-3xl p-6 flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[#f5f5f5] font-medium">Send a Like</h3>
                <button onClick={() => setInteractionContext(null)} className="text-[#737373] hover:text-[#f5f5f5]">
                  <X size={20} />
                </button>
              </div>

              {/* Context Preview */}
              <div className="mb-6 p-4 bg-[#0a0a0a] rounded-xl border border-[#262626] flex gap-4 items-center">
                {interactionContext.type === 'photo' && interactionContext.contentUrl && (
                  <img src={interactionContext.contentUrl} alt="Liked content" className="w-16 h-16 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <p className="text-xs text-[#737373] uppercase tracking-wider mb-1">
                    {interactionContext.type === 'photo' ? 'Liked Photo' : interactionContext.type === 'prompt' ? 'Liked Prompt' : 'Liked Profile'}
                  </p>
                  {interactionContext.text && (
                    <p className="text-sm text-[#d4d4d4] font-serif line-clamp-2">"{interactionContext.text}"</p>
                  )}
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded-2xl px-4 py-3">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment... (optional)"
                    className="w-full bg-transparent border-none outline-none text-[#f5f5f5] font-light placeholder:text-[#737373] resize-none h-20"
                    autoFocus
                  />
                </div>
                <button 
                  onClick={() => handleInteraction('like')}
                  className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#0a0a0a] hover:scale-105 transition-transform shrink-0 mb-1"
                >
                  <Send size={20} className="ml-1" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Celebration Modal */}
      <AnimatePresence>
        {showMatchCelebration && matchedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-[#0a0a0a]/95 backdrop-blur-lg flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="max-w-sm w-full text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                className="w-20 h-20 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-8"
              >
                <Heart size={36} className="text-[#0a0a0a]" fill="currentColor" />
              </motion.div>
              
              <h1 className="text-4xl font-serif text-[#f5f5f5] mb-3">It's a match!</h1>
              <p className="text-[#a3a3a3] font-light mb-8">
                You and {matchedProfile.name} liked each other. Start a conversation!
              </p>

              {matchedProfile.photos[0] && (
                <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-8 border-2 border-[#f5f5f5]">
                  <img
                    src={matchedProfile.photos[0].url}
                    alt={matchedProfile.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <button
                onClick={() => {
                  setShowMatchCelebration(false);
                  setMatchedProfile(null);
                }}
                className="w-full bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-4 px-8 hover:bg-[#e5e5e5] transition-colors active:scale-[0.98]"
              >
                Keep Exploring
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}




