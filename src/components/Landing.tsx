import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Check, MapPin, Bell, Share, Lock, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../supabase';

// TODO: Replace with your real Stripe publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface Props {
  onPay: () => void;
  userId: string | null;
}

type City = {
  id: string;
  name: string;
  count: number;
  required: number;
  isLive: boolean;
};

const MOCK_CITIES: City[] = [
  { id: 'lon', name: 'London', count: 542, required: 500, isLive: true },
  { id: 'man', name: 'Manchester', count: 312, required: 500, isLive: false },
  { id: 'bri', name: 'Bristol', count: 89, required: 500, isLive: false },
  { id: 'nyc', name: 'New York', count: 498, required: 500, isLive: false },
];

type FlowState = 'intro1' | 'intro2' | 'city_select' | 'waitlist' | 'paywall';

export default function Landing({ onPay, userId }: Props) {
  const [flowState, setFlowState] = useState<FlowState>('intro1');
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [cities, setCities] = useState<City[]>(MOCK_CITIES);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // For prototype: Simulate a city going live
  const simulateLaunch = () => {
    if (!selectedCity) return;
    setCities(cities.map(c => c.id === selectedCity.id ? { ...c, count: 500, isLive: true } : c));
    setSelectedCity({ ...selectedCity, count: 500, isLive: true });
    setTimeout(() => setFlowState('paywall'), 1500);
  };

  /**
   * Handle Stripe Checkout payment.
   * TODO: Configure a Stripe Price ID in the Stripe Dashboard and replace the placeholder below.
   * TODO: Set up a Stripe webhook to listen for checkout.session.completed events
   *       and update the user's is_paid field in Supabase automatically on the backend.
   * For now, this uses redirectToCheckout on the client side.
   * After successful payment redirect, update is_paid in Supabase profiles.
   */
  const handleStripePayment = async () => {
    setPaymentError(null);
    setPaymentLoading(true);

    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load. Check your publishable key.');
      }

      // TODO: Replace 'price_XXXXXXXXXXXXXX' with your actual Stripe Price ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (stripe as any).redirectToCheckout({
        lineItems: [{ price: 'price_XXXXXXXXXXXXXX', quantity: 1 }],
        mode: 'payment',
        successUrl: `${window.location.origin}?payment=success`,
        cancelUrl: `${window.location.origin}?payment=cancelled`,
        clientReferenceId: userId ?? undefined,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setPaymentError(message);
      setPaymentLoading(false);
    }
  };

  // Check for payment success on return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success' && userId) {
      // Update is_paid in Supabase
      supabase
        .from('profiles')
        .update({ is_paid: true })
        .eq('id', userId)
        .then(() => {
          // Clean up URL params
          window.history.replaceState({}, '', window.location.pathname);
          onPay();
        });
    }
  }, [userId, onPay]);

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    if (city.isLive) {
      setFlowState('paywall');
    } else {
      setFlowState('waitlist');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-[#f5f5f5] flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      <AnimatePresence mode="wait">
        
        {/* INTRO 1: The Philosophy */}
        {flowState === 'intro1' && (
          <motion.div 
            key="intro1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-md w-full flex flex-col h-full justify-center"
          >
            <div className="flex-1 flex flex-col justify-center">
              <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight mb-6 leading-tight">
                Welcome to Lifetime.
              </h1>
              <p className="text-[#a3a3a3] text-lg mb-12 leading-relaxed font-light">
                A dating app designed to be deleted, without charging you every month until you do.
              </p>
            </div>
            <div className="mt-auto pt-8 pb-12">
              <button 
                onClick={() => setFlowState('intro2')}
                className="w-full bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-4 px-8 flex items-center justify-between hover:bg-[#e5e5e5] transition-colors active:scale-[0.98]"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5 opacity-50" />
              </button>
            </div>
          </motion.div>
        )}

        {/* INTRO 2: The Catch (Waitlist) */}
        {flowState === 'intro2' && (
          <motion.div 
            key="intro2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-md w-full flex flex-col h-full justify-center"
          >
            <div className="flex-1 flex flex-col justify-center">
              <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight mb-6 leading-tight">
                No empty rooms.
              </h1>
              <p className="text-[#a3a3a3] text-lg mb-12 leading-relaxed font-light">
                Dating apps only work when there are enough people. We only unlock a city once 500 people are on the waitlist.
              </p>
            </div>
            <div className="mt-auto pt-8 pb-12">
              <button 
                onClick={() => setFlowState('city_select')}
                className="w-full bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-4 px-8 flex items-center justify-between hover:bg-[#e5e5e5] transition-colors active:scale-[0.98]"
              >
                <span>Find your city</span>
                <MapPin className="w-5 h-5 opacity-50" />
              </button>
            </div>
          </motion.div>
        )}

        {/* CITY SELECT */}
        {flowState === 'city_select' && (
          <motion.div 
            key="city_select"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-md w-full flex flex-col h-full pt-20"
          >
            <h1 className="text-3xl font-serif font-medium tracking-tight mb-2">
              Where are you?
            </h1>
            <p className="text-[#737373] mb-8 font-light">Select your city to check availability.</p>
            
            <div className="space-y-3">
              {cities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city)}
                  className="w-full flex items-center justify-between p-5 rounded-2xl border border-[#262626] bg-[#0a0a0a] hover:bg-[#171717] transition-colors text-left group"
                >
                  <div>
                    <span className="block text-lg font-medium text-[#f5f5f5] mb-1">{city.name}</span>
                    <span className="block text-sm text-[#737373] font-light">
                      {city.isLive ? 'Live now' : `${city.count} waiting`}
                    </span>
                  </div>
                  {city.isLive ? (
                    <div className="w-8 h-8 rounded-full bg-[#f5f5f5] text-[#0a0a0a] flex items-center justify-center">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full border border-[#262626] text-[#737373] flex items-center justify-center group-hover:border-[#525252] group-hover:text-[#a3a3a3] transition-colors">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* WAITLIST */}
        {flowState === 'waitlist' && selectedCity && (
          <motion.div 
            key="waitlist"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-md w-full flex flex-col h-full justify-center"
          >
            <div className="flex-1 flex flex-col justify-center">
              <div className="w-12 h-12 rounded-full border border-[#262626] flex items-center justify-center mb-8">
                <Lock className="w-5 h-5 text-[#a3a3a3]" />
              </div>
              
              <h1 className="text-4xl font-serif font-medium tracking-tight mb-4 leading-tight">
                You're on the list.
              </h1>
              <p className="text-[#a3a3a3] text-lg mb-12 leading-relaxed font-light">
                {selectedCity.name} is growing. We'll notify you the moment we hit {selectedCity.required} people and unlock the doors.
              </p>

              {/* Progress Indicator */}
              <div className="mb-12">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-[#f5f5f5] font-medium">{selectedCity.count}</span>
                  <span className="text-[#737373] font-light">{selectedCity.required} required</span>
                </div>
                <div className="h-1 w-full bg-[#171717] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(selectedCity.count / selectedCity.required) * 100}%` }}
                    transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                    className="h-full bg-[#f5f5f5]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-auto pt-8 pb-12 space-y-4">
              <button className="w-full bg-[#171717] text-[#f5f5f5] font-medium rounded-full py-4 px-8 flex items-center justify-center gap-2 hover:bg-[#262626] transition-colors border border-[#262626]">
                <Share className="w-4 h-4" />
                <span>Invite friends to speed it up</span>
              </button>
              
              {/* Prototype Only: Simulate Launch */}
              <button 
                onClick={simulateLaunch}
                className="w-full text-[#737373] text-sm py-4 hover:text-[#a3a3a3] transition-colors font-light"
              >
                [Prototype] Simulate city going live
              </button>
            </div>
          </motion.div>
        )}

        {/* PAYWALL (Only shown when city is live) */}
        {flowState === 'paywall' && selectedCity && (
          <motion.div 
            key="paywall"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-md w-full flex flex-col h-full justify-center"
          >
            <div className="flex-1 flex flex-col justify-center">
              <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-8">
                <MapPin className="w-5 h-5 text-[#0a0a0a]" />
              </div>
              
              <h1 className="text-4xl font-serif font-medium tracking-tight mb-4 leading-tight">
                {selectedCity.name} is live.
              </h1>
              <p className="text-[#a3a3a3] text-lg mb-12 leading-relaxed font-light">
                Over {selectedCity.count} people are waiting inside. Pay once, and never pay us again.
              </p>

              <div className="mb-12 space-y-4">
                <div className="flex items-baseline gap-3 mb-8 border-b border-[#262626] pb-8">
                  <span className="text-6xl font-serif">£5</span>
                  <span className="text-[#a3a3a3] font-light">one-time payment</span>
                </div>
                <ul className="space-y-4">
                  <FeatureItem text="Lifetime access to all features" />
                  <FeatureItem text="No hidden fees or premium tiers" />
                  <FeatureItem text="See everyone who likes you" />
                </ul>
              </div>
            </div>

            <div className="mt-auto pt-8 pb-12">
              <button 
                onClick={() => alert('Payment coming soon!')}
                className="w-full bg-[#f5f5f5] text-[#0a0a0a] font-medium rounded-full py-4 px-8 flex items-center justify-center gap-2 hover:bg-[#e5e5e5] transition-colors active:scale-[0.98]"
              >
                <span>Unlock Lifetime</span>
              </button>
              
              {paymentError && (
                <p className="mt-4 text-xs text-[#ef4444] text-center font-light leading-relaxed">
                  {paymentError}
                </p>
              )}

              <p className="mt-6 text-xs text-[#737373] text-center font-light leading-relaxed">
                Secure payment via Stripe. <br/>
                Cancel anytime within 14 days for a full refund.
              </p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-4 text-[#d4d4d4] font-light">
      <div className="w-6 h-6 rounded-full bg-[#262626] flex items-center justify-center shrink-0">
        <Check className="w-3.5 h-3.5 text-[#f5f5f5]" />
      </div>
      <span>{text}</span>
    </li>
  );
}


