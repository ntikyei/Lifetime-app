// If photo upload fails with RLS error, run this in Supabase SQL Editor:
// create policy "Allow profile photo uploads"
// on storage.objects for insert
// to authenticated
// with check (bucket_id = 'photos');

/*
  Run this SQL in Supabase SQL Editor:

  alter table profiles add column if not exists religion text;
  alter table profiles add column if not exists race text;
  alter table profiles add column if not exists ethnicity text;
  alter table profiles add column if not exists sexuality text;
  alter table profiles add column if not exists interested_in text[] default '{}';
  alter table profiles add column if not exists preferences jsonb default '{}';
*/

import { useState, useEffect, useRef } from 'react';
import { Settings, Shield, LogOut, RefreshCcw, PenLine, Loader2, X, Camera, Check, Trash2 } from 'lucide-react';
import { DiscoveryPreferences, SupabaseProfile, toUserProfile, UserProfile } from '../types';
import { supabase } from '../supabase';
import { calculateAge } from '../utils/helpers';

interface Props {
  onOpenSettings: () => void;
  preferences: DiscoveryPreferences;
  currentUserId: string;
  onLogout: () => void;
}

interface EditModalProps {
  title: string;
  value: string;
  maxLength?: number;
  onSave: (val: string) => void;
  onClose: () => void;
  multiline?: boolean;
  inputType?: string;
  suggestions?: string[];
}

