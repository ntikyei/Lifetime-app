import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Send, Reply, Smile, Check, CheckCheck, X, MoreHorizontal, Loader2, Mic, Square, Play, Pause } from 'lucide-react';
import { Match, Message, MessageType, AppSettings } from '../types';
import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// -- Go to Supabase → Database → Replication → enable realtime for messages table
// -- Run this SQL in Supabase SQL Editor before using voice notes:
// insert into storage.buckets (id, name, public) values ('voice-notes', 'voice-notes', true) on conflict (id) do update set public = true;
// create policy "Upload voice notes" on storage.objects for insert to authenticated with check (bucket_id = 'voice-notes');
// create policy "View voice notes" on storage.objects for select to public using (bucket_id = 'voice-notes');
// alter table messages add column if not exists type text default 'text';
// alter table messages add column if not exists media_url text;

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: 'Smileys', emojis: ['😀', '😂', '😍', '🥰', '😊', '😘', '😭', '😅', '🤣', '😎', '🥺', '😏'] },
  { label: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💞', '💓', '💗'] },
  { label: 'Gestures', emojis: ['👋', '🤝', '👍', '👏', '🙌', '🤞', '💪', '🙏', '👀', '💅'] },
  { label: 'Fun', emojis: ['🔥', '✨', '🎉', '🎊', '💯', '🌹', '🍕', '🎵', '🌙', '⭐'] },
];

interface Props {
  match: Match;
  onBack: () => void;
  settings: AppSettings;
  currentUserId: string;
}

interface MessageRow {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  type: string | null;
  media_url: string | null;
  read_at: string | null;
  created_at: string;
}

