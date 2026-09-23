import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Mail, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // =====================================================
  // EMAIL + PASSWORD LOGIN
  // =====================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        if (
          signInError.message
            .toLowerCase()
            .includes('email not confirmed')
        ) {
          setError(
            'Your email is not verified yet. Please check your email and verify your account before logging in.'
          );
        } else {
          throw signInError;
        }

        return;
      }

      if (data.user) {
        navigate('/home', { replace: true });
      }
    } catch (err: any) {
      console.error('Login error:', err);

      setError(
        err?.message ||
          'Unable to sign in. Please check your email and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // GOOGLE LOGIN
  // =====================================================

  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');
    setGoogleLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/home`,
          },
        });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('Google login error:', err);

      setError(
        err?.message ||
          'Unable to continue with Google.'
      );

      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">

      {/* HEADER */}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">

        <div className="flex justify-center text-emerald-600 mb-6">
          <Compass className="w-12 h-12" />
        </div>

        <h2 className="text-center text-3xl font-bold tracking-tight text-stone-900">
          Welcome back
        </h2>

        <p className="mt-2 text-center text-sm text-stone-600">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-medium text-emerald-600 hover:text-emerald-500"
          >
            Create a new account
          </Link>
        </p>

      </div>

      {/* CARD */}

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">

        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-stone-200">

          {/* GOOGLE */}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 rounded-md border border-stone-300 bg-white py-2.5 px-4 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 transition disabled:opacity-50"
          >

            {/* Google icon */}

            <span className="font-bold text-lg">
              G
            </span>

            {googleLoading
              ? 'Connecting to Google...'
              : 'Continue with Google'}

          </button>

          {/* DIVIDER */}

          <div className="relative my-6">

            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>

            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-stone-400">
                OR
              </span>
            </div>

          </div>

          {/* FORM */}

          <form
            className="space-y-6"
            onSubmit={handleSubmit}
          >

            {/* ERROR */}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* SUCCESS */}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-md text-sm">
                {success}
              </div>
            )}

            {/* EMAIL */}

            <div>

              <label
                htmlFor="email"
                className="block text-sm font-medium text-stone-700"
              >
                Email address
              </label>

              <div className="mt-1 relative">

                <Mail
                  className="absolute left-3 top-2.5 text-stone-400"
                  size={18}
                />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  className="block w-full appearance-none rounded-md border border-stone-300 pl-10 pr-3 py-2 placeholder-stone-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                  placeholder="you@example.com"
                />

              </div>

            </div>

            {/* PASSWORD */}

            <div>

              <div className="flex items-center justify-between">

                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-stone-700"
                >
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                >
                  Forgot password?
                </Link>

              </div>

              <div className="mt-1 relative">

                <Lock
                  className="absolute left-3 top-2.5 text-stone-400"
                  size={18}
                />

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  className="block w-full appearance-none rounded-md border border-stone-300 pl-10 pr-3 py-2 placeholder-stone-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                  placeholder="Enter your password"
                />

              </div>

            </div>

            {/* REMEMBER */}

            <div className="flex items-center">

              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />

              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-stone-900"
              >
                Remember me
              </label>

            </div>

            {/* LOGIN */}

            <button
              type="submit"
              disabled={isLoading || googleLoading}
              className="flex w-full justify-center rounded-md border border-transparent bg-emerald-600 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition"
            >
              {isLoading
                ? 'Signing in...'
                : 'Sign in'}
            </button>

          </form>

          {/* SECURITY INFO */}

          <div className="mt-6 text-center">

            <p className="text-xs text-stone-400">
              Your account is protected by secure authentication.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}