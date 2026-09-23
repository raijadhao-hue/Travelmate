import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  MessageCircle,
  User,
  Heart,
  IndianRupee
} from 'lucide-react';
import {
  Link,
  useNavigate,
  useParams
} from 'react-router-dom';

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  gender: string | null;
  age: number | null;
  preferences: string[] | null;
}

interface Trip {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number | null;
  description: string | null;
}

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] =
    useState<ProfileData | null>(null);

  const [trips, setTrips] =
    useState<Trip[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  // =====================================================
  // FETCH PROFILE
  // =====================================================

  useEffect(() => {
    if (!id) return;

    fetchUserProfile();
  }, [id]);

  const fetchUserProfile = async () => {
    if (!id) return;

    setLoading(true);
    setError('');

    try {

      // =================================================
      // PROFILE
      // =================================================

      const {
        data: profileData,
        error: profileError
      } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          bio,
          gender,
          age,
          preferences
        `)
        .eq('id', id)
        .maybeSingle();

      if (profileError) {
        console.error(
          'Profile error:',
          profileError
        );

        setError(
          'Unable to load this profile.'
        );

        return;
      }

      if (!profileData) {
        setError(
          'User profile not found.'
        );

        return;
      }

      setProfile({
        id: profileData.id,
        full_name:
          profileData.full_name || null,
        email:
          profileData.email || null,
        avatar_url:
          profileData.avatar_url || null,
        bio:
          profileData.bio || null,
        gender:
          profileData.gender || null,
        age:
          profileData.age ?? null,
        preferences:
          Array.isArray(
            profileData.preferences
          )
            ? profileData.preferences
            : []
      });

      // =================================================
      // USER TRIPS
      // =================================================

      const {
        data: tripData,
        error: tripError
      } = await supabase
        .from('trips')
        .select(`
          id,
          destination,
          start_date,
          end_date,
          budget,
          description
        `)
        .eq('user_id', id)
        .order('start_date', {
          ascending: true
        });

      if (tripError) {
        console.error(
          'Trips error:',
          tripError
        );
      }

      setTrips(
        (tripData || []) as Trip[]
      );

    } catch (err) {

      console.error(
        'User profile error:',
        err
      );

      setError(
        'Something went wrong.'
      );

    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // DATE
  // =====================================================

  const formatDate = (
    date: string
  ) => {

    if (!date) return '';

    return new Date(
      date
    ).toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    );
  };

  // =====================================================
  // INITIALS
  // =====================================================

  const getInitials = (
    name: string | null
  ) => {

    if (!name) return 'T';

    const parts =
      name.trim().split(' ');

    if (parts.length === 1) {
      return parts[0]
        .charAt(0)
        .toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1]
        .charAt(0)
    ).toUpperCase();
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">

        <div className="text-center">

          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />

          <p className="font-semibold text-stone-700">
            Loading profile...
          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error || !profile) {

    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">

        <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center max-w-md">

          <User
            size={50}
            className="mx-auto text-stone-300 mb-4"
          />

          <h2 className="text-2xl font-bold text-stone-800">
            Profile not found
          </h2>

          <p className="text-stone-500 mt-2">
            {error ||
              'This user profile could not be loaded.'}
          </p>

          <button
            onClick={() =>
              navigate(-1)
            }
            className="mt-6 bg-emerald-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-emerald-700"
          >
            Go Back
          </button>

        </div>

      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-8">

      <div className="max-w-5xl mx-auto">

        {/* BACK */}

        <button
          onClick={() =>
            navigate(-1)
          }
          className="flex items-center gap-2 text-stone-600 hover:text-emerald-600 font-medium mb-6 transition"
        >

          <ArrowLeft size={20} />

          Back

        </button>

        {/* =================================================
            PROFILE HEADER
        ================================================= */}

        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">

          <div className="h-32 bg-emerald-600" />

          <div className="px-6 md:px-10 pb-8">

            {/* AVATAR */}

            <div className="-mt-16 mb-5">

              <div className="w-32 h-32 rounded-full bg-emerald-100 border-8 border-white shadow-lg overflow-hidden">

                {profile.avatar_url ? (

                  <img
                    src={profile.avatar_url}
                    alt={
                      profile.full_name ||
                      'Traveler'
                    }
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display =
                        'none';
                    }}
                  />

                ) : (

                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-emerald-700">

                    {getInitials(
                      profile.full_name
                    )}

                  </div>

                )}

              </div>

            </div>

            {/* NAME */}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

              <div>

                <h1 className="text-3xl font-bold text-stone-900">

                  {profile.full_name ||
                    'Traveler'}

                </h1>

                <p className="text-stone-500 mt-1">

                  {profile.email ||
                    'TravelMate traveler'}

                </p>

                {/* AGE + GENDER */}

                <div className="flex flex-wrap gap-2 mt-3">

                  {profile.age !==
                    null &&
                    profile.age !==
                      undefined && (

                      <span className="bg-stone-100 text-stone-700 px-3 py-1.5 rounded-full text-sm">

                        Age: {profile.age}

                      </span>
                    )}

                  {profile.gender && (

                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm capitalize">

                      {profile.gender}

                    </span>
                  )}

                </div>

              </div>

              {/* CHAT */}

              {user &&
                user.id !==
                  profile.id && (

                  <Link
                    to={`/chat/${profile.id}`}
                    className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition"
                  >

                    <MessageCircle
                      size={18}
                    />

                    Chat

                  </Link>
                )}

            </div>

            {/* BIO */}

            <div className="mt-6">

              <h2 className="font-bold text-lg text-stone-900 mb-2">
                About
              </h2>

              <p className="text-stone-600 leading-relaxed">

                {profile.bio ||
                  'This traveler has not added a bio yet.'}

              </p>

            </div>

            {/* PREFERENCES */}

            {profile.preferences &&
              profile.preferences.length >
                0 && (

                <div className="mt-7">

                  <h2 className="font-bold text-lg text-stone-900 mb-3">
                    Travel Preferences
                  </h2>

                  <div className="flex flex-wrap gap-2">

                    {profile.preferences.map(
                      (preference) => (

                        <span
                          key={
                            preference
                          }
                          className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2 rounded-full text-sm font-medium"
                        >

                          {preference}

                        </span>
                      )
                    )}

                  </div>

                </div>
              )}

          </div>

        </div>

        {/* =================================================
            TRIPS
        ================================================= */}

        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 md:p-8 mt-8">

          <div className="flex items-center gap-3 mb-6">

            <MapPin
              className="text-emerald-600"
              size={24}
            />

            <div>

              <h2 className="text-2xl font-bold text-stone-900">
                Trips
              </h2>

              <p className="text-sm text-stone-500">
                Trips published by this traveler
              </p>

            </div>

          </div>

          {trips.length === 0 ? (

            <div className="text-center py-10">

              <Calendar
                size={45}
                className="mx-auto text-stone-300 mb-3"
              />

              <p className="text-stone-500">
                No trips published yet.
              </p>

            </div>

          ) : (

            <div className="grid md:grid-cols-2 gap-5">

              {trips.map(
                (trip) => (

                  <div
                    key={trip.id}
                    className="border border-stone-200 rounded-2xl p-5 hover:shadow-md transition"
                  >

                    <div className="flex items-center gap-2 mb-3">

                      <MapPin
                        size={18}
                        className="text-emerald-600"
                      />

                      <h3 className="font-bold text-lg text-stone-900">

                        {
                          trip.destination
                        }

                      </h3>

                    </div>

                    <div className="flex items-center gap-2 text-sm text-stone-600 mb-2">

                      <Calendar
                        size={16}
                      />

                      <span>

                        {formatDate(
                          trip.start_date
                        )}

                        {' - '}

                        {formatDate(
                          trip.end_date
                        )}

                      </span>

                    </div>

                    {trip.budget !==
                      null &&
                      trip.budget !==
                        undefined && (

                        <div className="flex items-center gap-2 text-sm text-stone-600 mb-3">

                          <IndianRupee
                            size={16}
                          />

                          <span>
                            Budget: ₹
                            {Number(
                              trip.budget
                            ).toLocaleString(
                              'en-IN'
                            )}
                          </span>

                        </div>
                      )}

                    <p className="text-sm text-stone-600">

                      {trip.description ||
                        'No description added.'}

                    </p>

                  </div>
                )
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}