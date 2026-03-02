import { useState, useEffect } from 'react';
import { Settings, Shield, LogOut, RefreshCcw, PenLine, Loader2 } from 'lucide-react';
import { DiscoveryPreferences, SupabaseProfile, toUserProfile, UserProfile } from '../types';
import { supabase } from '../supabase';

interface Props {
  onOpenSettings: () => void;
  preferences: DiscoveryPreferences;
  currentUserId: string;
  onLogout: () => void;
}

export default function Profile({ onOpenSettings, preferences, currentUserId, onLogout }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .single();

      if (err) {
        setError(err.message);
      } else if (data) {
        setProfile(toUserProfile(data as SupabaseProfile));
      }

      setLoading(false);
    };

    fetchProfile();
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[#737373]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-[#ef4444] mb-2 text-sm">Failed to load profile</p>
        <p className="text-[#737373] text-xs font-light">{error}</p>
      </div>
    );
  }

  const profileCompletion = profile.profileCompletion ?? 0;

  return (
    <div className="h-full bg-[#0a0a0a] p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-serif text-[#f5f5f5]">Profile</h1>
        <button onClick={onOpenSettings} className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
          <Settings size={22} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="w-28 h-28 rounded-full overflow-hidden mb-4 relative">
          <img
            src={profile.photos[0]?.url ?? 'https://picsum.photos/seed/default/400/400'}
            alt={profile.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <h2 className="text-2xl font-serif text-[#f5f5f5] mb-1">{profile.name}, {profile.age}</h2>
        <p className="text-[#737373] font-light">{profile.location || 'No location set'}</p>
      </div>

      <div className="space-y-8">
        {/* Profile Completion Signal */}
        <section>
          <div className="bg-[#171717] border border-[#262626] rounded-2xl p-5">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h3 className="text-[#f5f5f5] font-medium mb-1">Profile {profileCompletion}% complete</h3>
                <p className="text-xs text-[#a3a3a3] font-light">Complete profiles get 3x more matches.</p>
              </div>
              <span className="text-2xl font-serif text-[#737373]">{profileCompletion}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#262626] rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-[#f5f5f5] rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            <button className="w-full py-2.5 bg-[#262626] hover:bg-[#404040] text-[#f5f5f5] text-sm font-medium rounded-xl transition-colors">
              Add a prompt
            </button>
          </div>
        </section>

        {/* Weekly Prompt Reminder */}
        <section>
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:border-[#404040] transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <PenLine size={64} />
            </div>
            <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-2">Weekly Prompt</h3>
            <p className="text-lg font-serif text-[#f5f5f5] mb-4 relative z-10">"A boundary I've recently set is..."</p>
            <button className="text-sm font-medium text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors relative z-10">
              Answer this prompt →
            </button>
          </div>
        </section>

        {/* Bio */}
        {profile.bio && (
          <section>
            <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-4">About</h3>
            <p className="text-[#d4d4d4] font-light leading-relaxed">{profile.bio}</p>
          </section>
        )}

        {/* Prompts */}
        {profile.prompts.length > 0 && (
          <section>
            <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-4">Prompts</h3>
            <div className="space-y-3">
              {profile.prompts.map((p) => (
                <div key={p.id} className="bg-[#171717] border border-[#262626] rounded-xl p-4">
                  <p className="text-xs text-[#737373] font-medium mb-2">{p.question}</p>
                  <p className="text-[#f5f5f5] font-light">{p.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-4">Account</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[#d4d4d4] font-light">Membership</span>
              <span className="text-[#f5f5f5] text-sm font-medium">Lifetime</span>
            </div>
            {profile.job && (
              <div className="flex justify-between items-center">
                <span className="text-[#d4d4d4] font-light">Job</span>
                <span className="text-[#737373] text-sm font-light">{profile.job}</span>
              </div>
            )}
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-4">Preferences</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[#d4d4d4] font-light">Looking for</span>
              <span className="text-[#a3a3a3] text-sm font-light">{preferences.genders.length > 0 ? preferences.genders.join(', ') : 'Everyone'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#d4d4d4] font-light">Age range</span>
              <span className="text-[#a3a3a3] text-sm font-light">{preferences.ageRange[0]} - {preferences.ageRange[1]}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#d4d4d4] font-light">Distance</span>
              <span className="text-[#a3a3a3] text-sm font-light">{preferences.maxDistance === 0 ? 'Anywhere' : `Up to ${preferences.maxDistance} miles`}</span>
            </div>
          </div>
        </section>

        <section className="pt-4 border-t border-[#171717] space-y-2">
          <button className="flex items-center gap-3 text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors py-2 w-full text-left">
            <Shield size={18} strokeWidth={1.5} />
            <span className="font-light">Safety & Privacy</span>
          </button>
          
          {/* Refund Resistance via Radical Transparency */}
          <button className="flex items-center gap-3 text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors py-2 w-full text-left">
            <RefreshCcw size={18} strokeWidth={1.5} />
            <div className="flex flex-col">
              <span className="font-light">Request a Refund</span>
              <span className="text-xs text-[#737373] font-light">Within 14 days? Automatic refund, no questions asked.</span>
            </div>
          </button>

          <button onClick={onLogout} className="flex items-center gap-3 text-[#ef4444] hover:text-[#f87171] transition-colors py-2 w-full text-left mt-2">
            <LogOut size={18} strokeWidth={1.5} />
            <span className="font-light">Log out</span>
          </button>
        </section>
      </div>
    </div>
  );
}



