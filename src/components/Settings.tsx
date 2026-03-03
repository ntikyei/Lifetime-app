import { useState } from 'react';
import { ChevronLeft, LogOut, Shield, Bell, EyeOff, MapPinOff, RefreshCcw, Trash2, FileText, HelpCircle, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { AppSettings } from '../types';
import { supabase } from '../supabase';

interface Props {
  onClose: () => void;
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  onLogout: () => void;
}

export default function SettingsView({ onClose, settings, onUpdate, onLogout }: Props) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete profile (cascades should handle related data)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      if (profileError) throw new Error(profileError.message);

      // Sign out
      await supabase.auth.signOut();
      onLogout();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete account.';
      setDeleteError(message);
      setDeleting(false);
    }
  };

  const toggleSetting = (key: keyof AppSettings) => {
    const newSettings = { ...localSettings, [key]: !localSettings[key] };
    setLocalSettings(newSettings);
    onUpdate(newSettings);
  };

  const toggleNotification = (key: keyof AppSettings['notifications']) => {
    const newSettings = { 
      ...localSettings, 
      notifications: { ...localSettings.notifications, [key]: !localSettings.notifications[key] } 
    };
    setLocalSettings(newSettings);
    onUpdate(newSettings);
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#0a0a0a] flex flex-col font-sans">
      <div className="flex items-center justify-between p-4 border-b border-[#171717] bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="p-2 -ml-2 text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
          <ChevronLeft size={24} strokeWidth={1.5} />
        </button>
        <h2 className="text-[#f5f5f5] font-medium">Settings</h2>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10 pb-32">
        <section>
          <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-4">Discovery Controls</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 rounded-xl border border-[#262626] bg-[#171717]">
              <div className="flex items-center gap-3">
                <EyeOff className="w-5 h-5 text-[#a3a3a3]" />
                <div>
                  <span className="block text-sm font-medium text-[#f5f5f5] mb-0.5">Pause Discovery</span>
                  <span className="block text-xs text-[#737373] font-light">Hide your profile from new people.</span>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('discoveryPaused')}
                className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.discoveryPaused ? 'bg-[#f5f5f5]' : 'bg-[#262626]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-[#0a0a0a] transition-transform ${localSettings.discoveryPaused ? 'left-7' : 'left-1 bg-[#737373]'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-[#262626] bg-[#171717]">
              <div className="flex items-center gap-3">
                <MapPinOff className="w-5 h-5 text-[#a3a3a3]" />
                <div>
                  <span className="block text-sm font-medium text-[#f5f5f5] mb-0.5">Hide Distance</span>
                  <span className="block text-xs text-[#737373] font-light">Don't show how far away you are.</span>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('hideDistance')}
                className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.hideDistance ? 'bg-[#f5f5f5]' : 'bg-[#262626]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-[#0a0a0a] transition-transform ${localSettings.hideDistance ? 'left-7' : 'left-1 bg-[#737373]'}`} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-4">Privacy & Safety</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 rounded-xl border border-[#262626] bg-[#171717]">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#a3a3a3]" />
                <div>
                  <span className="block text-sm font-medium text-[#f5f5f5] mb-0.5">Read Receipts</span>
                  <span className="block text-xs text-[#737373] font-light">Let others know you've read their messages.</span>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('readReceipts')}
                className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.readReceipts ? 'bg-[#f5f5f5]' : 'bg-[#262626]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-[#0a0a0a] transition-transform ${localSettings.readReceipts ? 'left-7' : 'left-1 bg-[#737373]'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-[#262626] bg-[#171717]">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center text-[#a3a3a3] font-serif italic text-sm">...</div>
                <div>
                  <span className="block text-sm font-medium text-[#f5f5f5] mb-0.5">Typing Indicators</span>
                  <span className="block text-xs text-[#737373] font-light">Show when you are typing a message.</span>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('typingIndicators')}
                className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.typingIndicators ? 'bg-[#f5f5f5]' : 'bg-[#262626]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-[#0a0a0a] transition-transform ${localSettings.typingIndicators ? 'left-7' : 'left-1 bg-[#737373]'}`} />
              </button>
            </div>

            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-[#262626] bg-[#171717] hover:bg-[#262626] transition-colors text-left">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#a3a3a3]" />
                <span className="text-sm font-medium text-[#f5f5f5]">Blocked Users</span>
              </div>
              <ChevronLeft size={18} className="text-[#737373] rotate-180" />
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-4">Notifications</h3>
          <div className="space-y-2">
            {[
              { key: 'matches', label: 'New Matches', desc: 'When someone you liked likes you back.' },
              { key: 'messages', label: 'Messages', desc: 'When you receive a new message.' },
              { key: 'likes', label: 'New Likes', desc: 'When someone likes your profile.' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-[#262626] bg-[#171717]">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-[#a3a3a3]" />
                  <div>
                    <span className="block text-sm font-medium text-[#f5f5f5] mb-0.5">{label}</span>
                    <span className="block text-xs text-[#737373] font-light">{desc}</span>
                  </div>
                </div>
                <button 
                  onClick={() => toggleNotification(key as keyof AppSettings['notifications'])}
                  className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.notifications[key as keyof AppSettings['notifications']] ? 'bg-[#f5f5f5]' : 'bg-[#262626]'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-[#0a0a0a] transition-transform ${localSettings.notifications[key as keyof AppSettings['notifications']] ? 'left-7' : 'left-1 bg-[#737373]'}`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-medium text-[#737373] uppercase tracking-widest mb-4">Payment & Support</h3>
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-[#262626] bg-[#171717] hover:bg-[#262626] transition-colors text-left">
              <div className="flex items-center gap-3">
                <RefreshCcw className="w-5 h-5 text-[#a3a3a3]" />
                <span className="text-sm font-medium text-[#f5f5f5]">Restore Purchases</span>
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-[#262626] bg-[#171717] hover:bg-[#262626] transition-colors text-left">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-[#a3a3a3]" />
                <span className="text-sm font-medium text-[#f5f5f5]">Contact Support</span>
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-[#262626] bg-[#171717] hover:bg-[#262626] transition-colors text-left">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#a3a3a3]" />
                <span className="text-sm font-medium text-[#f5f5f5]">Legal & Privacy</span>
              </div>
            </button>
          </div>
        </section>

        <section className="pt-8 space-y-4">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-[#262626] bg-[#171717] hover:bg-[#262626] transition-colors text-[#f5f5f5] font-medium">
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 transition-colors text-[#ef4444] font-medium"
          >
            <Trash2 className="w-5 h-5" />
            Delete Account
          </button>
        </section>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-[#171717] border border-[#262626] rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#ef4444]/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-[#ef4444]" />
            </div>
            <h3 className="text-lg font-serif text-[#f5f5f5] mb-2">Delete your account?</h3>
            <p className="text-sm text-[#a3a3a3] font-light mb-6 leading-relaxed">
              This will permanently delete your profile, matches, and messages. This action cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-[#ef4444] mb-4">{deleteError}</p>
            )}
            <div className="space-y-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="w-full py-3 rounded-full bg-[#ef4444] text-white font-medium text-sm hover:bg-[#dc2626] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  'Yes, delete my account'
                )}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                disabled={deleting}
                className="w-full py-3 rounded-full border border-[#262626] text-[#a3a3a3] font-medium text-sm hover:text-[#f5f5f5] hover:border-[#404040] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
