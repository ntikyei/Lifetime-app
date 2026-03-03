import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Camera, X, Loader2, Check } from 'lucide-react';
import { supabase } from '../supabase';

interface Props {
  userId: string;
  onComplete: () => void;
}

type Step = 1 | 2 | 3 | 4;

interface ProfileData {
  displayName: string;
  dob: string;
  gender: string;
  jobTitle: string;
  city: string;
  bio: string;
  prompts: { question: string; answer: string }[];
  photoUrls: string[];
}

const GENDER_SUGGESTIONS = ['Man', 'Woman', 'Non-binary', 'Other'];

const PROMPT_QUESTIONS = [
  'I geek out on',
  'A non-negotiable for me is',
  'The way to my heart is',
  "I'm looking for",
  'A shower thought I recently had',
];

export default function ProfileSetup({ userId, onComplete }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Basic info
  const [displayName, setDisplayName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [showGenderSuggestions, setShowGenderSuggestions] = useState(false);

  // Step 2 — About you
  const [jobTitle, setJobTitle] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');

  // Step 3 — Prompts
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [promptAnswer, setPromptAnswer] = useState('');

  // Step 4 — Photos
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canProceedStep1 = displayName.trim().length > 0 && dob.length > 0 && gender.trim().length > 0;
  const canProceedStep2 = city.trim().length > 0;
  const canProceedStep3 = selectedPrompt !== null && promptAnswer.trim().length > 0;
  const canProceedStep4 = photos.length >= 1;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files).slice(0, 6 - photos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 6));
    // Reset the file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    setUploading(true);

    try {
      // Upload photos to Supabase Storage
      const uploadedUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fileExt = photo.file.name.split('.').pop();
        const filePath = `${userId}/${Date.now()}_${i}.${fileExt}`;

        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session when uploading:', session?.user?.id);

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, photo.file);

        if (uploadError) {
          throw new Error(`Failed to upload photo ${i + 1}: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrlData.publicUrl);
        setUploadProgress(Math.round(((i + 1) / photos.length) * 100));
      }

      setUploading(false);

      // Build prompt data
      const promptsData = selectedPrompt && promptAnswer.trim()
        ? [{ question: selectedPrompt, answer: promptAnswer.trim() }]
        : [];

      // Debug: check auth vs prop
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth ID:', session?.user?.id);
      console.log('userId prop:', userId);

      // Save profile to Supabase
      const profileData: ProfileData = {
        displayName: displayName.trim(),
        dob,
        gender: gender.trim(),
        jobTitle: jobTitle.trim(),
        city: city.trim(),
        bio: bio.trim(),
        prompts: promptsData,
        photoUrls: uploadedUrls,
      };

      const { error: insertError } = await supabase.from('profiles').insert({
        id: userId,
        display_name: profileData.displayName,
        dob: profileData.dob,
        gender: profileData.gender,
        sexuality: null,
        interested_in: ['Everyone'],
        religion: null,
        race: null,
        ethnicity: null,
        bio: profileData.bio,
        location_city: profileData.city,
        job_title: profileData.jobTitle || null,
        age_min: 18,
        age_max: 65,
        max_distance: 50,
        show_in_discovery: true,
        preferences: { religion: [], race: [], ethnicity: [] },
        photos: uploadedUrls,
        prompts: profileData.prompts,
        is_paid: false,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong saving your profile.';
      setError(message);
      setSaving(false);
      setUploading(false);
    }
  };

  const nextStep = () => {
    if (step < 4) setStep((step + 1) as Step);
  };

  const prevStep = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-[#f5f5f5] flex flex-col font-sans">
      {/* Progress Bar */}
      <div className="p-6 pb-0">
        <div className="flex gap-2 mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                s <= step ? 'bg-[#f5f5f5]' : 'bg-[#262626]'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-[#737373] font-light">Step {step} of 4</p>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* STEP 1 — Basic Info */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto space-y-6"
            >
              <div>
                <h1 className="text-3xl font-serif font-medium tracking-tight mb-2">The basics.</h1>
                <p className="text-[#a3a3a3] font-light">Let's start with your name and a few details.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#737373] uppercase tracking-widest mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your first name"
                  className="w-full bg-[#171717] border border-[#262626] rounded-xl px-4 py-3.5 text-[#f5f5f5] font-light placeholder:text-[#737373] outline-none focus:border-[#404040] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#737373] uppercase tracking-widest mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-[#171717] border border-[#262626] rounded-xl px-4 py-3.5 text-[#f5f5f5] font-light outline-none focus:border-[#404040] transition-colors [color-scheme:dark]"
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-medium text-[#737373] uppercase tracking-widest mb-2">
                  Gender
                </label>
                <input
                  type="text"
                  value={gender}
                  onChange={(e) => { setGender(e.target.value); setShowGenderSuggestions(true); }}
                  onFocus={() => setShowGenderSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowGenderSuggestions(false), 200)}
                  placeholder="How do you identify?"
                  className="w-full bg-[#171717] border border-[#262626] rounded-xl px-4 py-3.5 text-[#f5f5f5] font-light placeholder:text-[#737373] outline-none focus:border-[#404040] transition-colors"
                />
                {showGenderSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-[#171717] border border-[#262626] rounded-xl overflow-hidden shadow-lg">
                    {GENDER_SUGGESTIONS.filter((g) =>
                      g.toLowerCase().includes(gender.toLowerCase()) || gender === ''
                    ).map((g) => (
                      <button
                        key={g}
                        onMouseDown={() => { setGender(g); setShowGenderSuggestions(false); }}
                        className="w-full text-left px-4 py-3 text-[#d4d4d4] font-light hover:bg-[#262626] transition-colors text-sm"
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2 — About You */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto space-y-6"
            >
              <div>
                <h1 className="text-3xl font-serif font-medium tracking-tight mb-2">About you.</h1>
                <p className="text-[#a3a3a3] font-light">Help people get to know you a little better.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#737373] uppercase tracking-widest mb-2">
                  Job Title <span className="text-[#525252]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Product Designer"
                  className="w-full bg-[#171717] border border-[#262626] rounded-xl px-4 py-3.5 text-[#f5f5f5] font-light placeholder:text-[#737373] outline-none focus:border-[#404040] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#737373] uppercase tracking-widest mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. London"
                  className="w-full bg-[#171717] border border-[#262626] rounded-xl px-4 py-3.5 text-[#f5f5f5] font-light placeholder:text-[#737373] outline-none focus:border-[#404040] transition-colors"
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-xs font-medium text-[#737373] uppercase tracking-widest">
                    Bio
                  </label>
                  <span className={`text-xs font-light ${bio.length > 280 ? 'text-[#ef4444]' : 'text-[#737373]'}`}>
                    {bio.length}/300
                  </span>
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => {
                    if (e.target.value.length <= 300) setBio(e.target.value);
                  }}
                  placeholder="A short description about yourself..."
                  rows={4}
                  className="w-full bg-[#171717] border border-[#262626] rounded-xl px-4 py-3.5 text-[#f5f5f5] font-light placeholder:text-[#737373] outline-none focus:border-[#404040] transition-colors resize-none"
                />
              </div>
            </motion.div>
          )}

          {/* STEP 3 — Prompts */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto space-y-6"
            >
              <div>
                <h1 className="text-3xl font-serif font-medium tracking-tight mb-2">Pick a prompt.</h1>
                <p className="text-[#a3a3a3] font-light">Choose one and write a genuine answer. This is how people connect with you.</p>
              </div>

              <div className="space-y-2">
                {PROMPT_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setSelectedPrompt(q); setPromptAnswer(''); }}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors ${
                      selectedPrompt === q
                        ? 'bg-[#f5f5f5] text-[#0a0a0a] border-[#f5f5f5]'
                        : 'bg-[#171717] text-[#d4d4d4] border-[#262626] hover:border-[#404040]'
                    }`}
                  >
                    <span className="text-sm font-medium">{q}</span>
                  </button>
                ))}
              </div>

              {selectedPrompt && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <div className="flex justify-between items-end">
                    <label className="block text-xs font-medium text-[#737373] uppercase tracking-widest">
                      Your Answer
                    </label>
                    <span className={`text-xs font-light ${promptAnswer.length > 130 ? 'text-[#ef4444]' : 'text-[#737373]'}`}>
                      {promptAnswer.length}/150
                    </span>
                  </div>
                  <textarea
                    value={promptAnswer}
                    onChange={(e) => {
                      if (e.target.value.length <= 150) setPromptAnswer(e.target.value);
                    }}
                    placeholder="Write your answer..."
                    rows={3}
                    autoFocus
                    className="w-full bg-[#171717] border border-[#262626] rounded-xl px-4 py-3.5 text-[#f5f5f5] font-light placeholder:text-[#737373] outline-none focus:border-[#404040] transition-colors resize-none"
                  />
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 4 — Photos */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto space-y-6"
            >
              <div>
                <h1 className="text-3xl font-serif font-medium tracking-tight mb-2">Add photos.</h1>
                <p className="text-[#a3a3a3] font-light">Upload at least 1 photo, up to 6. Your first photo will be your main profile picture.</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[...Array(6)].map((_, index) => {
                  const photo = photos[index];
                  return (
                    <div
                      key={index}
                      className="aspect-[3/4] rounded-xl border border-[#262626] bg-[#171717] overflow-hidden relative group"
                    >
                      {photo ? (
                        <>
                          <img
                            src={photo.preview}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#0a0a0a]/70 backdrop-blur-md flex items-center justify-center text-[#f5f5f5] opacity-0 group-hover:opacity-100 transition-opacity"
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
                          <Camera size={20} />
                          <span className="text-[10px] mt-1 font-light">Add</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#a3a3a3] font-light">Uploading photos...</span>
                    <span className="text-[#f5f5f5] font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-[#262626] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-[#f5f5f5] rounded-full"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mx-6 mb-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3 text-[#ef4444] text-sm font-light"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="p-6 pt-4 flex gap-3">
        {step > 1 && (
          <button
            onClick={prevStep}
            disabled={saving}
            className="py-4 px-6 rounded-full border border-[#262626] text-[#a3a3a3] hover:text-[#f5f5f5] hover:border-[#404040] transition-colors disabled:opacity-50"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        {step < 4 ? (
          <button
            onClick={nextStep}
            disabled={
              (step === 1 && !canProceedStep1) ||
              (step === 2 && !canProceedStep2) ||
              (step === 3 && !canProceedStep3)
            }
            className="flex-1 bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-4 px-8 flex items-center justify-between hover:bg-[#e5e5e5] transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Continue</span>
            <ArrowRight className="w-5 h-5 opacity-50" />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={!canProceedStep4 || saving}
            className="flex-1 bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-4 px-8 flex items-center justify-center gap-2 hover:bg-[#e5e5e5] transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Complete Profile</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
