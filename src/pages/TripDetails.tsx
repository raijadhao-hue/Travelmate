import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Hotel,
  Bus,
  CheckCircle2,
  Loader2,
  User,
  Wallet,
  MessageCircle,
  XCircle,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { destinationPlans } from './Plans';

interface Trip {
  id: string;
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string | null;
  max_members?: number | null;
  buddy_limit?: number | null;
  budget?: number | null;
  accommodation?: string | null;
  transport?: string | null;
  itinerary?: string | null;
  status?: string | null;
  created_at?: string | null;
  is_confirmed?: boolean | null;
  replacement_needed?: boolean | null;
  confirmed_at?: string | null;
}

interface Profile {
  id: string;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  is_verified?: boolean | null;
  about_me?: string | null;
  bio?: string | null;
}

interface TripMember {
  id: string;
  user_id: string;
  status: string;
}

interface ItineraryDay {
  day: number;
  city: string;
  title: string;
  activities: string[];
  transport?: string;
  hotel?: string;
  hotelUrl?: string;
}

interface DestinationPlan {
  name: string;
  route: string;
  budget: string;
  duration: string;
  transport: string;
  itinerary: ItineraryDay[];
}

interface CancellationResult {
  success?: boolean;
  blocked?: boolean;
  reason?: string;
  message?: string;
  cancellation_type?: string;
  days_before_trip?: number;
  strikes_added?: number;
  reliability_penalty?: number;
  reliability_score?: number;
  total_strikes?: number;
  restricted_until?: string | null;
  emergency_review?: string;
}

