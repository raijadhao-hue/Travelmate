import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  IndianRupee,
  MessageCircle,
  User,
  Heart,
  Search,
  Plane,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Navigation,
  LocateFixed,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Trip {
  id: string;
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number | null;
  description: string | null;
}

interface Buddy {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  gender: string | null;
  age: number | null;
  is_verified: boolean;
  preferences: string[];
  completedTrips: number;
  trip?: Trip | null;
  compatibility: number;
}

type AgeFilterType = 'any' | 'specific' | 'range';

export default function BuddyFinder() {
  const { user } = useAuth();

  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // =====================================================
  // AGE FILTER
  // =====================================================

  const [showFilter, setShowFilter] = useState(false);

  const [ageFilterType, setAgeFilterType] =
    useState<AgeFilterType>('any');

  const [specificAge, setSpecificAge] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');

  const [appliedAgeFilterType, setAppliedAgeFilterType] =
    useState<AgeFilterType>('any');

  const [appliedSpecificAge, setAppliedSpecificAge] =
    useState('');

  const [appliedMinAge, setAppliedMinAge] =
    useState('');

  const [appliedMaxAge, setAppliedMaxAge] =
    useState('');

  // =====================================================
  // NEARBY BUDDIES
  // =====================================================

  const [nearbyMode, setNearbyMode] = useState(false);

  const [nearbyRadius, setNearbyRadius] = useState(10);

  const [nearbyLoading, setNearbyLoading] =
    useState(false);

  const [nearbyDistances, setNearbyDistances] =
    useState<Record<string, number>>({});

  const [locationDetected, setLocationDetected] =
    useState(false);

  const [locationError, setLocationError] =
    useState('');

  // =====================================================
  // FETCH ON LOAD
  // =====================================================

  useEffect(() => {
    if (!user) return;

    fetchBuddies();
  }, [user]);

  // =====================================================
  // FETCH BUDDIES
  // =====================================================

  const fetchBuddies = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      // =================================================
      // CURRENT USER PROFILE
      // =================================================

      const {
        data: myProfile,
        error: myProfileError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          gender,
          age,
          preferences
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (myProfileError) {
        console.error(
          'Current profile error:',
          myProfileError
        );
      }

      // =================================================
      // CURRENT USER TRIPS
      // =================================================

      const {
        data: myTrips,
        error: myTripsError,
      } = await supabase
        .from('trips')
        .select(`
          id,
          user_id,
          destination,
          start_date,
          end_date,
          budget,
          description
        `)
        .eq('user_id', user.id)
        .order('created_at', {
          ascending: false,
        });

      if (myTripsError) {
        console.error(
          'My trips error:',
          myTripsError
        );
      }

      // =================================================
      // ALL OTHER PROFILES
      // =================================================

      const {
        data: profiles,
        error: profilesError,
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
          is_verified,
          preferences
        `)
        .neq('id', user.id);

      if (profilesError) {
        console.error(
          'Profiles error:',
          profilesError
        );

        setError(
          'Unable to load travelers. Please try again.'
        );

        setBuddies([]);
        return;
      }

      // =================================================
      // OTHER USERS' TRIPS
      // =================================================

      const otherUserIds =
        (profiles || []).map(
          (profile: any) => profile.id
        );

      let otherTrips: Trip[] = [];

      if (otherUserIds.length > 0) {
        const {
          data: trips,
          error: tripsError,
        } = await supabase
          .from('trips')
          .select(`
            id,
            user_id,
            destination,
            start_date,
            end_date,
            budget,
            description
          `)
          .in('user_id', otherUserIds)
          .order('start_date', {
            ascending: true,
          });

        if (tripsError) {
          console.error(
            'Other users trips error:',
            tripsError
          );
        } else {
          otherTrips = trips || [];
        }
      }

      // =================================================
      // CURRENT USER PREFERENCES
      // =================================================

      const myPreferences =
        Array.isArray(myProfile?.preferences)
          ? myProfile.preferences
          : [];

      // =================================================
      // CURRENT USER BEST TRIP
      // =================================================

      const myTrip =
        myTrips && myTrips.length > 0
          ? myTrips[0]
          : null;

      // =================================================
      // TODAY
      // =================================================

      const today = new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      // =================================================
      // CREATE BUDDY LIST
      // =================================================

      const formattedBuddies: Buddy[] =
        (profiles || []).map(
          (profile: any) => {

            // ---------------------------------------------
            // ALL USER TRIPS
            // ---------------------------------------------

            const userTrips =
              otherTrips.filter(
                (trip) =>
                  trip.user_id ===
                  profile.id
              );

            // ---------------------------------------------
            // COMPLETED TRIPS
            // ---------------------------------------------

            const completedTrips =
              userTrips.filter(
                (trip) => {

                  if (!trip.end_date) {
                    return false;
                  }

                  const endDate =
                    new Date(
                      trip.end_date
                    );

                  endDate.setHours(
                    0,
                    0,
                    0,
                    0
                  );

                  return endDate < today;
                }
              ).length;

            // ---------------------------------------------
            // FUTURE / UPCOMING TRIPS
            // ---------------------------------------------

            const upcomingTrips =
              userTrips
                .filter(
                  (trip) => {

                    if (!trip.end_date) {
                      return true;
                    }

                    const endDate =
                      new Date(
                        trip.end_date
                      );

                    endDate.setHours(
                      0,
                      0,
                      0,
                      0
                    );

                    return endDate >= today;
                  }
                )
                .sort(
                  (a, b) =>
                    new Date(
                      a.start_date
                    ).getTime() -
                    new Date(
                      b.start_date
                    ).getTime()
                );

            // ---------------------------------------------
            // BEST UPCOMING TRIP
            // ---------------------------------------------

            let bestTrip =
              upcomingTrips.length > 0
                ? upcomingTrips[0]
                : null;

            let bestScore = 0;

            // ---------------------------------------------
            // COMPATIBILITY
            // ---------------------------------------------

            upcomingTrips.forEach(
              (trip) => {

                let score = 0;

                // DESTINATION
                if (
                  myTrip?.destination &&
                  trip.destination
                ) {
                  const myDestination =
                    myTrip.destination
                      .toLowerCase()
                      .trim();

                  const otherDestination =
                    trip.destination
                      .toLowerCase()
                      .trim();

                  if (
                    myDestination ===
                    otherDestination
                  ) {
                    score += 40;
                  }
                }

                // DATES
                if (
                  myTrip?.start_date &&
                  myTrip?.end_date &&
                  trip.start_date &&
                  trip.end_date
                ) {
                  const myStart =
                    new Date(
                      myTrip.start_date
                    ).getTime();

                  const myEnd =
                    new Date(
                      myTrip.end_date
                    ).getTime();

                  const tripStart =
                    new Date(
                      trip.start_date
                    ).getTime();

                  const tripEnd =
                    new Date(
                      trip.end_date
                    ).getTime();

                  const datesOverlap =
                    tripStart <= myEnd &&
                    tripEnd >= myStart;

                  if (datesOverlap) {
                    score += 30;
                  }
                }

                // PREFERENCES
                const otherPreferences =
                  Array.isArray(
                    profile.preferences
                  )
                    ? profile.preferences
                    : [];

                const commonPreferences =
                  myPreferences.filter(
                    (pref: string) =>
                      otherPreferences.includes(
                        pref
                      )
                  );

                score += Math.min(
                  commonPreferences.length * 5,
                  20
                );

                // BUDGET
                if (
                  myTrip?.budget &&
                  trip.budget
                ) {
                  const myBudget =
                    Number(
                      myTrip.budget
                    );

                  const otherBudget =
                    Number(
                      trip.budget
                    );

                  const difference =
                    Math.abs(
                      myBudget -
                      otherBudget
                    );

                  const average =
                    (myBudget +
                      otherBudget) / 2;

                  if (
                    average > 0 &&
                    difference /
                      average <=
                      0.2
                  ) {
                    score += 10;
                  }
                }

                // SAVE BEST TRIP
                if (
                  score >
                  bestScore
                ) {
                  bestScore = score;
                  bestTrip = trip;
                }
              }
            );

            return {
              id: profile.id,

              full_name:
                profile.full_name ||
                null,

              email:
                profile.email ||
                null,

              avatar_url:
                profile.avatar_url ||
                null,

              bio:
                profile.bio ||
                null,

              gender:
                profile.gender ||
                null,

              age:
                profile.age ??
                null,

              is_verified:
                profile.is_verified === true,

              preferences:
                Array.isArray(
                  profile.preferences
                )
                  ? profile.preferences
                  : [],

              completedTrips,

              trip: bestTrip,

              compatibility:
                myTrip &&
                upcomingTrips.length > 0
                  ? Math.min(
                      bestScore,
                      100
                    )
                  : 0,
            };
          }
        );

      // =================================================
      // SORT
      // =================================================

      formattedBuddies.sort(
        (a, b) => {

          if (
            b.compatibility !==
            a.compatibility
          ) {
            return (
              b.compatibility -
              a.compatibility
            );
          }

          return (
            b.completedTrips -
            a.completedTrips
          );
        }
      );

      setBuddies(
        formattedBuddies
      );

    } catch (err) {

      console.error(
        'BuddyFinder error:',
        err
      );

      setError(
        'Something went wrong while finding travel buddies.'
      );

    } finally {

      setLoading(false);
    }
  };

  // =====================================================
  // DETECT CURRENT LOCATION
  // =====================================================

  const detectCurrentLocation =
    (): Promise<{
      latitude: number;
      longitude: number;
      accuracy: number;
    }> => {

      return new Promise(
        (resolve, reject) => {

          if (
            !navigator.geolocation
          ) {
            reject(
              new Error(
                'Location is not supported by this browser.'
              )
            );

            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {

              resolve({
                latitude:
                  position.coords
                    .latitude,

                longitude:
                  position.coords
                    .longitude,

                accuracy:
                  position.coords
                    .accuracy,
              });
            },

            (error) => {

              let message =
                'Unable to detect your location.';

              if (
                error.code === 1
              ) {
                message =
                  'Location permission was denied. Please allow location access in your browser.';
              }

              if (
                error.code === 2
              ) {
                message =
                  'Your location could not be determined. Please try again.';
              }

              if (
                error.code === 3
              ) {
                message =
                  'Location request timed out. Please try again.';
              }

              reject(
                new Error(message)
              );
            },

            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            }
          );
        }
      );
    };

  // =====================================================
  // FIND NEARBY BUDDIES
  // =====================================================

  const findNearbyBuddies = async (
    radius: number = nearbyRadius
  ) => {

    if (!user) return;

    setNearbyLoading(true);
    setLocationError('');

    try {

      // ---------------------------------------------
      // GET CURRENT LOCATION
      // ---------------------------------------------

      const location =
        await detectCurrentLocation();

      // ---------------------------------------------
      // SAVE CURRENT USER LOCATION
      // ---------------------------------------------

      const {
        error: locationSaveError,
      } = await supabase
        .from('user_locations')
        .upsert(
          {
            user_id: user.id,

            latitude:
              location.latitude,

            longitude:
              location.longitude,

            accuracy:
              location.accuracy,

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              'user_id',
          }
        );

      if (locationSaveError) {
        throw locationSaveError;
      }

      setLocationDetected(true);

      // ---------------------------------------------
      // FIND NEARBY USERS
      // ---------------------------------------------

      const {
        data,
        error: nearbyError,
      } = await supabase.rpc(
        'get_nearby_buddies',
        {
          p_radius_km: radius,
        }
      );

      if (nearbyError) {
        throw nearbyError;
      }

      // ---------------------------------------------
      // CREATE DISTANCE MAP
      // ---------------------------------------------

      const distanceMap:
        Record<string, number> = {};

      (data || []).forEach(
        (item: any) => {

          distanceMap[
            item.user_id
          ] = Number(
            item.distance_km
          );
        }
      );

      setNearbyDistances(
        distanceMap
      );

      setNearbyMode(true);

    } catch (error: any) {

      console.error(
        'Nearby location error:',
        error
      );

      setLocationError(
        error?.message ||
        'Unable to find nearby travelers.'
      );

      setNearbyMode(false);

    } finally {

      setNearbyLoading(false);
    }
  };

  // =====================================================
  // CLEAR NEARBY MODE
  // =====================================================

  const clearNearbyMode = () => {

    setNearbyMode(false);

    setNearbyDistances({});

    setLocationError('');

  };

  // =====================================================
  // APPLY AGE FILTER
  // =====================================================

  const applyFilter = () => {

    setAppliedAgeFilterType(
      ageFilterType
    );

    setAppliedSpecificAge(
      specificAge
    );

    setAppliedMinAge(
      minAge
    );

    setAppliedMaxAge(
      maxAge
    );

    setShowFilter(false);
  };

  // =====================================================
  // CLEAR AGE FILTER
  // =====================================================

  const clearFilter = () => {

    setAgeFilterType('any');
    setSpecificAge('');
    setMinAge('');
    setMaxAge('');

    setAppliedAgeFilterType('any');
    setAppliedSpecificAge('');
    setAppliedMinAge('');
    setAppliedMaxAge('');

    setShowFilter(false);
  };

  // =====================================================
  // SEARCH + AGE + NEARBY FILTER
  // =====================================================

  const filteredBuddies =
    buddies.filter(
      (buddy) => {

        const text =
          search
            .toLowerCase()
            .trim();

        const searchMatch =
          !text ||
          Boolean(
            buddy.full_name
              ?.toLowerCase()
              .includes(text) ||

            buddy.email
              ?.toLowerCase()
              .includes(text) ||

            buddy.gender
              ?.toLowerCase()
              .includes(text) ||

            buddy.trip?.destination
              ?.toLowerCase()
              .includes(text) ||

            buddy.bio
              ?.toLowerCase()
              .includes(text) ||

            buddy.age
              ?.toString()
              .includes(text)
          );

        if (!searchMatch) {
          return false;
        }

        // =================================================
        // NEARBY FILTER
        // =================================================

        if (nearbyMode) {

          if (
            nearbyDistances[
              buddy.id
            ] === undefined
          ) {
            return false;
          }
        }

        // =================================================
        // AGE FILTER
        // =================================================

        if (
          appliedAgeFilterType ===
          'any'
        ) {
          return true;
        }

        if (
          buddy.age === null ||
          buddy.age === undefined
        ) {
          return false;
        }

        // SPECIFIC AGE
        if (
          appliedAgeFilterType ===
          'specific'
        ) {

          if (
            !appliedSpecificAge
          ) {
            return true;
          }

          return (
            buddy.age ===
            Number(
              appliedSpecificAge
            )
          );
        }

        // AGE RANGE
        if (
          appliedAgeFilterType ===
          'range'
        ) {

          const minimum =
            appliedMinAge
              ? Number(
                  appliedMinAge
                )
              : 0;

          const maximum =
            appliedMaxAge
              ? Number(
                  appliedMaxAge
                )
              : 100;

          return (
            buddy.age >= minimum &&
            buddy.age <= maximum
          );
        }

        return true;
      }
    );

  // =====================================================
  // SORT NEARBY USERS BY DISTANCE
  // =====================================================

  const displayBuddies =
    nearbyMode
      ? [...filteredBuddies].sort(
          (a, b) =>
            (nearbyDistances[
              a.id
            ] ?? Infinity) -
            (nearbyDistances[
              b.id
            ] ?? Infinity)
        )
      : filteredBuddies;

  // =====================================================
  // CHECK ACTIVE FILTER
  // =====================================================

  const isFilterActive =
    appliedAgeFilterType !==
    'any';

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDate = (
    date: string
  ) => {

    if (!date) {
      return '';
    }

    return new Date(
      date
    ).toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  // =====================================================
  // INITIALS
  // =====================================================

  const getInitials = (
    name: string | null
  ) => {

    if (!name) {
      return 'T';
    }

    const parts =
      name
        .trim()
        .split(/\s+/);

    if (
      parts.length === 1
    ) {

      return parts[0]
        .charAt(0)
        .toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[
        parts.length - 1
      ].charAt(0)
    ).toUpperCase();
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (
    !user ||
    loading
  ) {

    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">

        <div className="text-center">

          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />

          <p className="text-lg font-semibold text-stone-700">
            Finding your travel buddies...
          </p>

          <p className="text-sm text-stone-500 mt-1">
            Looking for compatible travelers
          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-8">

      <div className="max-w-7xl mx-auto">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

            <div>

              <h1 className="text-4xl font-bold text-stone-900">
                Find Your Travel Buddy
              </h1>

              <p className="text-stone-500 mt-2">
                Discover travelers who share
                your travel interests.
              </p>

            </div>

            <div className="flex items-center gap-3 flex-wrap">

              {/* =================================================
                  NEARBY BUTTON
              ================================================= */}

              <button
                type="button"
                onClick={() => {

                  if (nearbyMode) {
                    clearNearbyMode();
                  } else {
                    findNearbyBuddies(
                      nearbyRadius
                    );
                  }

                }}
                disabled={
                  nearbyLoading
                }
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl border font-semibold transition ${
                  nearbyMode
                    ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-400 hover:text-emerald-600'
                }`}
              >

                {nearbyLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />

                    Detecting...
                  </>
                ) : (
                  <>
                    <LocateFixed size={19} />

                    {nearbyMode
                      ? 'Nearby Active'
                      : 'Nearby Buddies'}
                  </>
                )}

              </button>

              {/* =================================================
                  FILTER BUTTON
              ================================================= */}

              <button
                type="button"
                onClick={() =>
                  setShowFilter(
                    !showFilter
                  )
                }
                className={`relative inline-flex items-center gap-2 px-5 py-3 rounded-2xl border font-semibold transition ${
                  isFilterActive
                    ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-400 hover:text-emerald-600'
                }`}
              >

                <SlidersHorizontal
                  size={19}
                />

                Filter

                {isFilterActive && (
                  <span className="w-2 h-2 bg-white rounded-full" />
                )}

              </button>

              {/* =================================================
                  TRAVELER COUNT
              ================================================= */}

              <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-2xl px-4 py-3 shadow-sm">

                <Heart
                  size={20}
                  className="text-emerald-600"
                />

                <span className="font-semibold text-stone-700">
                  {displayBuddies.length}{' '}
                  Travelers
                </span>

              </div>

            </div>

          </div>

          {/* =================================================
              NEARBY PANEL
          ================================================= */}

          {nearbyMode && (

            <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">

                    <MapPin
                      size={20}
                    />

                  </div>

                  <div>

                    <p className="font-semibold text-stone-900">
                      Nearby Travel Buddies
                    </p>

                    <p className="text-sm text-stone-600">

                      {locationDetected
                        ? `Travelers within ${nearbyRadius} km of your current location`
                        : 'Location detected'}

                    </p>

                  </div>

                </div>

                <div className="flex items-center gap-2">

                  <select
                    value={
                      nearbyRadius
                    }
                    onChange={(
                      e
                    ) => {

                      const radius =
                        Number(
                          e.target.value
                        );

                      setNearbyRadius(
                        radius
                      );

                      findNearbyBuddies(
                        radius
                      );

                    }}
                    className="bg-white border border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >

                    <option value={2}>
                      Within 2 km
                    </option>

                    <option value={5}>
                      Within 5 km
                    </option>

                    <option value={10}>
                      Within 10 km
                    </option>

                    <option value={25}>
                      Within 25 km
                    </option>

                    <option value={50}>
                      Within 50 km
                    </option>

                  </select>

                  <button
                    type="button"
                    onClick={
                      clearNearbyMode
                    }
                    className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-stone-500 hover:text-red-500 transition"
                  >

                    <X size={18} />

                  </button>

                </div>

              </div>

            </div>

          )}

          {/* =================================================
              FILTER POPUP
          ================================================= */}

          {showFilter && (

            <div className="relative">

              <div className="absolute right-0 top-4 z-50 w-full max-w-md">

                <div className="bg-white border border-stone-200 rounded-3xl shadow-2xl p-6">

                  <div className="flex items-center justify-between mb-6">

                    <div>

                      <h2 className="text-xl font-bold text-stone-900">
                        Filter Travelers
                      </h2>

                      <p className="text-sm text-stone-500 mt-1">
                        Choose the age group you want to travel with.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowFilter(
                          false
                        )
                      }
                      className="w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500"
                    >

                      <X
                        size={19}
                      />

                    </button>

                  </div>

                  <div>

                    <label className="text-sm font-semibold text-stone-700">
                      Age Preference
                    </label>

                    <div className="grid grid-cols-3 gap-2 mt-3">

                      <button
                        type="button"
                        onClick={() =>
                          setAgeFilterType(
                            'any'
                          )
                        }
                        className={`py-2.5 px-2 rounded-xl border text-sm font-medium transition ${
                          ageFilterType ===
                          'any'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-400'
                        }`}
                      >
                        Any Age
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setAgeFilterType(
                            'specific'
                          )
                        }
                        className={`py-2.5 px-2 rounded-xl border text-sm font-medium transition ${
                          ageFilterType ===
                          'specific'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-400'
                        }`}
                      >
                        Specific Age
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setAgeFilterType(
                            'range'
                          )
                        }
                        className={`py-2.5 px-2 rounded-xl border text-sm font-medium transition ${
                          ageFilterType ===
                          'range'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-400'
                        }`}
                      >
                        Age Range
                      </button>

                    </div>

                  </div>

                  {/* SPECIFIC AGE */}

                  {ageFilterType ===
                    'specific' && (

                    <div className="mt-5">

                      <label className="text-sm font-medium text-stone-600">
                        Select Age
                      </label>

                      <select
                        value={
                          specificAge
                        }
                        onChange={(e) =>
                          setSpecificAge(
                            e.target.value
                          )
                        }
                        className="w-full mt-2 border border-stone-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >

                        <option value="">
                          Select age
                        </option>

                        {Array.from(
                          {
                            length: 63,
                          },
                          (_, i) =>
                            i + 18
                        ).map(
                          (age) => (

                            <option
                              key={age}
                              value={age}
                            >
                              {age} years
                            </option>

                          )
                        )}

                      </select>

                    </div>

                  )}

                  {/* AGE RANGE */}

                  {ageFilterType ===
                    'range' && (

                    <div className="mt-5 grid grid-cols-2 gap-3">

                      <div>

                        <label className="text-sm font-medium text-stone-600">
                          Minimum Age
                        </label>

                        <select
                          value={
                            minAge
                          }
                          onChange={(e) =>
                            setMinAge(
                              e.target.value
                            )
                          }
                          className="w-full mt-2 border border-stone-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >

                          <option value="">
                            Min age
                          </option>

                          {Array.from(
                            {
                              length: 63,
                            },
                            (_, i) =>
                              i + 18
                          ).map(
                            (age) => (

                              <option
                                key={age}
                                value={age}
                              >
                                {age}
                              </option>

                            )
                          )}

                        </select>

                      </div>

                      <div>

                        <label className="text-sm font-medium text-stone-600">
                          Maximum Age
                        </label>

                        <select
                          value={
                            maxAge
                          }
                          onChange={(e) =>
                            setMaxAge(
                              e.target.value
                            )
                          }
                          className="w-full mt-2 border border-stone-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >

                          <option value="">
                            Max age
                          </option>

                          {Array.from(
                            {
                              length: 63,
                            },
                            (_, i) =>
                              i + 18
                          ).map(
                            (age) => (

                              <option
                                key={age}
                                value={age}
                              >
                                {age}
                              </option>

                            )
                          )}

                        </select>

                      </div>

                    </div>

                  )}

                  {/* BUTTONS */}

                  <div className="flex gap-3 mt-6">

                    <button
                      type="button"
                      onClick={
                        clearFilter
                      }
                      className="flex-1 px-4 py-3 rounded-xl border border-stone-200 text-stone-600 font-semibold hover:bg-stone-50 transition"
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={
                        applyFilter
                      }
                      className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                    >
                      Apply Filter
                    </button>

                  </div>

                </div>

              </div>

            </div>

          )}

        </div>

        {/* =================================================
            LOCATION ERROR
        ================================================= */}

        {locationError && (

          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 flex items-start gap-3">

            <MapPin
              size={20}
              className="mt-0.5 flex-shrink-0"
            />

            <div>

              <p className="font-semibold">
                Location unavailable
              </p>

              <p className="text-sm mt-1">
                {locationError}
              </p>

            </div>

          </div>

        )}

        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-8 shadow-sm">

          <div className="relative">

            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search travelers, destination, age or gender..."
              className="w-full border border-stone-300 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

          </div>

        </div>

        {/* =================================================
            ACTIVE FILTER
        ================================================= */}

        {isFilterActive && (

          <div className="flex items-center gap-2 mb-6">

            <span className="text-sm text-stone-500">
              Active filter:
            </span>

            <span className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium">

              {appliedAgeFilterType ===
                'specific' && (
                <>
                  Age {appliedSpecificAge}
                </>
              )}

              {appliedAgeFilterType ===
                'range' && (
                <>
                  Age{' '}
                  {appliedMinAge ||
                    '18'}{' '}
                  -{' '}
                  {appliedMaxAge ||
                    '80'}
                </>
              )}

              <button
                type="button"
                onClick={
                  clearFilter
                }
                className="hover:text-emerald-900"
              >
                <X
                  size={15}
                />
              </button>

            </span>

          </div>

        )}

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            {error}
          </div>

        )}

        {/* =================================================
            NO USERS
        ================================================= */}

        {displayBuddies.length === 0 ? (

          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center">

            {nearbyMode ? (

              <>

                <Navigation
                  size={50}
                  className="mx-auto text-emerald-300 mb-4"
                />

                <h2 className="text-2xl font-bold text-stone-800">
                  No nearby travelers found
                </h2>

                <p className="text-stone-500 mt-2">
                  No TravelMate users with a shared location were found within {nearbyRadius} km.
                </p>

                <div className="flex justify-center gap-3 mt-5">

                  <button
                    type="button"
                    onClick={() => {

                      const largerRadius =
                        nearbyRadius === 2
                          ? 5
                          : nearbyRadius === 5
                          ? 10
                          : nearbyRadius === 10
                          ? 25
                          : 50;

                      setNearbyRadius(
                        largerRadius
                      );

                      findNearbyBuddies(
                        largerRadius
                      );

                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                  >
                    Search Larger Area
                  </button>

                  <button
                    type="button"
                    onClick={
                      clearNearbyMode
                    }
                    className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-semibold hover:bg-stone-50 transition"
                  >
                    Show Everyone
                  </button>

                </div>

              </>

            ) : (

              <>

                <User
                  size={50}
                  className="mx-auto text-stone-300 mb-4"
                />

                <h2 className="text-2xl font-bold text-stone-800">
                  No travelers found
                </h2>

                <p className="text-stone-500 mt-2">
                  Try changing your age filter or search.
                </p>

                {isFilterActive && (

                  <button
                    type="button"
                    onClick={
                      clearFilter
                    }
                    className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                  >
                    Clear Filter
                  </button>

                )}

              </>

            )}

          </div>

        ) : (

          /* =================================================
             USER CARDS
          ================================================= */

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

            {displayBuddies.map(
              (buddy) => (

                <div
                  key={buddy.id}
                  className="bg-white rounded-3xl border border-stone-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                >

                  <div className="p-6">

                    {/* =================================================
                        CLICKABLE PROFILE
                    ================================================= */}

                    <Link
                      to={`/public-profile/${buddy.id}`}
                      className="flex items-center gap-4 group"
                    >

                      {/* PROFILE IMAGE */}

                      <div className="w-20 h-20 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 border-4 border-emerald-100 group-hover:border-emerald-500 transition">

                        {buddy.avatar_url ? (

                          <img
                            src={
                              buddy.avatar_url
                            }
                            alt={
                              buddy.full_name ||
                              'Traveler'
                            }
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                            onError={(
                              e
                            ) => {

                              e.currentTarget.style.display =
                                'none';

                              const parent =
                                e.currentTarget
                                  .parentElement;

                              if (
                                parent &&
                                !parent.querySelector(
                                  '.avatar-fallback'
                                )
                              ) {

                                const fallback =
                                  document.createElement(
                                    'div'
                                  );

                                fallback.className =
                                  'avatar-fallback w-full h-full flex items-center justify-center text-2xl font-bold text-emerald-700';

                                fallback.innerText =
                                  getInitials(
                                    buddy.full_name
                                  );

                                parent.appendChild(
                                  fallback
                                );
                              }
                            }}
                          />

                        ) : (

                          <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-emerald-700">

                            {getInitials(
                              buddy.full_name
                            )}

                          </div>

                        )}

                      </div>

                      {/* USER DETAILS */}

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center gap-2 min-w-0">

                          <h2 className="text-xl font-bold text-stone-900 truncate group-hover:text-emerald-600 transition">

                            {buddy.full_name ||
                              'Traveler'}

                          </h2>

                          {buddy.is_verified && (

                            <span
                              title="Identity Verified"
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white flex-shrink-0"
                            >

                              <ShieldCheck
                                size={13}
                                strokeWidth={3}
                              />

                            </span>

                          )}

                        </div>

                        <p className="text-sm text-stone-500 truncate">

                          {buddy.email ||
                            'TravelMate user'}

                        </p>

                        <div className="flex flex-wrap gap-2 mt-2">

                          {buddy.age !==
                            null &&
                            buddy.age !==
                              undefined && (

                              <span className="text-xs bg-stone-100 text-stone-700 px-3 py-1 rounded-full">

                                Age: {buddy.age}

                              </span>

                            )}

                          {buddy.gender && (

                            <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full capitalize">

                              {buddy.gender}

                            </span>

                          )}

                        </div>

                      </div>

                    </Link>

                    {/* =================================================
                        DISTANCE
                    ================================================= */}

                    {nearbyMode &&
                      nearbyDistances[
                        buddy.id
                      ] !== undefined && (

                        <div className="mt-5 flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">

                          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">

                            <Navigation
                              size={18}
                              className="text-emerald-600"
                            />

                          </div>

                          <div>

                            <p className="text-xs text-stone-500">
                              Distance from you
                            </p>

                            <p className="font-bold text-emerald-700">

                              {nearbyDistances[
                                buddy.id
                              ] < 1
                                ? `${Math.round(
                                    nearbyDistances[
                                      buddy.id
                                    ] * 1000
                                  )} m away`
                                : `${nearbyDistances[
                                    buddy.id
                                  ].toFixed(
                                    1
                                  )} km away`}

                            </p>

                          </div>

                        </div>

                      )}

                    {/* =================================================
                        COMPLETED TRIPS
                    ================================================= */}

                    <div className="mt-5 flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">

                      <div className="flex items-center gap-2">

                        <Plane
                          size={18}
                          className="text-emerald-600"
                        />

                        <span className="text-sm font-medium text-stone-700">
                          Trips Completed
                        </span>

                      </div>

                      <span className="text-lg font-bold text-emerald-600">

                        {
                          buddy.completedTrips
                        }

                      </span>

                    </div>

                    {/* =================================================
                        COMPATIBILITY
                    ================================================= */}

                    {buddy.compatibility >
                      0 && (

                      <div className="mt-5">

                        <div className="flex justify-between mb-2">

                          <span className="text-sm font-semibold text-stone-700">
                            Compatibility
                          </span>

                          <span className="text-sm font-bold text-emerald-600">

                            {
                              buddy.compatibility
                            }%

                          </span>

                        </div>

                        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">

                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{
                              width: `${buddy.compatibility}%`,
                            }}
                          />

                        </div>

                      </div>

                    )}

                    {/* =================================================
                        BIO
                    ================================================= */}

                    <p className="text-sm text-stone-600 mt-5">

                      {buddy.bio ||
                        'No bio added yet.'}

                    </p>

                    {/* =================================================
                        PREFERENCES
                    ================================================= */}

                    {buddy.preferences &&
                      buddy.preferences
                        .length > 0 && (

                        <div className="mt-5">

                          <p className="text-xs font-semibold text-stone-500 mb-2">
                            TRAVEL PREFERENCES
                          </p>

                          <div className="flex flex-wrap gap-2">

                            {buddy.preferences
                              .slice(
                                0,
                                5
                              )
                              .map(
                                (
                                  preference
                                ) => (

                                  <span
                                    key={
                                      preference
                                    }
                                    className="px-3 py-1 bg-stone-100 text-stone-700 text-xs rounded-full"
                                  >
                                    {
                                      preference
                                    }
                                  </span>

                                )
                              )}

                          </div>

                        </div>

                      )}

                    {/* =================================================
                        UPCOMING TRIP
                    ================================================= */}

                    {buddy.trip ? (

                      <div className="mt-5 bg-stone-50 rounded-2xl p-4 border border-stone-100">

                        <div className="flex items-center gap-2 mb-3">

                          <MapPin
                            size={18}
                            className="text-emerald-600"
                          />

                          <h3 className="font-bold text-stone-900">

                            {
                              buddy.trip
                                .destination
                            }

                          </h3>

                        </div>

                        <div className="space-y-2 text-sm text-stone-600">

                          <div className="flex items-center gap-2">

                            <Calendar
                              size={15}
                            />

                            <span>

                              {formatDate(
                                buddy.trip
                                  .start_date
                              )}

                              {' - '}

                              {formatDate(
                                buddy.trip
                                  .end_date
                              )}

                            </span>

                          </div>

                          {buddy.trip
                            .budget !==
                            null &&
                            buddy.trip
                              .budget !==
                              undefined && (

                              <div className="flex items-center gap-2">

                                <IndianRupee
                                  size={15}
                                />

                                <span>

                                  Budget: ₹
                                  {Number(
                                    buddy.trip
                                      .budget
                                  ).toLocaleString(
                                    'en-IN'
                                  )}

                                </span>

                              </div>

                            )}

                        </div>

                        {buddy.trip
                          .description && (

                          <p className="text-xs text-stone-500 mt-3">

                            {
                              buddy.trip
                                .description
                            }

                          </p>

                        )}

                      </div>

                    ) : (

                      <div className="mt-5 bg-stone-50 rounded-2xl p-4 text-sm text-stone-500">

                        This traveler hasn't
                        published a future trip yet.

                      </div>

                    )}

                  </div>

                  {/* =================================================
                      BOTTOM ACTIONS
                  ================================================= */}

                  <div className="border-t border-stone-100 p-5 flex gap-3">

                    <Link
                      to={`/public-profile/${buddy.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 border border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-semibold rounded-xl px-4 py-3 transition"
                    >

                      <User
                        size={18}
                      />

                      View Profile

                    </Link>

                    <Link
                      to={`/chat/${buddy.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-4 py-3 transition"
                    >

                      <MessageCircle
                        size={18}
                      />

                      Chat

                    </Link>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}