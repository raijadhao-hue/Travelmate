import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Signup() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // ==============================
  // SIGNUP STATES
  // ==============================

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ==============================
  // OTP STATES
  // ==============================

  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(60);

  // ==============================
  // UI STATES
  // ==============================

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // ==============================
  // REDIRECT IF ALREADY LOGGED IN
  // ==============================

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // ==============================
  // OTP TIMER
  // ==============================

  useEffect(() => {
    if (!showOtp || resendTimer <= 0) return;

    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [showOtp, resendTimer]);

  // ==============================
  // SIGNUP
  // ==============================

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    // Validation
    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // ==============================
      // CREATE SUPABASE ACCOUNT
      // ==============================

      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

      if (signUpError) {
        throw signUpError;
      }

      if (!data.user) {
        throw new Error('Unable to create account.');
      }

      // Save username temporarily
      localStorage.setItem(
        'travelmate_signup_username',
        username.trim()
      );

      localStorage.setItem(
        'travelmate_signup_email',
        email.trim()
      );

      // ==============================
      // SHOW OTP SCREEN
      // ==============================

      setShowOtp(true);
      setOtp('');
      setResendTimer(60);

      setSuccess(
        'Verification code sent! Please check your email.'
      );

    } catch (err: any) {
      console.error('Signup error:', err);

      setError(
        err?.message || 'Signup failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ==============================
  // VERIFY OTP
  // ==============================

  const handleVerifyOtp = async () => {
    setError('');
    setSuccess('');

    if (otp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const savedEmail =
        localStorage.getItem('travelmate_signup_email') ||
        email;

      const savedUsername =
        localStorage.getItem('travelmate_signup_username') ||
        username;

      // ==============================
      // VERIFY EMAIL OTP
      // ==============================

      const { data, error: verifyError } =
        await supabase.auth.verifyOtp({
          email: savedEmail,
          token: otp,
          type: 'signup',
        });

      if (verifyError) {
        throw verifyError;
      }

      if (!data.user) {
        throw new Error(
          'Email verification failed.'
        );
      }

      // ==============================
      // CREATE PROFILE AFTER VERIFICATION
      // ==============================

      const { error: profileError } =
        await supabase
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              username: savedUsername,
              email: savedEmail,
              full_name: savedUsername,
              bio: '',
              preferences: [],
              avatar_url: null,
            },
            {
              onConflict: 'id',
            }
          );

      if (profileError) {
        console.error(
          'Profile creation error:',
          profileError
        );
      }

      // Remove temporary data
      localStorage.removeItem(
        'travelmate_signup_username'
      );

      localStorage.removeItem(
        'travelmate_signup_email'
      );

      setSuccess(
        'Email verified successfully! 🎉'
      );

      // Go to welcome page
      setTimeout(() => {
        navigate('/welcome');
      }, 1200);

    } catch (err: any) {
      console.error(
        'OTP verification error:',
        err
      );

      setError(
        err?.message ||
        'Invalid or expired verification code.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ==============================
  // RESEND OTP
  // ==============================

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    setError('');
    setSuccess('');
    setIsResending(true);

    try {
      const savedEmail =
        localStorage.getItem('travelmate_signup_email') ||
        email;

      if (!savedEmail) {
        throw new Error('Email not found.');
      }

      const { error } =
        await supabase.auth.resend({
          type: 'signup',
          email: savedEmail,
        });

      if (error) {
        throw error;
      }

      setResendTimer(60);
      setSuccess(
        'A new verification code has been sent.'
      );

    } catch (err: any) {
      console.error(
        'Resend OTP error:',
        err
      );

      setError(
        err?.message ||
        'Could not resend verification code.'
      );
    } finally {
      setIsResending(false);
    }
  };

  // ==============================
  // BACK TO SIGNUP
  // ==============================

  const handleBackToSignup = () => {
    setShowOtp(false);
    setOtp('');
    setError('');
    setSuccess('');
  };

  // ==============================
  // OTP SCREEN
  // ==============================

  if (showOtp) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">

        <div className="sm:mx-auto sm:w-full sm:max-w-md">

          {/* LOGO */}

          <div className="flex justify-center text-emerald-600 mb-6">
            <Compass className="w-12 h-12" />
          </div>

          {/* ICON */}

          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <Mail
                className="text-emerald-600"
                size={32}
              />
            </div>
          </div>

          <h2 className="text-center text-3xl font-bold text-stone-900">
            Verify your email
          </h2>

          <p className="mt-3 text-center text-sm text-stone-600">
            We sent a 6-digit verification code to
          </p>

          <p className="mt-1 text-center font-semibold text-stone-900">
            {email}
          </p>

        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">

          <div className="bg-white py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-stone-200">

            {/* ERROR */}

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm font-medium mb-5">
                {error}
              </div>
            )}

            {/* SUCCESS */}

            {success && (
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-md text-sm font-medium mb-5">
                {success}
              </div>
            )}

            {/* OTP */}

            <div>

              <label
                htmlFor="otp"
                className="block text-sm font-medium text-stone-700 text-center"
              >
                Enter verification code
              </label>

              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => {
                  const value =
                    e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 6);

                  setOtp(value);
                }}
                placeholder="000000"
                className="mt-3 block w-full rounded-xl border border-stone-300 px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

            </div>

            {/* VERIFY BUTTON */}

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={
                isLoading ||
                otp.length !== 6
              }
              className="mt-6 flex w-full justify-center items-center gap-2 rounded-xl bg-emerald-600 py-3 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
            >

              <CheckCircle size={18} />

              {isLoading
                ? 'Verifying...'
                : 'Verify Email'}

            </button>

            {/* RESEND */}

            <div className="mt-5 text-center">

              {resendTimer > 0 ? (

                <p className="text-sm text-stone-500">
                  Resend code in{' '}
                  <span className="font-semibold text-emerald-600">
                    {resendTimer}s
                  </span>
                </p>

              ) : (

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                >
                  {isResending
                    ? 'Sending...'
                    : 'Resend verification code'}
                </button>

              )}

            </div>

            {/* BACK */}

            <button
              type="button"
              onClick={handleBackToSignup}
              className="mt-6 flex w-full justify-center items-center gap-2 text-sm text-stone-500 hover:text-stone-800"
            >
              <ArrowLeft size={16} />
              Back to signup
            </button>

          </div>

        </div>

      </div>
    );
  }

  // ==============================
  // NORMAL SIGNUP SCREEN
  // ==============================

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">

      <div className="sm:mx-auto sm:w-full sm:max-w-md">

        <div className="flex justify-center text-emerald-600 mb-6">
          <Compass className="w-12 h-12" />
        </div>

        <h2 className="text-center text-3xl font-bold tracking-tight text-stone-900">
          Create your account
        </h2>

        <p className="mt-2 text-center text-sm text-stone-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-emerald-600 hover:text-emerald-500"
          >
            Sign in
          </Link>
        </p>

      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">

        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-stone-200">

          <form
            className="space-y-6"
            onSubmit={handleSignup}
          >

            {/* ERROR */}

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm font-medium">
                {error}
              </div>
            )}

            {/* USERNAME */}

            <div>

              <label
                htmlFor="username"
                className="block text-sm font-medium text-stone-700"
              >
                Username
              </label>

              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                placeholder="Enter username"
              />

            </div>

            {/* EMAIL */}

            <div>

              <label
                htmlFor="email"
                className="block text-sm font-medium text-stone-700"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                placeholder="you@example.com"
              />

            </div>

            {/* PASSWORD */}

            <div>

              <label
                htmlFor="password"
                className="block text-sm font-medium text-stone-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                placeholder="Minimum 6 characters"
              />

            </div>

            {/* CONFIRM PASSWORD */}

            <div>

              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-stone-700"
              >
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                placeholder="Enter password again"
              />

            </div>

            {/* SIGNUP */}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-md bg-emerald-600 py-3 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
            >

              {isLoading
                ? 'Creating account...'
                : 'Create Account'}

            </button>

          </form>

        </div>

      </div>

    </div>
  );
}