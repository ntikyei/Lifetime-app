/*
  IMPORTANT: Run this SQL in Supabase before using preferences:
  
  alter table profiles add column if not exists preferences jsonb default '{}';
  
  alter table profiles add column if not exists age_min int default 18;
  alter table profiles add column if not exists age_max int default 99;
  alter table profiles add column if not exists pref_genders text[] default '{}';
  alter table profiles add column if not exists max_distance int default 50;
*/

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Check, Loader2 } from 'lucide-react';
import { DiscoveryPreferences } from '../types';
import { supabase } from '../supabase';

interface Props {
  onClose: () => void;
  preferences: DiscoveryPreferences;
  onUpdate: (prefs: DiscoveryPreferences) => void;
  currentUserId: string;
}

export default function PreferencesView({ onClose, preferences, onUpdate, currentUserId }: Props) {
  const [localPrefs, setLocalPrefs] = useState<DiscoveryPreferences>(preferences);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved preferences from Supabase on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', currentUserId)
        .single();

      if (data?.preferences && typeof data.preferences === 'object') {
        const saved = data.preferences as Record<string, unknown>;
        const loaded: DiscoveryPreferences = {
          ageRange: Array.isArray(saved.ageRange) ? saved.ageRange as [number, number] : preferences.ageRange,
          genders: Array.isArray(saved.genders) ? saved.genders as string[] : preferences.genders,
          maxDistance: typeof saved.maxDistance === 'number' ? saved.maxDistance : preferences.maxDistance,
          race: Array.isArray(saved.race) ? saved.race as string[] : [],
          religion: Array.isArray(saved.religion) ? saved.religion as string[] : [],
          ethnicity: Array.isArray(saved.ethnicity) ? saved.ethnicity as string[] : [],
        };
        setLocalPrefs(loaded);
        onUpdate(loaded);
        console.log('[Preferences] Loaded from Supabase:', loaded);
      }
    };
    loadPreferences();
  }, [currentUserId]);

  const saveToSupabase = async (prefs: DiscoveryPreferences) => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ preferences: prefs })
      .eq('id', currentUserId);

    if (error) {
      console.error('[Preferences] Save failed:', error);
    } else {
      console.log('[Preferences] Saved to Supabase');
      setShowSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleSave = () => {
    onUpdate(localPrefs);
    saveToSupabase(localPrefs);
    onClose();
  };

  const updateAndSave = (updated: DiscoveryPreferences) => {
    setLocalPrefs(updated);
    onUpdate(updated);
    saveToSupabase(updated);
  };

  const toggleArrayItem = (key: keyof DiscoveryPreferences, item: string) => {
    const arr = localPrefs[key] as string[];
    const newArr = arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
    const updated = { ...localPrefs, [key]: newArr };
    setLocalPrefs(updated);
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
              <Check size={12} /> Saved
            </span>
          )}
          {saving && <Loader2 size={14} className="animate-spin text-[#737373]" />}
        </div>
        <button onClick={handleSave} className="text-[#f5f5f5] font-medium text-sm px-2">
          Done
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10 pb-32">
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
                  const updated = { ...localPrefs, ageRange: [parseInt(e.target.value), localPrefs.ageRange[1]] as [number, number] };
                  setLocalPrefs(updated);
                }}
                onMouseUp={() => updateAndSave(localPrefs)}
                onTouchEnd={() => updateAndSave(localPrefs)}
                className="flex-1 accent-[#f5f5f5] h-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#737373] w-8">Max</span>
              <input
                type="range"
                min={localPrefs.ageRange[0] + 1}
                max={80}
                value={localPrefs.ageRange[1]}
                onChange={(e) => {
                  const updated = { ...localPrefs, ageRange: [localPrefs.ageRange[0], parseInt(e.target.value)] as [number, number] };
                  setLocalPrefs(updated);
                }}
                onMouseUp={() => updateAndSave(localPrefs)}
                onTouchEnd={() => updateAndSave(localPrefs)}
                className="flex-1 accent-[#f5f5f5] h-1"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-medium text-[#f5f5f5]">Gender</h3>
          <div className="flex flex-wrap gap-2">
            {['Women', 'Men', 'Non-binary', 'Everyone'].map(gender => {
              const isSelected = localPrefs.genders.includes(gender) || (gender === 'Everyone' && localPrefs.genders.length === 0);
              return (
                <button
                  key={gender}
                  onClick={() => {
                    if (gender === 'Everyone') {
                      const updated = { ...localPrefs, genders: [] };
                      updateAndSave(updated);
                    } else {
                      const arr = localPrefs.genders;
                      const newArr = arr.includes(gender) ? arr.filter(i => i !== gender) : [...arr, gender];
                      const updated = { ...localPrefs, genders: newArr };
                      updateAndSave(updated);
                    }
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
            <span className="text-[#a3a3a3] text-sm font-light">{localPrefs.maxDistance === 0 ? 'Anywhere' : `Up to ${localPrefs.maxDistance} miles`}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={localPrefs.maxDistance}
            onChange={(e) => setLocalPrefs({ ...localPrefs, maxDistance: parseInt(e.target.value) })}
            onMouseUp={() => updateAndSave(localPrefs)}
            onTouchEnd={() => updateAndSave(localPrefs)}
            className="w-full accent-[#f5f5f5] h-1"
          />
          <div className="flex justify-between text-[10px] text-[#737373]">
            <span>Anywhere</span>
            <span>100 miles</span>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-sm font-medium text-[#f5f5f5]">Race & Ethnicity <span className="text-[#737373] font-light text-xs ml-2">(Optional)</span></h3>
          </div>
          <button className="w-full flex items-center justify-between p-4 rounded-xl border border-[#262626] bg-[#171717] hover:bg-[#262626] transition-colors text-left">
            <span className="text-[#d4d4d4] font-light">Open to everyone</span>
            <ChevronLeft size={18} className="text-[#737373] rotate-180" />
          </button>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-sm font-medium text-[#f5f5f5]">Religion <span className="text-[#737373] font-light text-xs ml-2">(Optional)</span></h3>
          </div>
          <button className="w-full flex items-center justify-between p-4 rounded-xl border border-[#262626] bg-[#171717] hover:bg-[#262626] transition-colors text-left">
            <span className="text-[#d4d4d4] font-light">Open to everyone</span>
            <ChevronLeft size={18} className="text-[#737373] rotate-180" />
          </button>
        </section>
        
        <div className="pt-8 flex justify-center">
          <button 
            onClick={() => {
              const reset: DiscoveryPreferences = { ageRange: [18, 80], genders: [], maxDistance: 0, race: [], religion: [], ethnicity: [] };
              updateAndSave(reset);
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
