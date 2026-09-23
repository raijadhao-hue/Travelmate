import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function Welcome() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    // Optional: Auto-redirect after some time
    // const timer = setTimeout(() => navigate('/home'), 5000);
    // return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-6 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-2xl w-full text-center relative z-10"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500 text-white mb-8 shadow-2xl shadow-emerald-500/20 rotate-3">
          <Compass className="w-10 h-10" />
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
          Welcome to the <br />
          <span className="text-emerald-400 italic font-serif font-light">Community.</span>
        </h1>

        <div className="flex items-center justify-center gap-4 mb-10">
          <div className="h-px w-12 bg-stone-700"></div>
          <div className="flex items-center gap-2 text-emerald-400 font-medium tracking-widest uppercase text-xs">
            <Sparkles className="w-4 h-4" />
            Adventure awaits {profile?.full_name || profile?.username}
          </div>
          <div className="h-px w-12 bg-stone-700"></div>
        </div>

        <p className="text-xl text-stone-400 mb-12 leading-relaxed max-w-lg mx-auto">
          We're so excited to have you here. Travelmate is where your solo journeys turn into shared stories. Ready to meet your first travel buddy?
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/home')}
          className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-stone-900 font-bold rounded-2xl hover:bg-emerald-50 transition-all shadow-2xl shadow-white/10"
        >
          Enter Travelmate
          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </motion.button>

        <div className="mt-16 grid grid-cols-3 gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
          <div className="flex flex-col items-center gap-2">
            <div className="text-2xl font-bold text-white">500+</div>
            <div className="text-[10px] uppercase tracking-widest text-stone-500">Destinations</div>
          </div>
          <div className="flex flex-col items-center gap-2 border-x border-stone-800 px-8">
            <div className="text-2xl font-bold text-white">10k+</div>
            <div className="text-[10px] uppercase tracking-widest text-stone-500">Travelers</div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-2xl font-bold text-white">24/7</div>
            <div className="text-[10px] uppercase tracking-widest text-stone-500">Support</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
