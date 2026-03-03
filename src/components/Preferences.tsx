/*
  Run this SQL in Supabase SQL Editor:

  alter table profiles add column if not exists religion text;
  alter table profiles add column if not exists race text;
  alter table profiles add column if not exists ethnicity text;
  alter table profiles add column if not exists sexuality text;
  alter table profiles add column if not exists interested_in text[] default '{}';
  alter table profiles add column if not exists preferences jsonb default '{}';
  alter table profiles add column if not exists age_min int default 18;
  alter table profiles add column if not exists age_max int default 65;
  alter table profiles add column if not exists max_distance int default 50;
  alter table profiles add column if not exists show_in_discovery boolean default true;
*/

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Check, Loader2, AlertCircle } from 'lucide-react';
import { DiscoveryPreferences, SupabaseProfile } from '../types';
import { supabase } from '../supabase';

interface Props {
  onClose: () => void;
  preferences: DiscoveryPreferences;
  onUpdate: (prefs: DiscoveryPreferences) => void;
  currentUserId: string;
}

export default function PreferencesView({ onClose, preferences, onUpdate, currentUserId }: Props) {
  const [localPrefs, setLocalPrefs] = useState<DiscoveryPreferences>(preferences);
  const [showInDiscovery, setShowInDiscovery] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const RELIGION_OPTIONS = ['No religion', 'Christian', 'Muslim', 'Jewish', 'Hindu', 'Buddhist', 'Sikh', 'Spiritual', 'Other', 'Prefer not to say'];
  const RACE_OPTIONS = ['Black', 'White', 'Asian', 'Hispanic/Latino', 'Middle Eastern', 'Mixed', 'Other', 'Prefer not to say'];
  const INTERESTED_IN_OPTIONS = ['Men', 'Women', 'Everyone', 'Non-binary'];

  const genderMatches = (profileGender: string, interestedIn: string[]): boolean => {
    if (!interestedIn || interestedIn.length === 0) return true;
    if (interestedIn.includes('Everyone')) return true;

    const g = profileGender?.toLowerCase() ?? '';

    return interestedIn.some(pref => {
      if (pref === 'Men') return g === 'man' || g === 'male' || g === 'men';
      if (pref === 'Women') return g === 'woman' || g === 'female' || g === 'women';
      if (pref === 'Non-binary') return g === 'non-binary' || g === 'nonbinary';
      return g === pref.toLowerCase();
    });
  };

  // Load saved preferences from Supabase on mount
  useEffect(() => {
    const loadPreferences = async () => {
      console.log('[Preferences] Loading profile preferences for user:', currentUserId);
      const { data, error: loadError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .single();

      if (loadError) {
        console.error('[Preferences] Load failed:', loadError);
        setError('Could not load your preferences. Please try again.');
        return;
      }

      const row = data as SupabaseProfile | null;
      if (!row) return;

      const savedJson = row.preferences ?? {};

      const loaded: DiscoveryPreferences = {
        ageRange: [
          typeof row.age_min === 'number' ? row.age_min : preferences.ageRange[0],
          typeof row.age_max === 'number' ? row.age_max : preferences.ageRange[1],
        ],
        genders: Array.isArray(row.interested_in) ? row.interested_in : preferences.genders,
        maxDistance: typeof row.max_distance === 'number' ? row.max_distance : preferences.maxDistance,
        race: Array.isArray(savedJson.race) ? savedJson.race : [],
        religion: Array.isArray(savedJson.religion) ? savedJson.religion : [],
        ethnicity: Array.isArray(savedJson.ethnicity) ? savedJson.ethnicity : [],
      };

      setLocalPrefs(loaded);
      setShowInDiscovery(row.show_in_discovery !== false);
      onUpdate(loaded);
      console.log('[Preferences] Loaded from Supabase:', loaded);

      console.log('[Preferences] genderMatches sanity check Men->man:', genderMatches('man', ['Men']));
    };
    loadPreferences();
  }, [currentUserId, onUpdate, preferences]);

  const showSavedToast = () => {
    setShowSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000);
  };

  const saveProfileUpdate = async (payload: Partial<SupabaseProfile>) => {
    console.log('[Preferences] Saving payload:', payload);
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', currentUserId);

    if (error) {
      console.error('[Preferences] Save failed:', error);
      setError('Could not save changes. Please try again.');
    } else {
      console.log('[Preferences] Saved to Supabase');
      showSavedToast();
    }

    setSaving(false);
  };

  const handleSave = () => {
    console.log('[Preferences] Done pressed');
    onClose();
  };

  const updateLocalAndApp = (updated: DiscoveryPreferences) => {
    setLocalPrefs(updated);
    onUpdate(updated);
  };

  const updateInterestedIn = async (values: string[]) => {
    const updated = { ...localPrefs, genders: values };
    updateLocalAndApp(updated);
    await saveProfileUpdate({ interested_in: values });
  };

  const updateAgeRange = async (range: [number, number]) => {
    const updated = { ...localPrefs, ageRange: range };
    updateLocalAndApp(updated);
    await saveProfileUpdate({ age_min: range[0], age_max: range[1] });
  };

  const updateDistance = async (value: number) => {
    const updated = { ...localPrefs, maxDistance: value };
    updateLocalAndApp(updated);
    await saveProfileUpdate({ max_distance: value });
  };

  const updatePreferenceJson = async (key: 'religion' | 'race', values: string[]) => {
    const updated = { ...localPrefs, [key]: values };
    updateLocalAndApp(updated);
    await saveProfileUpdate({
      preferences: {
        religion: key === 'religion' ? values : localPrefs.religion,
        race: key === 'race' ? values : localPrefs.race,
        ethnicity: localPrefs.ethnicity,
      },
    });
  };

  const toggleShowInDiscovery = async () => {
    const value = !showInDiscovery;
    setShowInDiscovery(value);
    await saveProfileUpdate({ show_in_discovery: value });
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#0a0a0a] flex flex-col font-sans">
      <div className="flex items-center justify-between p-4 border-b border-[#171717] bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="p-2 -ml-2 text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
          <ChevronLeft size={24} strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-[#f5f5f5] font-medium">Who you'll see</h2>
          {showSaved && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <Check size={12} /> Saved ✓
            </span>
          )}
          {saving && <Loader2 size={14} className="animate-spin text-[#737373]" />}
        </div>
        <button onClick={handleSave} className="text-[#f5f5f5] font-medium text-sm px-2">
          Done
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10 pb-32">
        {error && (
          <div className="bg-[#171717] border border-[#ef4444]/30 rounded-xl p-4 text-sm text-[#ef4444] flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-3xl font-serif text-[#f5f5f5]">Preferences</h1>
          <p className="text-[#a3a3a3] font-light leading-relaxed">
            Every preference is optional. We respect your choices and will only show you people who match what you're looking for.
          </p>
        </div>

        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-sm font-medium text-[#f5f5f5]">Age Range</h3>
            <span className="text-[#a3a3a3] text-sm font-light">{localPrefs.ageRange[0]} - {localPrefs.ageRange[1]}</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#737373] w-8">Min</span>
              <input
                type="range"
                min={18}
                max={localPrefs.ageRange[1] - 1}
                value={localPrefs.ageRange[0]}
                onChange={(e) => {
                  const updated = { ...localPrefs, ageRange: [parseInt(e.target.value, 10), localPrefs.ageRange[1]] as [number, number] };
                  setLocalPrefs(updated);
                }}
                onMouseUp={() => updateAgeRange(localPrefs.ageRange)}
                onTouchEnd={() => updateAgeRange(localPrefs.ageRange)}
                className="flex-1 accent-[#f5f5f5] h-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#737373] w-8">Max</span>
              <input
                type="range"
                min={localPrefs.ageRange[0] + 1}
                max={65}
                value={localPrefs.ageRange[1]}
                onChange={(e) => {
                  const updated = { ...localPrefs, ageRange: [localPrefs.ageRange[0], parseInt(e.target.value, 10)] as [number, number] };
                  setLocalPrefs(updated);
                }}
                onMouseUp={() => updateAgeRange(localPrefs.ageRange)}
                onTouchEnd={() => updateAgeRange(localPrefs.ageRange)}
                className="flex-1 accent-[#f5f5f5] h-1"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-medium text-[#f5f5f5]">Interested in</h3>
          <div className="flex flex-wrap gap-2">
            {INTERESTED_IN_OPTIONS.map((gender) => {
              const isSelected = localPrefs.genders.includes(gender);
              return (
                <button
                  key={gender}
                  onClick={async () => {
                    console.log('[Preferences] interested_in toggle:', gender);
                    let newValues: string[];
                    if (gender === 'Everyone') {
                      newValues = localPrefs.genders.includes('Everyone') ? [] : ['Everyone'];
                    } else {
                      const withoutEveryone = localPrefs.genders.filter((value) => value !== 'Everyone');
                      newValues = withoutEveryone.includes(gender)
                        ? withoutEveryone.filter((value) => value !== gender)
                        : [...withoutEveryone, gender];
                    }
                    await updateInterestedIn(newValues);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                    isSelected 
                      ? 'bg-[#f5f5f5] text-[#0a0a0a] border-[#f5f5f5]' 
                      : 'bg-[#171717] text-[#a3a3a3] border-[#262626] hover:border-[#404040]'
                  }`}
                >
                  {gender}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-sm font-medium text-[#f5f5f5]">Maximum Distance</h3>
            <span className="text-[#a3a3a3] text-sm font-light">Up to {localPrefs.maxDistance} km</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={localPrefs.maxDistance}
            onChange={(e) => setLocalPrefs({ ...localPrefs, maxDistance: parseInt(e.target.value, 10) })}
            onMouseUp={() => updateDistance(localPrefs.maxDistance)}
            onTouchEnd={() => updateDistance(localPrefs.maxDistance)}
            className="w-full accent-[#f5f5f5] h-1"
          />
          <div className="flex justify-between text-[10px] text-[#737373]">
            <span>1 km</span>
            <span>100 km</span>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-medium text-[#f5f5f5]">Religion filter <span className="text-[#737373] font-light text-xs ml-2">(Optional)</span></h3>
          <p className="text-xs text-[#737373]">Show me people who are...</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updatePreferenceJson('religion', [])}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${localPrefs.religion.length === 0 ? 'bg-[#f5f5f5] text-[#0a0a0a] border-[#f5f5f5]' : 'bg-[#171717] text-[#a3a3a3] border-[#262626]'}`}
            >
              Anyone
            </button>
            {RELIGION_OPTIONS.map((option) => {
              const selected = localPrefs.religion.includes(option);
              return (
                <button
                  key={option}
                  onClick={() => updatePreferenceJson('religion', selected ? [] : [option])}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${selected ? 'bg-[#f5f5f5] text-[#0a0a0a] border-[#f5f5f5]' : 'bg-[#171717] text-[#a3a3a3] border-[#262626]'}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-medium text-[#f5f5f5]">Race filter <span className="text-[#737373] font-light text-xs ml-2">(Optional)</span></h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updatePreferenceJson('race', [])}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${localPrefs.race.length === 0 ? 'bg-[#f5f5f5] text-[#0a0a0a] border-[#f5f5f5]' : 'bg-[#171717] text-[#a3a3a3] border-[#262626]'}`}
            >
              Anyone
            </button>
            {RACE_OPTIONS.map((option) => {
              const selected = localPrefs.race.includes(option);
              return (
                <button
                  key={option}
                  onClick={() => updatePreferenceJson('race', selected ? [] : [option])}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${selected ? 'bg-[#f5f5f5] text-[#0a0a0a] border-[#f5f5f5]' : 'bg-[#171717] text-[#a3a3a3] border-[#262626]'}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-[#262626] bg-[#171717]">
            <div>
              <h3 className="text-sm font-medium text-[#f5f5f5]">Show my profile to others</h3>
              <p className="text-xs text-[#737373] font-light mt-1">Turn this off to hide from discovery.</p>
            </div>
            <button
              onClick={toggleShowInDiscovery}
              className={`w-12 h-6 rounded-full transition-colors relative ${showInDiscovery ? 'bg-[#f5f5f5]' : 'bg-[#262626]'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-[#0a0a0a] transition-transform ${showInDiscovery ? 'left-7' : 'left-1 bg-[#737373]'}`} />
            </button>
          </div>
        </section>
        
        <div className="pt-8 flex justify-center">
          <button 
            onClick={async () => {
              const reset: DiscoveryPreferences = { ageRange: [18, 65], genders: ['Everyone'], maxDistance: 50, race: [], religion: [], ethnicity: [] };
              updateLocalAndApp(reset);
              await saveProfileUpdate({
                interested_in: ['Everyone'],
                age_min: 18,
                age_max: 65,
                max_distance: 50,
                preferences: { religion: [], race: [], ethnicity: [] },
              });
            }}
            className="text-[#737373] hover:text-[#f5f5f5] text-sm font-light transition-colors"
          >
            Reset all preferences
          </button>
        </div>
      </div>
    </div>
  );
}