function VoiceNotePlayer({ url, isMe }: { url: string; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.addEventListener('loadedmetadata', () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    });
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('ended', () => { setPlaying(false); setCurrentTime(0); });
    return () => { audio.pause(); audio.src = ''; };
  }, [url]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isMe ? 'bg-[#404040] hover:bg-[#525252]' : 'bg-[#262626] hover:bg-[#404040]'
        }`}
      >
        {playing ? <Pause size={16} className="text-[#f5f5f5]" /> : <Play size={16} className="text-[#f5f5f5] ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="w-full h-1.5 bg-[#404040] rounded-full overflow-hidden">
          <div className="h-full bg-[#f5f5f5] rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] text-[#737373]">
          {playing ? formatDuration(currentTime) : formatDuration(duration)}
        </span>
      </div>
    </div>
  );
}

export default function Chat({ match, onBack, settings, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const rowToMessage = (row: MessageRow): Message => ({
    id: row.id,
    senderId: row.sender_id,
    type: (row.type as MessageType) || 'text',
    content: row.body,
    mediaUrl: row.media_url ?? undefined,
    reactions: [],
    status: row.read_at ? 'read' : 'delivered',
    createdAt: row.created_at,
    readAt: row.read_at,
  });

  // Fetch initial messages and mark as read
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', match.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages((data as MessageRow[]).map(rowToMessage));
      }
      setLoading(false);

      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('match_id', match.id)
        .neq('sender_id', currentUserId)
        .is('read_at', null);
    };
    fetchMessages();
  }, [match.id, currentUserId]);

  // Real-time subscription for new + updated messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${match.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${match.id}` },
        (payload) => {
          const newRow = payload.new as MessageRow;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newRow.id)) return prev;
            return [...prev, rowToMessage(newRow)];
          });
          if (newRow.sender_id !== currentUserId && !newRow.read_at) {
            supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', newRow.id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `match_id=eq.${match.id}` },
        (payload) => {
          const updated = payload.new as MessageRow;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? { ...m, status: updated.read_at ? ('read' as const) : m.status, readAt: updated.read_at }
                : m
            )
          );
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [match.id, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();
    const body = inputText.trim();

    const optimisticMsg: Message = {
      id: tempId,
      senderId: currentUserId,
      type: 'text',
      content: body,
      reactions: [],
      status: 'sending',
      createdAt: now,
      replyTo: replyingTo ? { id: replyingTo.id, content: replyingTo.content, type: replyingTo.type } : undefined,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
    console.log('[Chat] Sending text:', body);

    const { data, error } = await supabase
      .from('messages')
      .insert({ match_id: match.id, sender_id: currentUserId, body, type: 'text' })
      .select()
      .single();

    if (error) {
      console.error('[Chat] Send failed:', error);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' as const } : m)));
    } else if (data) {
      const realRow = data as MessageRow;
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...rowToMessage(realRow), replyTo: optimisticMsg.replyTo } : m))
      );
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size === 0) return;

        console.log('[Chat] Uploading voice note...');
        const filePath = `${match.id}/${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage.from('voice-notes').upload(filePath, blob);
        if (uploadError) {
          console.error('[Chat] Voice upload failed:', uploadError);
          return;
        }
        const { data: urlData } = supabase.storage.from('voice-notes').getPublicUrl(filePath);
        await supabase.from('messages').insert({
          match_id: match.id,
          sender_id: currentUserId,
          body: '🎤 Voice note',
          type: 'voice',
          media_url: urlData.publicUrl,
        });
        console.log('[Chat] Voice note sent');
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err) {
      console.error('[Chat] Microphone access denied:', err);
    }
  }, [match.id, currentUserId]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const cancelRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.ondataavailable = null;
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setIsRecording(false);
    setRecordingTime(0);
    console.log('[Chat] Recording cancelled');
  }, []);

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) {
          const hasReacted = m.reactions.some((r) => r.userId === currentUserId && r.emoji === emoji);
          if (hasReacted) {
            return { ...m, reactions: m.reactions.filter((r) => !(r.userId === currentUserId && r.emoji === emoji)) };
          }
          return { ...m, reactions: [...m.reactions, { emoji, userId: currentUserId }] };
        }
        return m;
      })
    );
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="absolute inset-0 z-50 bg-[#0a0a0a] flex flex-col font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#171717] bg-[#0a0a0a]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
            <ChevronLeft size={24} strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-3">
            <img src={match.user.photos[0]?.url ?? ''} alt={match.user.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
            <div>
              <h2 className="text-[#f5f5f5] font-medium">{match.user.name}</h2>
              <p className="text-xs text-[#737373] font-light">{match.user.location || ''}</p>
            </div>
          </div>
        </div>
        <button className="p-2 -mr-2 text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
          <MoreHorizontal size={24} strokeWidth={1.5} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-[#737373]" />
          </div>
        ) : (
          <>
            <div className="text-center py-6">
              <p className="text-xs text-[#737373] font-light uppercase tracking-widest">Start of conversation</p>
            </div>

            {messages.map((msg, idx) => {
              const isMe = msg.senderId === currentUserId;
              const showReadReceipt = isMe && idx === messages.length - 1;
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const currentDay = new Date(msg.createdAt).toDateString();
              const prevDay = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;
              const showDateSep = currentDay !== prevDay;

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="text-center py-3">
                      <span className="text-[10px] text-[#525252] font-medium uppercase tracking-widest bg-[#0a0a0a] px-3">
                        {formatDateLabel(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg`}>
                    {msg.context && (
                      <div className={`mb-2 max-w-[85%] bg-[#171717] border border-[#262626] rounded-xl p-3 ${isMe ? 'mr-2' : 'ml-2'}`}>
                        <p className="text-[10px] font-medium text-[#737373] uppercase tracking-widest mb-1.5">Liked {msg.context.type}</p>
                        {msg.context.type === 'photo' && msg.context.contentUrl && (
                          <img src={msg.context.contentUrl} alt="Liked content" className="w-16 h-16 rounded-lg object-cover mb-2" />
                        )}
                        {msg.context.text && <p className="text-sm text-[#d4d4d4] font-serif italic">&ldquo;{msg.context.text}&rdquo;</p>}
                      </div>
                    )}

                    {msg.replyTo && (
                      <div className={`flex items-center gap-2 mb-1 opacity-70 text-xs ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Reply size={12} className="text-[#737373]" />
                        <span className="text-[#a3a3a3] truncate max-w-[200px]">{msg.replyTo.content}</span>
                      </div>
                    )}

                    <div
                      className={`relative group max-w-[75%] rounded-2xl px-4 py-3 ${
                        isMe ? 'bg-[#262626] text-[#f5f5f5] rounded-tr-sm' : 'bg-[#171717] text-[#e5e5e5] border border-[#262626] rounded-tl-sm'
                      }`}
                      onDoubleClick={() => setReplyingTo(msg)}
                    >
                      {msg.type === 'voice' && msg.mediaUrl ? (
                        <VoiceNotePlayer url={msg.mediaUrl} isMe={isMe} />
                      ) : (
                        <p className="font-light leading-relaxed">{msg.content}</p>
                      )}

                      {msg.reactions.length > 0 && (
                        <div className={`absolute -bottom-3 ${isMe ? '-left-2' : '-right-2'} bg-[#171717] border border-[#262626] rounded-full px-2 py-0.5 text-sm shadow-lg`}>
                          {msg.reactions.map((r, i) => <span key={i}>{r.emoji}</span>)}
                        </div>
                      )}

                      <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-16' : '-right-16'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-2`}>
                        <button onClick={() => handleReaction(msg.id, '❤️')} className="p-1.5 bg-[#171717] rounded-full text-[#a3a3a3] hover:text-[#f5f5f5]">
                          <Smile size={14} />
                        </button>
                        <button onClick={() => setReplyingTo(msg)} className="p-1.5 bg-[#171717] rounded-full text-[#a3a3a3] hover:text-[#f5f5f5]">
                          <Reply size={14} />
                        </button>
                      </div>
                    </div>

                    {showReadReceipt && (
                      <div className="mt-1 flex items-center gap-1 text-[#737373]">
                        {msg.status === 'read' && settings.readReceipts ? (
                          <CheckCheck size={14} className="text-[#a3a3a3]" />
                        ) : msg.status === 'delivered' ? (
                          <Check size={14} />
                        ) : msg.status === 'sending' ? (
                          <div className="w-3 h-3 rounded-full border border-[#737373] border-t-transparent animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                      </div>
                    )}

                    <span className="text-[10px] text-[#525252] font-light mt-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity select-none">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            ref={emojiPickerRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-[80px] left-4 right-4 z-30 bg-[#171717] border border-[#262626] rounded-2xl p-4 max-h-[280px] overflow-y-auto shadow-2xl"
          >
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.label} className="mb-3">
                <p className="text-[10px] text-[#737373] uppercase tracking-widest mb-2 font-medium">{cat.label}</p>
                <div className="grid grid-cols-10 gap-1">
                  {cat.emojis.map((emoji) => (
                    <button key={emoji} onClick={() => addEmoji(emoji)} className="text-xl hover:bg-[#262626] rounded-lg p-1 transition-colors">
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 bg-[#0a0a0a] border-t border-[#171717]">
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 px-4 py-2 bg-[#171717] rounded-xl border border-[#262626] flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="text-xs text-[#a3a3a3] font-medium mb-1">
                  Replying to {replyingTo.senderId === currentUserId ? 'yourself' : match.user.name}
                </span>
                <span className="text-sm text-[#737373] truncate max-w-[250px]">{replyingTo.content}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-[#737373] hover:text-[#f5f5f5]">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {isRecording && (
          <div className="mb-3 flex items-center justify-between px-4 py-3 bg-[#171717] border border-[#262626] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#ef4444] animate-pulse" />
              <span className="text-sm text-[#f5f5f5] font-light">Recording {formatDuration(recordingTime)}</span>
            </div>
            <button onClick={cancelRecording} className="text-[#737373] hover:text-[#ef4444] transition-colors text-xs font-medium">
              Cancel
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors shrink-0 mb-1"
          >
            <Smile size={22} />
          </button>

          <div className="flex-1 bg-[#171717] border border-[#262626] rounded-3xl flex items-center px-4 py-1 min-h-[48px]">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              placeholder="Message..."
              className="flex-1 bg-transparent border-none outline-none text-[#f5f5f5] font-light placeholder:text-[#737373] py-2"
            />
          </div>

          {inputText.trim() ? (
            <button onClick={handleSendText} className="w-12 h-12 rounded-full bg-[#f5f5f5] text-[#0a0a0a] flex items-center justify-center hover:scale-105 transition-transform shrink-0">
              <Send size={20} className="ml-1" />
            </button>
          ) : isRecording ? (
            <button onClick={stopRecording} className="w-12 h-12 rounded-full bg-[#ef4444] text-[#f5f5f5] flex items-center justify-center hover:scale-105 transition-transform shrink-0">
              <Square size={18} />
            </button>
          ) : (
            <button onClick={startRecording} className="w-12 h-12 rounded-full bg-[#262626] text-[#a3a3a3] flex items-center justify-center hover:bg-[#404040] hover:text-[#f5f5f5] transition-colors shrink-0">
              <Mic size={20} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