export default function TripDetails() {
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [memberRows, setMemberRows] = useState<TripMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancellation states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelResult, setCancelResult] =
    useState<CancellationResult | null>(null);

  useEffect(() => {
    if (tripId) {
      fetchTripDetails();
    }
  }, [tripId]);

  const fetchTripDetails = async () => {
    if (!tripId) {
      setError('Trip ID is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 1. Fetch trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) {
        throw tripError;
      }

      if (!tripData) {
        throw new Error('Trip not found.');
      }

      setTrip(tripData as Trip);

      // 2. Fetch creator profile
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select(
          'id, full_name, email, avatar_url, profile_photo_url, is_verified, about_me, bio'
        )
        .eq('id', tripData.user_id)
        .maybeSingle();

      if (creatorError) {
        console.error('Creator profile error:', creatorError);
      }

      setCreator((creatorData as Profile | null) || null);

      // 3. Fetch accepted members
      const { data: memberRowsData, error: memberError } = await supabase
        .from('trip_members')
        .select('id, user_id, status')
        .eq('trip_id', tripId)
        .eq('status', 'accepted');

      if (memberError) {
        throw memberError;
      }

      const acceptedMembers = (memberRowsData || []) as TripMember[];

      setMemberRows(acceptedMembers);

      const memberIds = acceptedMembers
        .map((member) => member.user_id)
        .filter(Boolean);

      // 4. Fetch member profiles
      if (memberIds.length > 0) {
        const { data: memberProfiles, error: memberProfileError } =
          await supabase
            .from('profiles')
            .select(
              'id, full_name, email, avatar_url, profile_photo_url, is_verified, about_me, bio'
            )
            .in('id', memberIds);

        if (memberProfileError) {
          console.error(
            'Member profiles error:',
            memberProfileError
          );
          setMembers([]);
        } else {
          setMembers((memberProfiles || []) as Profile[]);
        }
      } else {
        setMembers([]);
      }
    } catch (err: any) {
      console.error('Failed to load trip:', err);
      setError(err?.message || 'Unable to load trip details.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Not specified';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTripPlan = (): DestinationPlan | null => {
    if (!trip?.destination) return null;

    const destination = trip.destination.trim();

    const exactPlan = (
      destinationPlans as Record<string, DestinationPlan>
    )[destination];

    if (exactPlan) {
      return exactPlan;
    }

    const matchingKey = Object.keys(destinationPlans).find(
      (key) => key.toLowerCase() === destination.toLowerCase()
    );

    if (matchingKey) {
      return (
        destinationPlans as Record<string, DestinationPlan>
      )[matchingKey];
    }

    return null;
  };

  const getDayDate = (dayNumber: number) => {
    if (!trip?.start_date) return '';

    const date = new Date(trip.start_date);

    if (Number.isNaN(date.getTime())) return '';

    date.setDate(date.getDate() + dayNumber - 1);

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getLocalDateString = (value?: string | null) => {
    if (!value) return '';

    return String(value).slice(0, 10);
  };

  const todayString = (() => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  })();

  const tripEndDate = getLocalDateString(trip?.end_date);

  const isCompleted =
    !!tripEndDate && tripEndDate < todayString;

  const maxMembers =
    Number(trip?.max_members) ||
    Number(trip?.buddy_limit || 1) + 1;

  const currentMembers = members.length;

  const isFull = currentMembers >= maxMembers;

  const isConfirmed =
    !isCompleted &&
    (trip?.is_confirmed === true ||
      trip?.status === 'confirmed' ||
      isFull);

  const plan = getTripPlan();

  const creatorAvatar =
    creator?.avatar_url ||
    creator?.profile_photo_url ||
    '';

  // Current user's membership
  const currentMemberRow = memberRows.find(
    (member) => member.user_id === user?.id
  );

  const isCurrentUserMember =
    !!currentMemberRow &&
    currentMemberRow.status === 'accepted';

  const isOrganizer =
    !!user?.id &&
    !!trip?.user_id &&
    user.id === trip.user_id;

  const canCancel =
    !!user?.id &&
    !!trip &&
    !isCompleted &&
    isCurrentUserMember &&
    currentMemberRow?.status !== 'cancelled';

  const handleChat = () => {
    if (!creator?.id) return;

    navigate(`/chat/${creator.id}`);
  };

  const openCancelModal = () => {
    setCancelError('');
    setCancelResult(null);
    setCancelReason('');
    setIsEmergency(false);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    if (cancelling) return;

    setShowCancelModal(false);
    setCancelError('');
    setCancelReason('');
    setIsEmergency(false);
  };

  const handleCancelTrip = async () => {
    if (!trip?.id || !user?.id) {
      setCancelError('You must be logged in to cancel this trip.');
      return;
    }

    if (!cancelReason.trim()) {
      setCancelError('Please provide a cancellation reason.');
      return;
    }

    try {
      setCancelling(true);
      setCancelError('');
      setCancelResult(null);

      const { data, error: rpcError } = await supabase.rpc(
        'cancel_trip',
        {
          p_trip_id: trip.id,
          p_reason: cancelReason.trim(),
          p_is_emergency: isEmergency,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      let result: CancellationResult;

      if (typeof data === 'string') {
        try {
          result = JSON.parse(data);
        } catch {
          result = {
            success: false,
            message: data,
          };
        }
      } else {
        result = data || {};
      }

      if (!result.success) {
        setCancelError(
          result.message || 'Unable to cancel this trip.'
        );
        return;
      }

      setCancelResult(result);

      // Refresh trip/member information
      await fetchTripDetails();
    } catch (err: any) {
      console.error('Cancellation error:', err);

      setCancelError(
        err?.message ||
          'Something went wrong while cancelling the trip.'
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-stone-600">
            Loading trip details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center max-w-md w-full shadow-sm">
          <h2 className="text-xl font-bold text-stone-900 mb-2">
            Trip not available
          </h2>

          <p className="text-stone-600 mb-6">
            {error || 'This trip could not be found.'}
          </p>

          <button
            onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-stone-700 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* TITLE */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-emerald-600 mb-2">
                TravelMate Trip
              </p>

              <h1 className="text-3xl sm:text-4xl font-bold text-stone-900">
                {trip.destination}
              </h1>

              <div className="flex flex-wrap gap-4 mt-4 text-stone-600">
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  {formatDate(trip.start_date)} -{' '}
                  {formatDate(trip.end_date)}
                </span>

                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  {isCompleted
                    ? 'Trip completed'
                    : `${currentMembers}/${maxMembers} travelers`}
                </span>
              </div>
            </div>

            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
                isCompleted || isConfirmed
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />

              {isCompleted
                ? 'COMPLETED'
                : isConfirmed
                  ? 'CONFIRMED'
                  : 'OPEN'}
            </div>
          </div>
        </div>

        {/* REPLACEMENT NOTICE */}
        {!isCompleted && trip.replacement_needed && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />

              <div>
                <h3 className="font-bold text-amber-900">
                  Replacement Traveler Needed
                </h3>

                <p className="text-sm text-amber-800 mt-1 leading-6">
                  A traveler has cancelled this trip. A replacement
                  spot is currently available.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            {/* ABOUT */}
            <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-stone-900 mb-4">
                About This Trip
              </h2>

              <p className="text-stone-600 leading-7 whitespace-pre-line">
                {trip.description ||
                  'No description has been added for this trip.'}
              </p>
            </section>

            {/* TRIP INFORMATION */}
            <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-stone-900 mb-5">
                Trip Information
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-stone-50">
                  <div className="flex items-center gap-2 text-emerald-600 mb-2">
                    <MapPin className="w-5 h-5" />

                    <span className="text-sm font-medium">
                      Destination
                    </span>
                  </div>

                  <p className="font-semibold text-stone-900">
                    {trip.destination}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50">
                  <div className="flex items-center gap-2 text-emerald-600 mb-2">
                    <Calendar className="w-5 h-5" />

                    <span className="text-sm font-medium">
                      Travel Dates
                    </span>
                  </div>

                  <p className="font-semibold text-stone-900">
                    {formatDate(trip.start_date)}
                  </p>

                  <p className="text-sm text-stone-600">
                    to {formatDate(trip.end_date)}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50">
                  <div className="flex items-center gap-2 text-emerald-600 mb-2">
                    <Users className="w-5 h-5" />

                    <span className="text-sm font-medium">
                      {isCompleted ? 'Trip Status' : 'Capacity'}
                    </span>
                  </div>

                  {isCompleted ? (
                    <>
                      <p className="font-semibold text-emerald-700">
                        Trip Completed
                      </p>

                      <p className="text-sm text-stone-600">
                        This trip has already ended.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-stone-900">
                        {currentMembers} / {maxMembers}
                      </p>

                      <p
                        className={`text-sm ${
                          isFull
                            ? 'text-red-600 font-semibold'
                            : 'text-stone-600'
                        }`}
                      >
                        {isFull
                          ? 'FULL'
                          : `${Math.max(
                              maxMembers - currentMembers,
                              0
                            )} spots remaining`}
                      </p>
                    </>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-stone-50">
                  <div className="flex items-center gap-2 text-emerald-600 mb-2">
                    <CheckCircle2 className="w-5 h-5" />

                    <span className="text-sm font-medium">
                      Status
                    </span>
                  </div>

                  <p
                    className={`font-semibold ${
                      isCompleted || isConfirmed
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {isCompleted
                      ? 'Trip Completed'
                      : isConfirmed
                        ? 'Confirmed'
                        : 'Waiting for members'}
                  </p>
                </div>

                {trip.transport && (
                  <div className="p-4 rounded-xl bg-stone-50">
                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                      <Bus className="w-5 h-5" />

                      <span className="text-sm font-medium">
                        Transport
                      </span>
                    </div>

                    <p className="font-semibold text-stone-900">
                      {trip.transport}
                    </p>
                  </div>
                )}

                {trip.accommodation && (
                  <div className="p-4 rounded-xl bg-stone-50">
                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                      <Hotel className="w-5 h-5" />

                      <span className="text-sm font-medium">
                        Accommodation
                      </span>
                    </div>

                    <p className="font-semibold text-stone-900">
                      {trip.accommodation}
                    </p>
                  </div>
                )}

                {trip.budget !== null &&
                  trip.budget !== undefined && (
                    <div className="p-4 rounded-xl bg-stone-50">
                      <div className="flex items-center gap-2 text-emerald-600 mb-2">
                        <Wallet className="w-5 h-5" />

                        <span className="text-sm font-medium">
                          Budget
                        </span>
                      </div>

                      <p className="font-semibold text-stone-900">
                        ₹
                        {Number(trip.budget).toLocaleString(
                          'en-IN'
                        )}
                      </p>
                    </div>
                  )}
              </div>
            </section>

            {/* FULL ITINERARY */}
            <section className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-stone-200">
                <p className="text-sm font-semibold text-emerald-600 mb-1">
                  {plan?.name || trip.destination}
                </p>

                <h2 className="text-2xl font-bold text-stone-900">
                  Full Itinerary
                </h2>

                {plan && (
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-stone-600">
                    <span>{plan.duration}</span>
                    <span>•</span>
                    <span>{plan.route}</span>
                  </div>
                )}
              </div>

              <div className="p-6">
                {plan?.itinerary?.length ? (
                  <div className="space-y-5">
                    {plan.itinerary.map((day) => (
                      <div
                        key={day.day}
                        className="rounded-2xl border border-stone-200 p-5"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                              {day.day}
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-emerald-600">
                                DAY {day.day}
                                {getDayDate(day.day)
                                  ? ` • ${getDayDate(day.day)}`
                                  : ''}
                              </p>

                              <h3 className="text-xl font-bold text-stone-900 mt-1">
                                {day.title}
                              </h3>

                              <p className="flex items-center gap-1 text-sm text-stone-500 mt-1">
                                <MapPin className="w-4 h-4" />
                                {day.city}
                              </p>
                            </div>
                          </div>

                          {day.transport && (
                            <div className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
                              {day.transport}
                            </div>
                          )}
                        </div>

                        <div className="mt-5 md:ml-16">
                          <h4 className="font-semibold text-stone-800 mb-3">
                            Activities
                          </h4>

                          <ul className="space-y-2">
                            {day.activities.map(
                              (activity, index) => (
                                <li
                                  key={`${day.day}-${index}`}
                                  className="flex gap-3 text-stone-600"
                                >
                                  <span className="text-emerald-600 font-bold">
                                    •
                                  </span>

                                  <span>{activity}</span>
                                </li>
                              )
                            )}
                          </ul>

                          {day.hotel && (
                            <div className="mt-5 p-4 rounded-xl bg-stone-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <Hotel className="w-5 h-5 text-emerald-600" />

                                <div>
                                  <p className="text-xs text-stone-500">
                                    Suggested Stay
                                  </p>

                                  <p className="font-semibold text-stone-900">
                                    {day.hotel}
                                  </p>
                                </div>
                              </div>

                              {day.hotelUrl && (
                                <a
                                  href={day.hotelUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                                >
                                  View Hotels
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : trip.itinerary ? (
                  <div className="whitespace-pre-line text-stone-600 leading-7">
                    {trip.itinerary}
                  </div>
                ) : (
                  <div className="text-center py-8 text-stone-500">
                    <MapPin className="w-10 h-10 mx-auto mb-3 text-stone-300" />

                    <p className="font-medium">
                      Itinerary is not available for this destination.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* MEMBERS */}
            <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">
                    Trip Members
                  </h2>

                  <p className="text-sm text-stone-500 mt-1">
                    {isCompleted
                      ? 'This trip has already ended'
                      : `${currentMembers}/${maxMembers} travelers`}
                  </p>
                </div>

                {(isCompleted || isConfirmed) && (
                  <span className="text-sm font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />

                    {isCompleted ? 'Completed' : 'Full'}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {members.map((member) => {
                  const avatar =
                    member.avatar_url ||
                    member.profile_photo_url ||
                    '';

                  const isCreator =
                    member.id === trip.user_id;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-stone-50 border border-stone-100"
                    >
                      <div className="flex items-center gap-3">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={
                              member.full_name || 'Traveler'
                            }
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center">
                            <User className="w-6 h-6 text-stone-500" />
                          </div>
                        )}

                        <div>
                          <p className="font-semibold text-stone-900">
                            {member.full_name || 'Traveler'}
                          </p>

                          <p className="text-sm text-stone-500">
                            {isCreator
                              ? 'Trip Organizer'
                              : 'Trip Member'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {member.is_verified && (
                          <span className="text-xs font-semibold text-emerald-700">
                            Verified
                          </span>
                        )}

                        {isCreator && (
                          <span className="text-xs font-semibold text-stone-600">
                            Host
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {members.length === 0 && (
                  <div className="text-center py-6 text-stone-500">
                    No accepted members found.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="space-y-6">
            {/* ORGANIZER */}
            {creator && (
              <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-stone-900 mb-5">
                  Trip Organizer
                </h2>

                <div className="flex items-center gap-3">
                  {creatorAvatar ? (
                    <img
                      src={creatorAvatar}
                      alt={
                        creator.full_name || 'Organizer'
                      }
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                      <User className="w-7 h-7 text-emerald-700" />
                    </div>
                  )}

                  <div>
                    <p className="font-bold text-stone-900">
                      {creator.full_name || 'Trip Organizer'}
                    </p>

                    {creator.is_verified && (
                      <p className="text-sm text-emerald-700 font-medium mt-1">
                        ✓ Verified
                      </p>
                    )}
                  </div>
                </div>

                {(creator.bio || creator.about_me) && (
                  <p className="text-sm text-stone-600 leading-6 mt-4">
                    {creator.bio || creator.about_me}
                  </p>
                )}

                {user?.id !== creator.id && (
                  <button
                    onClick={handleChat}
                    className="w-full mt-5 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Chat with Organizer
                  </button>
                )}
              </section>
            )}

            {/* STATUS / BUDGET SPLIT */}
            <section
              className={`rounded-2xl border p-6 shadow-sm ${
                isCompleted || isConfirmed
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-white border-stone-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center ${
                    isCompleted || isConfirmed
                      ? 'bg-emerald-100'
                      : 'bg-stone-100'
                  }`}
                >
                  {isCompleted || isConfirmed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                  ) : (
                    <Users className="w-6 h-6 text-stone-600" />
                  )}
                </div>

                <div>
                  <p
                    className={`font-bold ${
                      isCompleted || isConfirmed
                        ? 'text-emerald-800'
                        : 'text-stone-900'
                    }`}
                  >
                    {isCompleted
                      ? 'Trip Completed'
                      : isConfirmed
                        ? 'Trip Confirmed'
                        : 'Waiting for Members'}
                  </p>

                  <p className="text-sm text-stone-600">
                    {isCompleted
                      ? `Ended on ${formatDate(
                          trip.end_date
                        )}`
                      : `${currentMembers}/${maxMembers} travelers`}
                  </p>
                </div>
              </div>

              {isCompleted ? (
                <p className="text-sm text-emerald-800 leading-6">
                  This trip has already ended. It is shown here as
                  part of your travel history and is no longer
                  accepting members.
                </p>
              ) : !isConfirmed ? (
                <p className="text-sm text-stone-600 leading-6">
                  {Math.max(
                    maxMembers - currentMembers,
                    0
                  )}{' '}
                  more{' '}
                  {maxMembers - currentMembers === 1
                    ? 'traveler is'
                    : 'travelers are'}{' '}
                  needed before the trip is confirmed.
                </p>
              ) : (
                <>
                  <p className="text-sm text-emerald-800 leading-6 mb-4">
                    All traveler slots are filled. Budget Split is
                    now available for this confirmed trip.
                  </p>

                  <button
                    onClick={() =>
                      navigate(`/budget/${trip.id}`)
                    }
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >
                    <Wallet className="w-5 h-5" />
                    Budget Split
                  </button>
                </>
              )}
            </section>

            {/* CANCELLATION */}
            {canCancel && (
              <section className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-stone-900">
                      Trip Cancellation
                    </h2>

                    <p className="text-sm text-stone-600 mt-1 leading-6">
                      Cancelling a confirmed trip close to the
                      travel date may affect your Travel Reliability.
                    </p>
                  </div>
                </div>

                <button
                  onClick={openCancelModal}
                  className="w-full mt-5 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-300 bg-white text-red-600 font-semibold hover:bg-red-50 transition"
                >
                  <XCircle className="w-5 h-5" />
                  Cancel Trip
                </button>
              </section>
            )}

            {/* PLAN SUMMARY */}
            {plan && (
              <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-stone-900 mb-4">
                  Trip Plan
                </h2>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-stone-500">
                      Duration
                    </p>

                    <p className="font-semibold text-stone-900">
                      {plan.duration}
                    </p>
                  </div>

                  <div>
                    <p className="text-stone-500">
                      Approx. Budget
                    </p>

                    <p className="font-semibold text-stone-900">
                      {plan.budget}
                    </p>
                  </div>

                  <div>
                    <p className="text-stone-500">
                      Transport
                    </p>

                    <p className="font-semibold text-stone-900">
                      {plan.transport}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <button
              onClick={() => navigate('/browse-trips')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-stone-300 bg-white text-stone-700 font-semibold hover:bg-stone-50"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Browse Trips
            </button>
          </aside>
        </div>
      </main>

      {/* ============================================
          CANCELLATION MODAL
      ============================================ */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-red-600" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-stone-900">
                      Cancel This Trip?
                    </h2>

                    <p className="text-sm text-stone-600 mt-1">
                      {trip.destination}
                    </p>
                  </div>
                </div>

                {!cancelling && (
                  <button
                    onClick={closeCancelModal}
                    className="text-stone-400 hover:text-stone-700"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>

            {/* Successful cancellation */}
            {cancelResult?.success ? (
              <div className="p-6">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />

                    <div>
                      <h3 className="font-bold text-emerald-900">
                        Trip Cancelled Successfully
                      </h3>

                      <p className="text-sm text-emerald-800 mt-1">
                        Your cancellation has been recorded.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    {cancelResult.cancellation_type && (
                      <div className="flex justify-between">
                        <span className="text-stone-600">
                          Cancellation type
                        </span>

                        <span className="font-semibold text-stone-900 capitalize">
                          {cancelResult.cancellation_type}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-stone-600">
                        Strikes added
                      </span>

                      <span className="font-semibold text-stone-900">
                        {cancelResult.strikes_added ?? 0}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-stone-600">
                        Reliability penalty
                      </span>

                      <span className="font-semibold text-stone-900">
                        {cancelResult.reliability_penalty ?? 0}
                      </span>
                    </div>

                    {cancelResult.reliability_score !==
                      undefined && (
                      <div className="flex justify-between">
                        <span className="text-stone-600">
                          New reliability score
                        </span>

                        <span className="font-bold text-emerald-700">
                          {cancelResult.reliability_score}
                        </span>
                      </div>
                    )}

                    {cancelResult.emergency_review ===
                      'pending' && (
                      <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-sm text-amber-800">
                          Your emergency cancellation has been
                          submitted for review. The final penalty
                          decision will be made after review.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelResult(null);
                  }}
                  className="w-full mt-5 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Warning */}
                <div className="p-6">
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />

                      <div className="text-sm text-amber-900 leading-6">
                        <p className="font-semibold mb-1">
                          Please cancel responsibly
                        </p>

                        <p>
                          Late cancellation can affect your Travel
                          Reliability and may add cancellation
                          strikes to your account.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Emergency option */}
                  <label className="flex items-start gap-3 mt-5 p-4 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={isEmergency}
                      onChange={(e) =>
                        setIsEmergency(e.target.checked)
                      }
                      className="mt-1 w-4 h-4 accent-emerald-600"
                    />

                    <div>
                      <p className="font-semibold text-stone-900">
                        Emergency Cancellation
                      </p>

                      <p className="text-sm text-stone-600 mt-1 leading-5">
                        Select this only for a genuine emergency.
                        Emergency cancellations are submitted for
                        review.
                      </p>
                    </div>
                  </label>

                  {/* Reason */}
                  <div className="mt-5">
                    <label className="block text-sm font-semibold text-stone-800 mb-2">
                      Cancellation Reason
                    </label>

                    <textarea
                      value={cancelReason}
                      onChange={(e) =>
                        setCancelReason(e.target.value)
                      }
                      placeholder={
                        isEmergency
                          ? 'Explain the emergency...'
                          : 'Why do you need to cancel this trip?'
                      }
                      rows={4}
                      disabled={cancelling}
                      className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    />
                  </div>

                  {/* Error */}
                  {cancelError && (
                    <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4">
                      <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />

                        <div>
                          <p className="font-semibold text-red-800">
                            Cancellation unavailable
                          </p>

                          <p className="text-sm text-red-700 mt-1 leading-5">
                            {cancelError}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <button
                      onClick={closeCancelModal}
                      disabled={cancelling}
                      className="flex-1 px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-700 font-semibold hover:bg-stone-50 disabled:opacity-50"
                    >
                      Keep Trip
                    </button>

                    <button
                      onClick={handleCancelTrip}
                      disabled={
                        cancelling ||
                        !cancelReason.trim()
                      }
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cancelling ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5" />
                          Confirm Cancellation
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
