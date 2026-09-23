import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Globe, Users, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Auth state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        navigate('/home');
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          await supabase.from('profiles').upsert([{ id: data.user.id, username }]);
        }

        if (data.user && !data.session) {
          setSuccess('Check your email for a verification link!');
        } else {
          navigate('/welcome');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md border-b border-stone-200/50">
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-2xl group cursor-pointer">
          <Compass className="w-8 h-8 group-hover:rotate-45 transition-transform duration-500" />
          <span className="tracking-tighter font-serif italic">Travelmate</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/login" className="text-sm font-bold text-stone-600 hover:text-emerald-600 transition-colors">
            Login
          </Link>
          <Link 
            to="/signup" 
            className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-full hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop" 
              alt="Travel background" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-900/80 via-stone-900/40 to-transparent"></div>
          </div>
          
          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-6 border border-emerald-400/30">
                <Globe className="w-3 h-3" />
                Your Global Adventure Awaits
              </div>
              <h1 className="text-6xl md:text-9xl font-bold text-white mb-8 tracking-tighter leading-[0.85] font-serif">
                Never explore <br />
                <span className="text-emerald-400 italic font-light">alone.</span>
              </h1>
              <p className="text-xl md:text-2xl text-stone-200 mb-12 max-w-lg leading-relaxed font-light opacity-90">
                Connect with like-minded travelers, plan unforgettable trips, and make memories that last a lifetime.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6">
                <Link 
                  to="/signup" 
                  className="group px-10 py-5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-2xl shadow-emerald-600/40 transition-all flex items-center justify-center gap-3 text-lg hover:-translate-y-1"
                >
                  Start Your Journey
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  to="/browse-trips" 
                  className="px-10 py-5 bg-white/10 backdrop-blur-md text-white font-bold rounded-2xl hover:bg-white/20 border border-white/20 transition-all flex items-center justify-center gap-3 text-lg hover:-translate-y-1"
                >
                  Explore Trips
                </Link>
              </div>

              <div className="mt-16 flex items-center gap-8">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-stone-900 overflow-hidden">
                      <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <div className="text-stone-300 text-sm">
                  <span className="text-white font-bold">10,000+</span> travelers already joined
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-stone-900 mb-8 tracking-tight">
                  Designed for the <br />
                  <span className="text-emerald-600">modern explorer.</span>
                </h2>
                <div className="space-y-10">
                  <div className="flex gap-6">
                    <div className="w-14 h-14 shrink-0 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                      <Users className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-stone-900">Smart Matching</h3>
                      <p className="text-stone-600 leading-relaxed">Our algorithm connects you with travelers who share your interests, budget, and travel style.</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="w-14 h-14 shrink-0 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                      <Globe className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-stone-900">Global Destinations</h3>
                      <p className="text-stone-600 leading-relaxed">Discover new places, share itineraries, and build your perfect trip together with our community.</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="w-14 h-14 shrink-0 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                      <Shield className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-stone-900">Safe & Secure</h3>
                      <p className="text-stone-600 leading-relaxed">Verified profiles and secure messaging ensure you can plan your adventures with total peace of mind.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-[40px] overflow-hidden shadow-2xl rotate-3">
                  <img 
                    src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop" 
                    alt="Travelers" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute -bottom-10 -left-10 aspect-square w-64 rounded-[32px] overflow-hidden shadow-2xl -rotate-6 border-8 border-white">
                  <img 
                    src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=1974&auto=format&fit=crop" 
                    alt="Travelers" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-stone-900 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#10b981_0,transparent_50%)]"></div>
          </div>
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight">
              Ready for your next <br />
              <span className="text-emerald-400">great adventure?</span>
            </h2>
            <p className="text-xl text-stone-400 mb-12 max-w-2xl mx-auto">
              Join thousands of travelers who are already planning their next trips. Your perfect travel buddy is just a click away.
            </p>
            <Link 
              to="/signup" 
              className="inline-flex items-center gap-3 px-10 py-5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-2xl shadow-emerald-600/40 transition-all hover:scale-105"
            >
              Get Started for Free
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 bg-white border-t border-stone-200">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:row justify-between items-center gap-8">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xl">
              <Compass className="w-6 h-6" />
              Travelmate
            </div>
            <div className="flex gap-8 text-sm font-medium text-stone-500">
              <a href="#" className="hover:text-emerald-600">Privacy</a>
              <a href="#" className="hover:text-emerald-600">Terms</a>
              <a href="#" className="hover:text-emerald-600">Contact</a>
            </div>
            <div className="text-sm text-stone-400">
              © 2026 Travelmate. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
