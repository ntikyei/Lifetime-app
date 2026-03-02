import { useState, useEffect, useRef } from 'react';
import { Settings, Shield, LogOut, RefreshCcw, PenLine, Loader2, X, Camera, Check, Trash2 } from 'lucide-react';
import { DiscoveryPreferences, SupabaseProfile, toUserProfile, UserProfile } from '../types';
import { supabase } from '../supabase';

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
}

function EditModal({ title, value, maxLength, onSave, onClose, multiline }: EditModalProps) {
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
            type="text"
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

function calculateCompletion(profile: UserProfile): number {
  let score = 0;
  if (profile.name) score += 20;
  if (profile.photos.length > 0) score += 20;
  if (profile.bio) score += 20;
  if (profile.prompts.length > 0) score += 20;
  if (profile.job || profile.location) score += 20;
  return score;
}

export default function Profile({ onOpenSettings, preferences, currentUserId, onLogout }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [rawProfile, setRawProfile] = useState<SupabaseProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit modal state
  const [editField, setEditField] = useState<{ field: string; title: string; value: string; maxLength?: number; multiline?: boolean } | null>(null);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
  const [showAddPrompt, setShowAddPrompt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [currentUserId]);

  const updateField = async (field: string, value: string) => {
    setSaving(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', currentUserId);

    if (err) {
      console.error('[Profile] Update failed:', err);
    } else {
      console.log(`[Profile] Updated ${field}`);
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
    };
    const dbField = fieldMap[editField.field] ?? editField.field;
    updateField(dbField, val);
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
    const file = e.target.files?.[0];
    if (!file || !rawProfile) return;
    setSaving(true);

    const ext = file.name.split('.').pop() ?? 'png';
    const filePath = `${currentUserId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('profile-photos').upload(filePath, file);
    if (uploadError) {
      console.error('[Profile] Photo upload failed:', uploadError);
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
    const photos = [...(rawProfile.photos ?? []), urlData.publicUrl];

    const { error: err } = await supabase
      .from('profiles')
      .update({ photos })
      .eq('id', currentUserId);

    if (err) console.error('[Profile] Photos update failed:', err);
    else console.log('[Profile] Photo added');
    await fetchProfile();
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePhotoRemove = async (photoIndex: number) => {
    if (!rawProfile) return;
    setSaving(true);
    const photos = rawProfile.photos.filter((_, i) => i !== photoIndex);
    const { error: err } = await supabase
      .from('profiles')
      .update({ photos })
      .eq('id', currentUserId);

    if (err) console.error('[Profile] Photo remove failed:', err);
    else console.log('[Profile] Photo removed');
    await fetchProfile();
    setSaving(false);
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

  const profileCompletion = calculateCompletion(profile);

  return (
    <div className="h-full bg-[#0a0a0a] p-6 overflow-y-auto">
      {saving && (
        <div className="fixed top-4 right-4 z-50 bg-[#171717] border border-[#262626] rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
          <Loader2 className="w-4 h-4 animate-spin text-[#f5f5f5]" />
          <span className="text-xs text-[#a3a3a3]">Saving...</span>
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
        <div className="w-28 h-28 rounded-full overflow-hidden mb-4 relative group">
          <img
            src={profile.photos[0]?.url ?? 'https://picsum.photos/seed/default/400/400'}
            alt={profile.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
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
            <button
              onClick={() => setShowAddPrompt(true)}
              className="w-full py-2.5 bg-[#262626] hover:bg-[#404040] text-[#f5f5f5] text-sm font-medium rounded-xl transition-colors"
            >
              Add a prompt
            </button>
          </div>
        </section>

        {/* Photos Grid */}
        <section>
          <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-4">Photos</h3>
          <div className="grid grid-cols-3 gap-2">
            {profile.photos.map((photo, i) => (
              <div key={photo.id} className="aspect-square rounded-xl overflow-hidden relative group">
                <img src={photo.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  onClick={() => handlePhotoRemove(i)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#0a0a0a]/70 flex items-center justify-center text-[#f5f5f5] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#ef4444]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {profile.photos.length < 6 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-[#262626] flex items-center justify-center text-[#737373] hover:border-[#404040] hover:text-[#a3a3a3] transition-colors"
              >
                <Camera size={24} />
              </button>
            )}
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
    </div>
  );
}