function EditModal({ title, value, maxLength, onSave, onClose, multiline, inputType, suggestions }: EditModalProps) {
  const [text, setText] = useState(value);

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#171717] border border-[#262626] rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[#f5f5f5] font-medium">{title}</h3>
          <button onClick={onClose} className="text-[#737373] hover:text-[#f5f5f5]">
            <X size={20} />
          </button>
        </div>
        {multiline ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={maxLength}
            rows={4}
            className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-4 py-3 text-[#f5f5f5] font-light resize-none outline-none focus:border-[#404040] transition-colors"
            autoFocus
          />
        ) : (
          <input
            type={inputType || 'text'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={maxLength}
            className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-4 py-3 text-[#f5f5f5] font-light outline-none focus:border-[#404040] transition-colors"
            autoFocus
          />
        )}
        {maxLength && (
          <p className="text-[10px] text-[#737373] mt-2 text-right">{text.length}/{maxLength}</p>
        )}
        {suggestions && suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((option) => (
              <button
                key={option}
                onClick={() => setText(option)}
                className="px-3 py-1.5 rounded-full text-xs bg-[#0a0a0a] border border-[#262626] text-[#a3a3a3] hover:text-[#f5f5f5] hover:border-[#404040] transition-colors"
              >
                {option}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => onSave(text)}
          className="w-full mt-4 bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-3 hover:bg-[#e5e5e5] transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

const PROMPT_OPTIONS = [
  "A boundary I've recently set is...",
  "I'm looking for someone who...",
  "My most controversial opinion is...",
  "The way to win me over is...",
  "I guarantee you that...",
  "My simple pleasures are...",
  "A life goal of mine is...",
  "I geek out on...",
  "The key to my heart is...",
  "Together we could...",
];

interface PromptEditModalProps {
  question: string;
  answer: string;
  onSave: (question: string, answer: string) => void;
  onClose: () => void;
}

function PromptEditModal({ question, answer, onSave, onClose }: PromptEditModalProps) {
  const [selectedQ, setSelectedQ] = useState(question || PROMPT_OPTIONS[0]);
  const [answerText, setAnswerText] = useState(answer);

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#171717] border border-[#262626] rounded-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[#f5f5f5] font-medium">Edit Prompt</h3>
          <button onClick={onClose} className="text-[#737373] hover:text-[#f5f5f5]"><X size={20} /></button>
        </div>
        <p className="text-xs text-[#737373] uppercase tracking-widest mb-3 font-medium">Choose a prompt</p>
        <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
          {PROMPT_OPTIONS.map((q) => (
            <button
              key={q}
              onClick={() => setSelectedQ(q)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-light transition-colors ${
                selectedQ === q ? 'bg-[#262626] text-[#f5f5f5] border border-[#404040]' : 'bg-[#0a0a0a] text-[#a3a3a3] border border-[#262626] hover:border-[#404040]'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#737373] uppercase tracking-widest mb-2 font-medium">Your answer</p>
        <textarea
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          maxLength={200}
          rows={3}
          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-4 py-3 text-[#f5f5f5] font-light resize-none outline-none focus:border-[#404040] transition-colors"
          placeholder="Type your answer..."
        />
        <p className="text-[10px] text-[#737373] mt-1 text-right">{answerText.length}/200</p>
        <button
          onClick={() => onSave(selectedQ, answerText)}
          disabled={!answerText.trim()}
          className="w-full mt-4 bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-3 hover:bg-[#e5e5e5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Prompt
        </button>
      </div>
    </div>
  );
}

interface SelectSheetProps {
  title: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

function SelectSheet({ title, options, value, onSelect, onClose }: SelectSheetProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div className="w-full bg-[#171717] border-t border-[#262626] rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#f5f5f5] font-medium">{title}</h3>
          <button onClick={onClose} className="text-[#737373] hover:text-[#f5f5f5]"><X size={20} /></button>
        </div>
        <div className="space-y-2">
          {options.map((option) => {
            const isSelected = value === option;
            return (
              <button
                key={option}
                onClick={() => onSelect(option)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-[#f5f5f5] text-[#0a0a0a] border-[#f5f5f5]'
                    : 'bg-[#0a0a0a] text-[#d4d4d4] border-[#262626] hover:border-[#404040]'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface CompletionCheck {
  done: boolean;
  weight: number;
  label: string;
  icon: string;
  action: string;
}

function getCompletionChecks(raw: SupabaseProfile | null): CompletionCheck[] {
  if (!raw) return [];
  return [
    { done: !!raw.display_name?.trim(), weight: 15, label: 'Add your name', icon: '✏️', action: 'name' },
    { done: !!raw.dob, weight: 10, label: 'Add your date of birth', icon: '🎂', action: 'dob' },
    { done: !!raw.gender?.trim(), weight: 10, label: 'Add your gender', icon: '👤', action: 'gender' },
    { done: Array.isArray(raw.photos) && raw.photos.length >= 1, weight: 20, label: 'Add at least 1 photo', icon: '📸', action: 'photo' },
    { done: Array.isArray(raw.photos) && raw.photos.length >= 3, weight: 10, label: 'Add 3 or more photos', icon: '📸', action: 'photo' },
    { done: !!raw.bio?.trim(), weight: 15, label: 'Write a bio', icon: '✍️', action: 'bio' },
    { done: Array.isArray(raw.prompts) && raw.prompts.length >= 1, weight: 10, label: 'Answer a prompt', icon: '💬', action: 'prompt' },
    { done: !!raw.job_title?.trim(), weight: 5, label: 'Add your job title', icon: '💼', action: 'job' },
    { done: !!raw.location_city?.trim(), weight: 5, label: 'Add your city', icon: '📍', action: 'location' },
  ];
}

function calculateCompletion(raw: SupabaseProfile | null): number {
  const checks = getCompletionChecks(raw);
  return checks.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0);
}

const GENDER_SUGGESTIONS = ['Man', 'Woman', 'Non-binary', 'Other'];
const SEXUALITY_OPTIONS = ['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Queer', 'Asexual', 'Other', 'Prefer not to say'];
const INTERESTED_IN_OPTIONS = ['Men', 'Women', 'Everyone', 'Non-binary'];
const RELIGION_OPTIONS = ['No religion', 'Christian', 'Muslim', 'Jewish', 'Hindu', 'Buddhist', 'Sikh', 'Spiritual', 'Other', 'Prefer not to say'];
const RACE_OPTIONS = ['Black', 'White', 'Asian', 'Hispanic/Latino', 'Middle Eastern', 'Mixed', 'Other', 'Prefer not to say'];

export default function Profile({ onOpenSettings, preferences, currentUserId, onLogout }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [rawProfile, setRawProfile] = useState<SupabaseProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectSheet, setSelectSheet] = useState<null | 'religion' | 'race' | 'sexuality'>(null);

  // Edit modal state
  const [editField, setEditField] = useState<{ field: string; title: string; value: string; maxLength?: number; multiline?: boolean; inputType?: string } | null>(null);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
  const [showAddPrompt, setShowAddPrompt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanPhotos = (photos: unknown): string[] => {
    if (!Array.isArray(photos)) return [];
    return photos.filter(
      (url): url is string =>
        typeof url === 'string' &&
        url.startsWith('https://') &&
        url.length > 20
    );
  };

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
      const raw = data as SupabaseProfile;
      setRawProfile(raw);
      setProfile(toUserProfile(raw));

      // Clean broken / malformed URLs
      const cleanedPhotos = cleanPhotos(raw.photos);
      setPhotos(cleanedPhotos);

      // Auto-fix DB if broken URLs were removed
      if (cleanedPhotos.length !== (Array.isArray(raw.photos) ? raw.photos.length : 0)) {
        await supabase
          .from('profiles')
          .update({ photos: cleanedPhotos })
          .eq('id', currentUserId);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [currentUserId]);

  const updateField = async (field: string, value: string | string[] | null) => {
    console.log('[Profile] updateField', { field, value });
    setSaving(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', currentUserId);

    if (err) {
      console.error('[Profile] Update failed:', err);
    } else {
      console.log(`[Profile] Updated ${field}`);
      setShowSavedToast(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setShowSavedToast(false), 2000);
      await fetchProfile();
    }
    setSaving(false);
    setEditField(null);
  };

  const handleFieldSave = (val: string) => {
    if (!editField) return;
    const fieldMap: Record<string, string> = {
      name: 'display_name',
      location: 'location_city',
      job: 'job_title',
      bio: 'bio',
      gender: 'gender',
      dob: 'dob',
      ethnicity: 'ethnicity',
    };
    const dbField = fieldMap[editField.field] ?? editField.field;
    updateField(dbField, val);
  };

  const handleSelectSave = async (field: 'religion' | 'race' | 'sexuality', value: string) => {
    await updateField(field, value);
    setSelectSheet(null);
  };

  const handleInterestedInToggle = async (option: string) => {
    const current = Array.isArray(rawProfile?.interested_in) ? rawProfile.interested_in : [];
    let next: string[];

    if (option === 'Everyone') {
      next = current.includes('Everyone') ? [] : ['Everyone'];
    } else {
      const withoutEveryone = current.filter((item) => item !== 'Everyone');
      next = withoutEveryone.includes(option)
        ? withoutEveryone.filter((item) => item !== option)
        : [...withoutEveryone, option];
    }

    console.log('[Profile] interested_in changed', next);
    await updateField('interested_in', next);
  };

  const handlePromptSave = async (question: string, answer: string, index?: number) => {
    if (!rawProfile) return;
    setSaving(true);
    const prompts = [...(rawProfile.prompts ?? [])];
    if (index !== undefined && index !== null) {
      prompts[index] = { question, answer };
    } else {
      prompts.push({ question, answer });
    }
    const { error: err } = await supabase
      .from('profiles')
      .update({ prompts })
      .eq('id', currentUserId);

    if (err) console.error('[Profile] Prompt update failed:', err);
    else console.log('[Profile] Prompts updated');
    await fetchProfile();
    setSaving(false);
    setEditingPromptIndex(null);
    setShowAddPrompt(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    setError(null);

    try {
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${currentUserId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      const newUrl = urlData.publicUrl;

      if (!newUrl || !newUrl.startsWith('https://')) {
        throw new Error('Invalid photo URL returned from storage');
      }

      // IMPORTANT: fetch current photos fresh from database first
      // to avoid overwriting with stale state
      const { data: current } = await supabase
        .from('profiles')
        .select('photos')
        .eq('id', currentUserId)
        .single();

      const existingPhotos: string[] = Array.isArray(current?.photos)
        ? current.photos
        : [];

      const updatedPhotos = [...existingPhotos, newUrl];

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photos: updatedPhotos })
        .eq('id', currentUserId);

      if (updateError) throw updateError;

      // Update local state with full updated array
      setPhotos(updatedPhotos);

    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    try {
      // Fetch current photos fresh from database first
      const { data: current } = await supabase
        .from('profiles')
        .select('photos')
        .eq('id', currentUserId)
        .single();

      const existingPhotos: string[] = Array.isArray(current?.photos)
        ? current.photos
        : [];

      const updatedPhotos = existingPhotos.filter(
        (p: string) => p !== photoUrl
      );

      const { error } = await supabase
        .from('profiles')
        .update({ photos: updatedPhotos })
        .eq('id', currentUserId);

      if (error) throw error;

      // Update local state immediately
      setPhotos(updatedPhotos);

    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to remove photo. Please try again.');
    }
  };

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

  const profileCompletion = calculateCompletion(rawProfile);
  const completionChecks = getCompletionChecks(rawProfile);
  const missingItems = completionChecks.filter(c => !c.done);

  return (
    <div className="h-full bg-[#0a0a0a] p-6 overflow-y-auto">
      {(saving || uploadingPhoto) && (
        <div className="fixed top-4 right-4 z-50 bg-[#171717] border border-[#262626] rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
          <Loader2 className="w-4 h-4 animate-spin text-[#f5f5f5]" />
          <span className="text-xs text-[#a3a3a3]">{uploadingPhoto ? 'Uploading photo...' : 'Saving...'}</span>
        </div>
      )}

      {showSavedToast && !saving && (
        <div className="fixed top-4 right-4 z-50 bg-[#171717] border border-emerald-500/30 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">Saved</span>
        </div>
      )}

      {error && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-[#171717] border border-[#ef4444]/30 rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
          <span className="text-sm text-[#ef4444] font-light">{error}</span>
          <button onClick={() => setError(null)} className="text-[#737373] hover:text-[#f5f5f5] ml-2">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-serif text-[#f5f5f5]">Profile</h1>
        <button onClick={onOpenSettings} className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
          <Settings size={22} strokeWidth={1.5} />
        </button>
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-28 h-28 rounded-full overflow-hidden mb-4 relative group bg-[#171717]">
          <img
            src={photos[0] ?? 'https://picsum.photos/seed/default/400/400'}
            alt={profile.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-[#0a0a0a]/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Camera size={20} className="text-[#f5f5f5]" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-serif text-[#f5f5f5] mb-1">{profile.name}, {profile.age}</h2>
          <button
            onClick={() => setEditField({ field: 'name', title: 'Edit Name', value: profile.name, maxLength: 50 })}
            className="text-[#737373] hover:text-[#f5f5f5] transition-colors"
          >
            <PenLine size={14} />
          </button>
          <button
            onClick={() => setEditField({ field: 'dob', title: 'Edit Date of Birth', value: rawProfile?.dob ?? '', inputType: 'date' })}
            className="text-[#737373] hover:text-[#f5f5f5] transition-colors"
            title="Edit age"
          >
            <PenLine size={12} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[#737373] font-light">{profile.location || 'No location set'}</p>
          <button
            onClick={() => setEditField({ field: 'location', title: 'Edit City', value: profile.location, maxLength: 100 })}
            className="text-[#737373] hover:text-[#f5f5f5] transition-colors"
          >
            <PenLine size={12} />
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

      <div className="space-y-8">
        {/* Profile Completion */}
        <section>
          <div className="bg-[#171717] border border-[#262626] rounded-2xl p-5">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h3 className="text-[#f5f5f5] font-medium mb-1">Profile {profileCompletion}% complete</h3>
                <p className="text-xs text-[#a3a3a3] font-light">
                  {profileCompletion === 100 ? 'Your profile is complete! You\'re 3x more likely to get matches.' : 'Complete profiles get 3x more matches.'}
                </p>
              </div>
              <span className="text-2xl font-serif text-[#737373]">{profileCompletion}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#262626] rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${profileCompletion === 100 ? 'bg-emerald-400' : 'bg-[#f5f5f5]'}`}
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            {profileCompletion === 100 ? (
              <div className="text-center py-2">
                <span className="text-emerald-400 text-sm font-medium">🎉 Looking great!</span>
              </div>
            ) : (
              <div className="space-y-2">
                {missingItems.slice(0, 3).map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.action === 'bio') setEditField({ field: 'bio', title: 'Edit Bio', value: profile.bio, maxLength: 300, multiline: true });
                      else if (item.action === 'name') setEditField({ field: 'name', title: 'Edit Name', value: profile.name, maxLength: 50 });
                      else if (item.action === 'job') setEditField({ field: 'job', title: 'Edit Job Title', value: profile.job, maxLength: 100 });
                      else if (item.action === 'location') setEditField({ field: 'location', title: 'Edit City', value: profile.location, maxLength: 100 });
                      else if (item.action === 'prompt') setShowAddPrompt(true);
                      else if (item.action === 'photo') fileInputRef.current?.click();
                      else if (item.action === 'gender') setEditField({ field: 'gender', title: 'Edit Gender', value: rawProfile?.gender ?? '', maxLength: 30 });
                      else if (item.action === 'dob') setEditField({ field: 'dob', title: 'Edit Date of Birth', value: rawProfile?.dob ?? '', inputType: 'date' });
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-[#0a0a0a] border border-[#262626] rounded-xl hover:border-[#404040] transition-colors text-left"
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-sm text-[#a3a3a3] font-light">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Photos Grid */}
        <section>
          <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-4">Photos</h3>
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, index) => {
              const photoUrl = photos[index];
              return (
                <div key={index} className="aspect-[3/4] rounded-xl border border-[#262626] bg-[#171717] overflow-hidden relative group">
                  {photoUrl ? (
                    <>
                      <img
                        src={photoUrl}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement?.classList.add('broken-photo');
                        }}
                      />
                      {/* Broken photo fallback (shown via CSS when image fails) */}
                      <div className="broken-photo-placeholder absolute inset-0 flex flex-col items-center justify-center text-[#737373] pointer-events-none">
                        <Camera size={20} />
                        <span className="text-[10px] mt-1 font-light">Tap to replace</span>
                      </div>
                      <button
                        onClick={() => handleRemovePhoto(photoUrl)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center text-white z-10 shadow-lg"
                      >
                        <X size={14} />
                      </button>
                      {index === 0 && (
                        <div className="absolute bottom-2 left-2 bg-[#0a0a0a]/70 backdrop-blur-md rounded-full px-2 py-0.5 text-[10px] font-medium text-[#f5f5f5]">
                          Main
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-full flex flex-col items-center justify-center text-[#737373] hover:text-[#a3a3a3] transition-colors"
                    >
                      {uploadingPhoto && index === photos.length ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <>
                          <Camera size={20} />
                          <span className="text-[10px] mt-1 font-light">Add</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Weekly Prompt */}
        <section>
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:border-[#404040] transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <PenLine size={64} />
            </div>
            <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-2">Weekly Prompt</h3>
            <p className="text-lg font-serif text-[#f5f5f5] mb-4 relative z-10">&ldquo;A boundary I&apos;ve recently set is...&rdquo;</p>
            <button
              onClick={() => setShowAddPrompt(true)}
              className="text-sm font-medium text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors relative z-10"
            >
              Answer this prompt →
            </button>
          </div>
        </section>

        {/* Bio */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest">About</h3>
            <button
              onClick={() => setEditField({ field: 'bio', title: 'Edit Bio', value: profile.bio, maxLength: 300, multiline: true })}
              className="text-[#737373] hover:text-[#f5f5f5] transition-colors"
            >
              <PenLine size={14} />
            </button>
          </div>
          <p className="text-[#d4d4d4] font-light leading-relaxed">
            {profile.bio || 'No bio yet. Tap the edit icon to add one.'}
          </p>
        </section>

        {/* Prompts */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest">Prompts</h3>
            {profile.prompts.length < 3 && (
              <button
                onClick={() => setShowAddPrompt(true)}
                className="text-[#737373] hover:text-[#f5f5f5] transition-colors text-xs font-medium"
              >
                + Add
              </button>
            )}
          </div>
          {profile.prompts.length === 0 ? (
            <p className="text-[#737373] font-light text-sm">No prompts yet. Add one to help people connect with you.</p>
          ) : (
            <div className="space-y-3">
              {profile.prompts.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setEditingPromptIndex(i)}
                  className="w-full text-left bg-[#171717] border border-[#262626] rounded-xl p-4 hover:border-[#404040] transition-colors group"
                >
                  <p className="text-xs text-[#737373] font-medium mb-2">{p.question}</p>
                  <div className="flex justify-between items-start">
                    <p className="text-[#f5f5f5] font-light">{p.answer}</p>
                    <PenLine size={14} className="text-[#737373] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Personal Details */}
        <section>
          <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-4">Personal Details</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[#d4d4d4] font-light">First name</span>
              <div className="flex items-center gap-2">
                <span className="text-[#a3a3a3] text-sm font-light">{rawProfile?.display_name || 'Not set'}</span>
                <button
                  onClick={() => setEditField({ field: 'name', title: 'Edit First Name', value: rawProfile?.display_name ?? '', maxLength: 50 })}
                  className="text-[#737373] hover:text-[#f5f5f5] transition-colors"
                >
                  <PenLine size={12} />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#d4d4d4] font-light">Date of birth</span>
              <div className="flex items-center gap-2">
                <span className="text-[#a3a3a3] text-sm font-light">{rawProfile?.dob || 'Not set'}</span>
                <button
                  onClick={() => setEditField({ field: 'dob', title: 'Edit Date of Birth', value: rawProfile?.dob ?? '', inputType: 'date' })}
                  className="text-[#737373] hover:text-[#f5f5f5] transition-colors"
                >
                  <PenLine size={12} />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#d4d4d4] font-light">Gender</span>
              <div className="flex items-center gap-2">
                <span className="text-[#a3a3a3] text-sm font-light">{rawProfile?.gender || 'Not set'}</span>
                <button
                  onClick={() => setEditField({ field: 'gender', title: 'Edit Gender', value: rawProfile?.gender ?? '', maxLength: 30 })}
                  className="text-[#737373] hover:text-[#f5f5f5] transition-colors"
                >
                  <PenLine size={12} />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#d4d4d4] font-light">Sexuality</span>
              <div className="flex items-center gap-2">
                <span className="text-[#a3a3a3] text-sm font-light">{rawProfile?.sexuality || 'Not set'}</span>
                <button
                  onClick={() => setSelectSheet('sexuality')}
                  className="text-[#737373] hover:text-[#f5f5f5] transition-colors"
                >
                  <PenLine size={12} />
                </button>
              </div>
            </div>

            <div className="space-y-3 border-t border-[#171717] pt-4">
              <div className="flex justify-between items-center">
                <span className="text-[#d4d4d4] font-light">Interested in</span>
                <span className="text-[#a3a3a3] text-sm font-light">
                  {Array.isArray(rawProfile?.interested_in) && rawProfile.interested_in.length > 0
                    ? rawProfile.interested_in.join(', ')
                    : 'Not set'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {INTERESTED_IN_OPTIONS.map((option) => {
                  const selected = (rawProfile?.interested_in ?? []).includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => handleInterestedInToggle(option)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${selected ? 'bg-[#f5f5f5] text-[#0a0a0a] border-[#f5f5f5]' : 'bg-[#171717] text-[#a3a3a3] border-[#262626] hover:border-[#404040]'}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#d4d4d4] font-light">Religion</span>
              <div className="flex items-center gap-2">
                <span className="text-[#a3a3a3] text-sm font-light">{rawProfile?.religion || 'Not set'}</span>
                <button onClick={() => setSelectSheet('religion')} className="text-[#737373] hover:text-[#f5f5f5] transition-colors"><PenLine size={12} /></button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#d4d4d4] font-light">Race</span>
              <div className="flex items-center gap-2">
                <span className="text-[#a3a3a3] text-sm font-light">{rawProfile?.race || 'Not set'}</span>
                <button onClick={() => setSelectSheet('race')} className="text-[#737373] hover:text-[#f5f5f5] transition-colors"><PenLine size={12} /></button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#d4d4d4] font-light">Ethnicity</span>
              <div className="flex items-center gap-2">
                <span className="text-[#a3a3a3] text-sm font-light">{rawProfile?.ethnicity || 'Not set'}</span>
                <button
                  onClick={() => setEditField({ field: 'ethnicity', title: 'Edit Ethnicity', value: rawProfile?.ethnicity ?? '', maxLength: 100 })}
                  className="text-[#737373] hover:text-[#f5f5f5] transition-colors"
                >
                  <PenLine size={12} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Account Info */}
        <section>
          <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-4">Account</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[#d4d4d4] font-light">Membership</span>
              <span className="text-[#f5f5f5] text-sm font-medium">Lifetime</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#d4d4d4] font-light">Job</span>
              <div className="flex items-center gap-2">
                <span className="text-[#737373] text-sm font-light">{profile.job || 'Not set'}</span>
                <button
                  onClick={() => setEditField({ field: 'job', title: 'Edit Job Title', value: profile.job, maxLength: 100 })}
                  className="text-[#737373] hover:text-[#f5f5f5] transition-colors"
                >
                  <PenLine size={12} />
                </button>
              </div>
            </div>
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

      {/* Edit Modal */}
      {editField && (
        <EditModal
          title={editField.title}
          value={editField.value}
          maxLength={editField.maxLength}
          multiline={editField.multiline}
          inputType={editField.inputType}
          suggestions={editField.field === 'gender' ? GENDER_SUGGESTIONS : undefined}
          onClose={() => setEditField(null)}
          onSave={handleFieldSave}
        />
      )}

      {/* Prompt Edit Modal */}
      {editingPromptIndex !== null && rawProfile && (
        <PromptEditModal
          question={rawProfile.prompts[editingPromptIndex]?.question ?? ''}
          answer={rawProfile.prompts[editingPromptIndex]?.answer ?? ''}
          onClose={() => setEditingPromptIndex(null)}
          onSave={(q, a) => handlePromptSave(q, a, editingPromptIndex)}
        />
      )}

      {/* Add Prompt Modal */}
      {showAddPrompt && (
        <PromptEditModal
          question=""
          answer=""
          onClose={() => setShowAddPrompt(false)}
          onSave={(q, a) => handlePromptSave(q, a)}
        />
      )}

      {selectSheet === 'sexuality' && (
        <SelectSheet
          title="Select Sexuality"
          options={SEXUALITY_OPTIONS}
          value={rawProfile?.sexuality ?? ''}
          onClose={() => setSelectSheet(null)}
          onSelect={(value) => handleSelectSave('sexuality', value)}
        />
      )}

      {selectSheet === 'religion' && (
        <SelectSheet
          title="Select Religion"
          options={RELIGION_OPTIONS}
          value={rawProfile?.religion ?? ''}
          onClose={() => setSelectSheet(null)}
          onSelect={(value) => handleSelectSave('religion', value)}
        />
      )}

      {selectSheet === 'race' && (
        <SelectSheet
          title="Select Race"
          options={RACE_OPTIONS}
          value={rawProfile?.race ?? ''}
          onClose={() => setSelectSheet(null)}
          onSelect={(value) => handleSelectSave('race', value)}
        />
      )}
    </div>
  );
}
