import { motion } from 'motion/react';
import { CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

interface Props {
  onContinue: () => void;
}

export default function Welcome({ onContinue }: Props) {
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-[#f5f5f5] flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full flex flex-col h-full justify-center"
      >
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-12 h-12 rounded-full bg-[#171717] border border-[#262626] flex items-center justify-center mb-8">
            <CheckCircle2 className="w-5 h-5 text-[#f5f5f5]" />
          </div>
          
          <h1 className="text-4xl font-serif font-medium tracking-tight mb-6 leading-tight">
            You're in. <br />
            Welcome to London.
          </h1>
          
          <div className="space-y-6 mb-12">
            <p className="text-[#a3a3a3] text-lg leading-relaxed font-light">
              Your £5 payment is confirmed. You now have lifetime access.
            </p>
            
            <div className="bg-[#171717] border border-[#262626] rounded-2xl p-6 space-y-4">
              <h3 className="text-[#f5f5f5] font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Radical Transparency
              </h3>
              <p className="text-[#a3a3a3] text-sm font-light leading-relaxed">
                London just unlocked at 500 users. However, we only show you people who are <strong>currently active</strong> and have <strong>complete profiles</strong>.
              </p>
              <div className="pt-4 border-t border-[#262626] flex justify-between text-sm">
                <span className="text-[#737373] font-light">Total users</span>
                <span className="text-[#737373]">500</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#737373] font-light">Inactive / Incomplete</span>
                <span className="text-[#737373]">- 220</span>
              </div>
              <div className="flex justify-between text-sm font-medium pt-2">
                <span className="text-[#f5f5f5]">Profiles you will see today</span>
                <span className="text-[#f5f5f5]">280</span>
              </div>
            </div>

            <p className="text-[#737373] text-sm leading-relaxed font-light">
              We don't inflate numbers or show you ghost towns just to keep you swiping. Take your time. Read the prompts. Send a thoughtful like.
            </p>
          </div>
        </div>

        <div className="mt-auto pt-8 pb-12">
          <button 
            onClick={onContinue}
            className="w-full bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-4 px-8 flex items-center justify-between hover:bg-[#e5e5e5] transition-colors active:scale-[0.98]"
          >
            <span>Start exploring</span>
            <ArrowRight className="w-5 h-5 opacity-50" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
