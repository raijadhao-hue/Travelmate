import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Search,
  History as HistoryIcon,
  User,
  Users,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type HistoryTrip = {
  id: string;
  type: 'trip' | 'group';
  name?: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string | null;
  user_id: string;
  max_members?: number;
};

type Profile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  bio?: string | null;
};

export default function History() {
  const [destination, setDestination] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const [trips, setTrips] = useState<HistoryTrip[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const destinationMap: Record<string, string> = {
    Goa: 'Goa',
    Rajasthan: 'Rajasthan',
    Kerala: 'Kerala',
    'Himachal Pradesh': 'Himachal',
    Thailand: 'Thailand',
    Vietnam: 'Vietnam',
  };

  const destinations = [
    'Goa',
    'Rajasthan',
    'Kerala',
    'Himachal Pradesh',
    'Thailand',
    'Vietnam',
  ];

  // =====================================================
  // GET TODAY IN LOCAL DATE
  // =====================================================

  const getTodayString = () => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date: string) => {
    if (!date) return '';

    const cleanDate = String(date).slice(0, 10);

    return new Date(`${cleanDate}T00:00:00`).toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  // =====================================================
  // PROFILE NAME
  // =====================================================

  const getProfileName = (userId: string) => {
    const profile = profiles[userId];

    if (!profile) {
      return 'Traveller';
    }

    return profile.full_name?.trim() || 'Traveller';
  };

  // =====================================================
  // PROFILE PHOTO
  // =====================================================

  const getProfilePhoto = (userId: string) => {
    const profile = profiles[userId];

    if (!profile) {
      return null;
    }

    return profile.avatar_url || profile.profile_photo_url || null;
  };

  // =====================================================
  // DATE HELPERS
  // =====================================================

  const addDaysToDate = (
    dateString: string,
    days: number
  ) => {
    const date = new Date(`${dateString}T00:00:00`);

    date.setDate(date.getDate() + days);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // SEARCH HISTORY
  // =====================================================

  const handleSearch = async () => {
    setError('');
    setSearched(true);
    setTrips([]);
    setProfiles({});

    if (!destination) {
      setError('Please select a destination.');
      return;
    }

    if (!selectedDate) {
      setError('Please select a trip date.');
      return;
    }

    const today = getTodayString();

    // Selected date must be in the past
    if (selectedDate >= today) {
      setError(
        'Please select a past date to view completed trip history.'
      );
      return;
    }

    try {
      setLoading(true);

      const databaseDestination =
        destinationMap[destination] || destination;

      // =====================================================
      // SEARCH WINDOW
      //
      // Selected date ke around 7 days before + 7 days after
      //
      // Example:
      // Selected: 15 Sep
      // Search:   08 Sep -> 22 Sep
      // =====================================================

      const searchStartDate = addDaysToDate(
        selectedDate,
        -7
      );

      const searchEndDate = addDaysToDate(
        selectedDate,
        7
      );

      // =====================================================
      // NORMAL TRIPS
      // =====================================================

      const {
        data: normalTrips,
        error: tripsError,
      } = await supabase
        .from('trips')
        .select(`
          id,
          user_id,
          destination,
          start_date,
          end_date,
          description,
          max_members
        `)
        .ilike(
          'destination',
          `${databaseDestination.trim()}%`
        )
        // Trip START should be around selected date
        .gte(
          'start_date',
          searchStartDate
        )
        .lte(
          'start_date',
          searchEndDate
        )
        // Trip must already be completed
        .lt(
          'end_date',
          today
        )
        .order(
          'start_date',
          { ascending: false }
        );

      if (tripsError) {
        console.error(
          'History trips error:',
          tripsError
        );

        throw tripsError;
      }

      console.log(
        'History normal trips:',
        normalTrips
      );

      const normalHistory: HistoryTrip[] = (
        normalTrips || []
      ).map((trip: any) => ({
        id: trip.id,
        type: 'trip',
        destination: trip.destination,
        start_date: String(
          trip.start_date
        ).slice(0, 10),
        end_date: String(
          trip.end_date
        ).slice(0, 10),
        description: trip.description,
        user_id: trip.user_id,
        max_members: trip.max_members,
      }));

      // =====================================================
      // GROUP TRIPS
      // =====================================================

      const {
        data: groups,
        error: groupsError,
      } = await supabase
        .from('travel_groups')
        .select(`
          id,
          name,
          destination,
          start_date,
          end_date,
          description,
          created_by,
          max_members
        `)
        .ilike(
          'destination',
          `${databaseDestination.trim()}%`
        )
        // Group START should be around selected date
        .gte(
          'start_date',
          searchStartDate
        )
        .lte(
          'start_date',
          searchEndDate
        )
        // Group must already be completed
        .lt(
          'end_date',
          today
        )
        .order(
          'start_date',
          { ascending: false }
        );

      if (groupsError) {
        console.error(
          'History groups error:',
          groupsError
        );

        throw groupsError;
      }

      console.log(
        'History groups:',
        groups
      );

      const groupHistory: HistoryTrip[] = (
        groups || []
      ).map((group: any) => ({
        id: group.id,
        type: 'group',
        name: group.name,
        destination: group.destination,
        start_date: String(
          group.start_date
        ).slice(0, 10),
        end_date: String(
          group.end_date
        ).slice(0, 10),
        description: group.description,
        user_id: group.created_by,
        max_members: group.max_members,
      }));

      // =====================================================
      // COMBINE NORMAL + GROUP
      // =====================================================

      const combined: HistoryTrip[] = [
        ...normalHistory,
        ...groupHistory,
      ].sort((a, b) =>
        b.start_date.localeCompare(
          a.start_date
        )
      );

      console.log(
        'FINAL HISTORY:',
        combined
      );

      setTrips(combined);

      // =====================================================
      // FETCH PROFILES
      // =====================================================

      const userIds = [
        ...new Set(
          combined
            .map(
              (trip) => trip.user_id
            )
            .filter(Boolean)
        ),
      ];

      if (userIds.length > 0) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            avatar_url,
            profile_photo_url,
            bio
          `)
          .in(
            'id',
            userIds
          );

        if (profileError) {
          console.error(
            'History profile error:',
            profileError
          );
        } else {
          const profileMap: Record<
            string,
            Profile
          > = {};

          (profileData || []).forEach(
            (profile: Profile) => {
              profileMap[
                profile.id
              ] = profile;
            }
          );

          setProfiles(profileMap);
        }
      }
    } catch (err: any) {
      console.error(
        'History search failed:',
        err
      );

      setError(
        err?.message ||
          'Unable to load trip history. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CLEAR
  // =====================================================

  const clearSearch = () => {
    setDestination('');
    setSelectedDate('');
    setTrips([]);
    setProfiles({});
    setSearched(false);
    setError('');
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-stone-50">

      {/* HEADER */}

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4">

          <Link
            to="/dashboard"
            className="mr-4 rounded-full p-2 transition hover:bg-stone-100"
          >
            <ArrowLeft
              size={22}
              className="text-stone-700"
            />
          </Link>

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <HistoryIcon
                size={20}
                className="text-emerald-700"
              />
            </div>

            <div>
              <h1 className="text-xl font-semibold text-stone-900">
                Travel History
              </h1>

              <p className="text-sm text-stone-500">
                Find completed trips around your selected date
              </p>
            </div>

          </div>
        </div>
      </header>

      {/* MAIN */}

      <main className="mx-auto max-w-5xl px-6 py-8">

        {/* SEARCH CARD */}

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-stone-900">
            Search Travel History
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            Select a destination and date to find completed trips around that date.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">

            {/* DESTINATION */}

            <div>

              <label className="mb-2 block text-sm font-medium text-stone-700">
                Destination
              </label>

              <div className="relative">

                <MapPin
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />

                <select
                  value={destination}
                  onChange={(e) =>
                    setDestination(
                      e.target.value
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-4 text-sm text-stone-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >

                  <option value="">
                    Select destination
                  </option>

                  {destinations.map(
                    (place) => (
                      <option
                        key={place}
                        value={place}
                      >
                        {place}
                      </option>
                    )
                  )}

                </select>

              </div>

            </div>

            {/* DATE */}

            <div>

              <label className="mb-2 block text-sm font-medium text-stone-700">
                Trip Date
              </label>

              <div className="relative">

                <Calendar
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />

                <input
                  type="date"
                  value={selectedDate}
                  max={getTodayString()}
                  onChange={(e) =>
                    setSelectedDate(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-4 text-sm text-stone-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </div>

              <p className="mt-2 text-xs text-stone-400">
                Trips from 7 days before to 7 days after this date will be shown.
              </p>

            </div>

          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* BUTTONS */}

          <div className="mt-6 flex gap-3">

            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {loading ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Search size={18} />
              )}

              {loading
                ? 'Searching...'
                : 'Search History'}

            </button>

            {searched && (
              <button
                onClick={clearSearch}
                className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
              >
                Clear
              </button>
            )}

          </div>

        </div>

        {/* RESULTS */}

        {searched && !loading && (

          <div className="mt-8">

            <div className="mb-5 flex items-center justify-between">

              <div>

                <h2 className="text-xl font-semibold text-stone-900">
                  Completed Trips
                </h2>

                {destination &&
                  selectedDate && (
                    <p className="mt-1 text-sm text-stone-500">
                      {destination} • around{' '}
                      {formatDate(
                        selectedDate
                      )}
                    </p>
                  )}

              </div>

              {trips.length > 0 && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                  {trips.length}{' '}
                  {trips.length === 1
                    ? 'trip'
                    : 'trips'}
                </span>
              )}

            </div>

            {/* NO RESULTS */}

            {trips.length === 0 ? (

              <div className="rounded-2xl border border-stone-200 bg-white px-6 py-12 text-center">

                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">

                  <HistoryIcon
                    size={25}
                    className="text-stone-400"
                  />

                </div>

                <h3 className="text-base font-semibold text-stone-800">
                  No completed trips found
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
                  No completed trip was found for this destination within 7 days before or after the selected date.
                </p>

              </div>

            ) : (

              /* TRIP CARDS */

              <div className="space-y-4">

                {trips.map(
                  (trip) => {

                    const photo =
                      getProfilePhoto(
                        trip.user_id
                      );

                    return (

                      <div
                        key={`${trip.type}-${trip.id}`}
                        className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                      >

                        <div className="flex flex-col gap-5 sm:flex-row">

                          {/* PHOTO */}

                          <div className="shrink-0">

                            {photo ? (

                              <img
                                src={photo}
                                alt={getProfileName(
                                  trip.user_id
                                )}
                                className="h-16 w-16 rounded-full object-cover"
                              />

                            ) : (

                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">

                                {trip.type ===
                                'group' ? (
                                  <Users
                                    size={25}
                                    className="text-stone-400"
                                  />
                                ) : (
                                  <User
                                    size={25}
                                    className="text-stone-400"
                                  />
                                )}

                              </div>

                            )}

                          </div>

                          {/* DETAILS */}

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-start justify-between gap-3">

                              <div>

                                <h3 className="text-lg font-semibold text-stone-900">

                                  {trip.type ===
                                  'group'
                                    ? trip.name ||
                                      'Group Trip'
                                    : getProfileName(
                                        trip.user_id
                                      )}

                                </h3>

                                <p className="mt-1 text-sm text-stone-500">

                                  {trip.type ===
                                  'group'
                                    ? `Created by ${getProfileName(
                                        trip.user_id
                                      )}`
                                    : 'Travel Buddy Trip'}

                                </p>

                              </div>

                              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">

                                <CheckCircle2
                                  size={14}
                                />

                                Trip Completed

                              </span>

                            </div>

                            {/* TRIP INFO */}

                            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-stone-600">

                              <div className="flex items-center gap-2">

                                <MapPin
                                  size={16}
                                  className="text-emerald-600"
                                />

                                <span>
                                  {trip.destination}
                                </span>

                              </div>

                              <div className="flex items-center gap-2">

                                <Calendar
                                  size={16}
                                  className="text-emerald-600"
                                />

                                <span>
                                  {formatDate(
                                    trip.start_date
                                  )}{' '}
                                  –{' '}
                                  {formatDate(
                                    trip.end_date
                                  )}
                                </span>

                              </div>

                              <div className="flex items-center gap-2">

                                {trip.type ===
                                'group' ? (
                                  <>
                                    <Users
                                      size={16}
                                      className="text-emerald-600"
                                    />

                                    <span>
                                      Group Trip
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <User
                                      size={16}
                                      className="text-emerald-600"
                                    />

                                    <span>
                                      Buddy Trip
                                    </span>
                                  </>
                                )}

                              </div>

                            </div>

                            {/* DESCRIPTION */}

                            {trip.description && (
                              <p className="mt-4 line-clamp-2 text-sm leading-6 text-stone-600">
                                {trip.description}
                              </p>
                            )}

                            {/* VIEW PROFILE */}

                            <div className="mt-5">

                              <Link
                                to={`/profile/${trip.user_id}`}
                                className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                              >

                                <User
                                  size={16}
                                />

                                View Profile

                              </Link>

                            </div>

                          </div>

                        </div>

                      </div>

                    );
                  }
                )}

              </div>

            )}

          </div>

        )}

      </main>

    </div>
  );
}