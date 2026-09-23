import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function VerifyAccount() {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (!email) {
      setError('Email not found. Please signup again.');
      return;
    }

    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      });

      if (error) {
        setError(error.message);
        return;
      }

      setMessage('Email verified successfully!');

      setTimeout(() => {
        navigate('/welcome', { replace: true });
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Email not found. Please signup again.');
      return;
    }

    setError('');
    setMessage('');
    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('A new verification code has been sent to your email.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 px-4">

      <div className="sm:mx-auto sm:w-full sm:max-w-md">

        <div className="flex justify-center text-emerald-600 mb-6">
          <Compass className="w-12 h-12" />
        </div>

        <h2 className="text-center text-3xl font-bold text-stone-900">
          Verify your account
        </h2>

        <p className="mt-3 text-center text-sm text-stone-600">
          We sent a 6-digit verification code to
        </p>

        <p className="text-center font-semibold text-emerald-600 mt-1">
          {email || 'your email'}
        </p>

      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">

        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-stone-200">

          <form onSubmit={handleVerify} className="space-y-6">

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-md text-sm">
                {message}
              </div>
            )}

            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-stone-700 mb-2"
              >
                Verification Code
              </label>

              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(
                    e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 6)
                  )
                }
                placeholder="000000"
                className="block w-full rounded-xl border border-stone-300 px-4 py-4 text-center text-2xl font-bold tracking-[10px] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-xl bg-emerald-600 py-3 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            <div className="text-center">

              <p className="text-sm text-stone-500 mb-2">
                Didn't receive the code?
              </p>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend OTP'}
              </button>

            </div>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-sm text-stone-500 hover:text-emerald-600"
              >
                Back to Login
              </Link>
            </div>

          </form>

        </div>

      </div>

    </div>
  );
}