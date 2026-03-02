import { useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { DiscoveryPreferences } from '../types';

interface Props {
  onClose: () => void;
  preferences: DiscoveryPreferences;
  onUpdate: (prefs: DiscoveryPreferences) => void;
}

export default function PreferencesView({ onClose, preferences, onUpdate }: Props) {
  const [localPrefs, setLocalPrefs] = useState<DiscoveryPreferences>(preferences);

  const handleSave = () => {
    onUpdate(localPrefs);
    onClose();
  };

  const toggleArrayItem = (key: keyof DiscoveryPreferences, item: string) => {
    const arr = localPrefs[key] as string[];
    const newArr = arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
    setLocalPrefs({ ...localPrefs, [key]: newArr });
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#0a0a0a] flex flex-col font-sans">
      <div className="flex items-center justify-between p-4 border-b border-[#171717] bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="p-2 -ml-2 text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
          <ChevronLeft size={24} strokeWidth={1.5} />
        </button>
        <h2 className="text-[#f5f5f5] font-medium">Who you'll see</h2>
        <button onClick={handleSave} className="text-[#f5f5f5] font-medium text-sm px-2">
          Save
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
          <div className="h-1 bg-[#262626] rounded-full relative">
            <div className="absolute h-full bg-[#f5f5f5] rounded-full" style={{ left: '20%', right: '40%' }} />
            <div className="absolute w-5 h-5 bg-[#f5f5f5] rounded-full -top-2 shadow-lg" style={{ left: '20%' }} />
            <div className="absolute w-5 h-5 bg-[#f5f5f5] rounded-full -top-2 shadow-lg" style={{ right: '40%' }} />
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
                    if (gender === 'Everyone') setLocalPrefs({ ...localPrefs, genders: [] });
                    else toggleArrayItem('genders', gender);
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
          <div className="h-1 bg-[#262626] rounded-full relative">
            <div className="absolute h-full bg-[#f5f5f5] rounded-full" style={{ left: '0%', right: '60%' }} />
            <div className="absolute w-5 h-5 bg-[#f5f5f5] rounded-full -top-2 shadow-lg" style={{ right: '60%' }} />
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
            onClick={() => setLocalPrefs({ ageRange: [24, 32], genders: [], maxDistance: 0, race: [], religion: [], ethnicity: [] })}
            className="text-[#737373] hover:text-[#f5f5f5] text-sm font-light transition-colors"
          >
            Reset all preferences
          </button>
        </div>
      </div>
    </div>
  );
}
