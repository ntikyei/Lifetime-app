import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase, supabaseConfigured } from '../supabase';

interface Props {
  onAuthSuccess: (userId: string, hasProfile: boolean) => void;
}

type AuthMode = 'login' | 'signup';

export default function Auth({ onAuthSuccess }: Props) {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show setup instructions when Supabase is not configured
  if (!supabaseConfigured) {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a0a] flex items-center justify-center p-6 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
            <h1 className="text-4xl font-serif text-[#f5f5f5] tracking-tight mb-2">Lifetime</h1>
            <p className="text-[#737373] font-light">Setup required</p>
          </div>

          <div className="bg-[#171717] border border-[#262626] rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle size={20} />
              <h2 className="text-[#f5f5f5] font-medium">Supabase not configured</h2>
            </div>
            <p className="text-[#a3a3a3] font-light text-sm leading-relaxed">
              To use this app, add your Supabase credentials to the <code className="text-[#f5f5f5] bg-[#262626] px-1.5 py-0.5 rounded text-xs">.env</code> file in the project root:
            </p>
            <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4 font-mono text-xs text-[#a3a3a3] space-y-1 overflow-x-auto">
              <p><span className="text-[#737373]">VITE_SUPABASE_URL=</span><span className="text-[#f5f5f5]">https://your-project.supabase.co</span></p>
              <p><span className="text-[#737373]">VITE_SUPABASE_ANON_KEY=</span><span className="text-[#f5f5f5]">your-anon-key</span></p>
            </div>
            <p className="text-[#737373] font-light text-xs leading-relaxed">
              Then restart the dev server. You'll also need <code className="text-[#f5f5f5] bg-[#262626] px-1 py-0.5 rounded text-xs">profiles</code>, <code className="text-[#f5f5f5] bg-[#262626] px-1 py-0.5 rounded text-xs">interactions</code>, <code className="text-[#f5f5f5] bg-[#262626] px-1 py-0.5 rounded text-xs">matches</code>, and <code className="text-[#f5f5f5] bg-[#262626] px-1 py-0.5 rounded text-xs">messages</code> tables in your Supabase project.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Prototype limit: 50 users max
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });

        if (!countError && count !== null && count >= 50) {
          setError('Lifetime is currently invite-only. We've reached our 50-user prototype limit — check back soon!');
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          // New user — always needs profile setup
          onAuthSuccess(data.user.id, false);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          // Check if they have a profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single();

          onAuthSuccess(data.user.id, !!profile);
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-[#f5f5f5] flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-md w-full flex flex-col"
      >
        {/* App Name */}
        <h1 className="text-5xl md:text-6xl font-serif font-medium tracking-tight mb-12 text-center">
          Lifetime
        </h1>

        {/* Mode Toggle */}
        <div className="flex bg-[#171717] rounded-full p-1 mb-8 border border-[#262626]">
          <button
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${
              mode === 'signup'
                ? 'bg-[#f5f5f5] text-[#0a0a0a]'
                : 'text-[#a3a3a3] hover:text-[#f5f5f5]'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${
              mode === 'login'
                ? 'bg-[#f5f5f5] text-[#0a0a0a]'
                : 'text-[#a3a3a3] hover:text-[#f5f5f5]'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-[#737373] uppercase tracking-widest mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-[#171717] border border-[#262626] rounded-xl px-4 py-3.5 text-[#f5f5f5] font-light placeholder:text-[#737373] outline-none focus:border-[#404040] transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-[#737373] uppercase tracking-widest mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full bg-[#171717] border border-[#262626] rounded-xl px-4 py-3.5 text-[#f5f5f5] font-light placeholder:text-[#737373] outline-none focus:border-[#404040] transition-colors"
            />
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-4 py-3 text-[#ef4444] text-sm font-light"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-4 px-8 flex items-center justify-center gap-2 hover:bg-[#e5e5e5] transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>{mode === 'signup' ? 'Create Account' : 'Log In'}</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-[#737373] font-light leading-relaxed">
          {mode === 'signup'
            ? 'By signing up, you agree to our Terms of Service and Privacy Policy.'
            : 'Forgot your password? Contact support for help.'}
        </p>
      </motion.div>
    </div>
  );
}
