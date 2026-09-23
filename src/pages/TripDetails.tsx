import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Clock,
  Hotel,
  Bus,
  CheckCircle2,
  Loader2,
  User,
  Navigation,
  MessageCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Trip {
  id: string;
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string;
  max_members?: number;
  buddy_limit?: number;
  budget?: number;
  accommodation?: string;
  transport?: string;
  itinerary?: string;
  status?: string;
  created_at?: string;
}

interface Profile {
  id: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  profile_photo_url?: string;
  is_verified?: boolean;
  about_me?: string;
  bio?: string;
}

export default function TripDetails() {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tripId) {
      fetchTripDetails();
    }
  }, [tripId]);

  const fetchTripDetails = async () => {
    try {
      setLoading(true);
      setError('');

      if (!tripId) {
        setError('Trip not found.');
        return;
      }

      // -----------------------------
      // FETCH TRIP
      // -----------------------------
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) {
        console.error('Trip fetch error:', tripError);
        setError('Unable to load trip details.');
        return;
      }

      setTrip(tripData);

      // -----------------------------
      // FETCH CREATOR PROFILE
      // -----------------------------
      if (tripData?.user_id) {
        const { data: creatorData, error: creatorError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', tripData.user_id)
          .single();

        if (!creatorError && creatorData) {
          setCreator(creatorData);
        }
      }

      // -----------------------------
      // FETCH ACCEPTED MEMBERS
      // -----------------------------
      const { data: memberRows, error: memberError } = await supabase
        .from('trip_members')
        .select('user_id, status')
        .eq('trip_id', tripId)
        .eq('status', 'accepted');

      if (memberError) {
        console.error('Members fetch error:', memberError);
        setMembers([]);
        return;
      }

      const memberIds =
        memberRows?.map((member) => member.user_id).filter(Boolean) || [];

      if (memberIds.length > 0) {
        const { data: memberProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', memberIds);

        if (!profileError && memberProfiles) {
          setMembers(memberProfiles);
        } else {
          setMembers([]);
        }
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Something went wrong while loading the trip.');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  // LOADING
  // ----------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
          <p className="text-stone-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // ERROR / NO TRIP
  // ----------------------------------------
  if (error || !trip) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center max-w-md w-full">
          <p className="text-red-600 font-semibold mb-4">
            {error || 'Trip not found.'}
          </p>

          <button
            onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // MEMBER COUNT
  // ----------------------------------------
  const maxMembers =
    Number(trip.max_members) ||
    Number(trip.buddy_limit || 1) + 1;

  /*
   * Usually the trip creator is NOT stored inside trip_members.
   * Therefore we count creator separately.
   *
   * If creator already exists inside trip_members,
   * we don't count them twice.
   */
  const creatorAlreadyInMembers = members.some(
    (member) => member.id === trip.user_id
  );

  const currentMembers = creatorAlreadyInMembers
    ? members.length
    : members.length + 1;

  const isTripFull = currentMembers >= maxMembers;

  // If database already has confirmed status,
  // also treat it as confirmed.
  const isTripConfirmed =
    isTripFull || trip.status === 'confirmed';

  // ----------------------------------------
  // DATE FORMAT
  // ----------------------------------------
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // ----------------------------------------
  // CREATOR AVATAR
  // ----------------------------------------
  const creatorAvatar =
    creator?.avatar_url ||
    creator?.profile_photo_url ||
    '';

  // ----------------------------------------
  // CHAT CREATOR
  // ----------------------------------------
  const handleChat = () => {
    if (!creator?.id) return;

    navigate(`/chat/${creator.id}`);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ---------------------------------- */}
      {/* HEADER */}
      {/* ---------------------------------- */}
      <header className="sticky top-0 z-30 bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-stone-700 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
        </div>
      </header>

      {/* ---------------------------------- */}
      {/* MAIN */}
      {/* ---------------------------------- */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* TITLE */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-700 mb-2">
                TravelMate Trip
              </p>

              <h1 className="text-3xl sm:text-4xl font-bold text-stone-900">
                {trip.destination}
              </h1>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-stone-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-700" />
                  <span>
                    {formatDate(trip.start_date)} –{' '}
                    {formatDate(trip.end_date)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-700" />
                  <span>
                    {currentMembers}/{maxMembers} travelers
                  </span>
                </div>
              </div>
            </div>

            {/* CONFIRMED BADGE */}
            {isTripConfirmed && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 font-semibold self-start">
                <CheckCircle2 className="w-5 h-5" />
                Trip Confirmed
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------- */}
        {/* BASIC TRIP DETAILS */}
        {/* ---------------------------------- */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT / MAIN */}
          <div className="lg:col-span-2 space-y-6">
            {/* DESCRIPTION CARD */}
            <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-stone-900 mb-4">
                About This Trip
              </h2>

              <p className="text-stone-600 leading-7 whitespace-pre-line">
                {trip.description ||
                  'No description has been added for this trip.'}
              </p>

              {/* -------------------------------- */}
              {/* TRIP CONFIRMED + BUDGET SPLIT */}
              {/* -------------------------------- */}
              {isTripConfirmed && (
                <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                    </div>

                    <div>
                      <p className="font-bold text-emerald-800">
                        Trip Confirmed
                      </p>

                      <p className="text-sm text-emerald-700">
                        All {maxMembers} travelers have joined this trip.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/budget/${trip.id}`)}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition"
                  >
                    <span className="text-lg">₹</span>
                    Budget Split
                  </button>
                </div>
              )}

              {/* NOT FULL */}
              {!isTripConfirmed && (
                <div className="mt-6 p-5 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center">
                      <Users className="w-6 h-6 text-stone-600" />
                    </div>

                    <div>
                      <p className="font-semibold text-stone-800">
                        Waiting for travelers
                      </p>

                      <p className="text-sm text-stone-600">
                        {Math.max(maxMembers - currentMembers, 0)} more{' '}
                        {maxMembers - currentMembers === 1
                          ? 'traveler'
                          : 'travelers'}{' '}
                        needed to confirm this trip.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* -------------------------------- */}
            {/* TRIP INFORMATION */}
            {/* -------------------------------- */}
            <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-stone-900 mb-5">
                Trip Information
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* DESTINATION */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-stone-50">
                  <MapPin className="w-5 h-5 text-emerald-700 mt-0.5" />

                  <div>
                    <p className="text-xs text-stone-500 mb-1">
                      Destination
                    </p>

                    <p className="font-semibold text-stone-900">
                      {trip.destination}
                    </p>
                  </div>
                </div>

                {/* DATES */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-stone-50">
                  <Calendar className="w-5 h-5 text-emerald-700 mt-0.5" />

                  <div>
                    <p className="text-xs text-stone-500 mb-1">
                      Travel Dates
                    </p>

                    <p className="font-semibold text-stone-900">
                      {formatDate(trip.start_date)}
                    </p>

                    <p className="text-sm text-stone-600">
                      to {formatDate(trip.end_date)}
                    </p>
                  </div>
                </div>

                {/* MEMBERS */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-stone-50">
                  <Users className="w-5 h-5 text-emerald-700 mt-0.5" />

                  <div>
                    <p className="text-xs text-stone-500 mb-1">
                      Travelers
                    </p>

                    <p className="font-semibold text-stone-900">
                      {currentMembers} / {maxMembers}
                    </p>
                  </div>
                </div>

                {/* STATUS */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-stone-50">
                  <CheckCircle2
                    className={`w-5 h-5 mt-0.5 ${
                      isTripConfirmed
                        ? 'text-emerald-700'
                        : 'text-stone-500'
                    }`}
                  />

                  <div>
                    <p className="text-xs text-stone-500 mb-1">
                      Status
                    </p>

                    <p
                      className={`font-semibold ${
                        isTripConfirmed
                          ? 'text-emerald-700'
                          : 'text-stone-800'
                      }`}
                    >
                      {isTripConfirmed
                        ? 'Confirmed'
                        : 'Waiting for members'}
                    </p>
                  </div>
                </div>

                {/* ACCOMMODATION */}
                {trip.accommodation && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-stone-50">
                    <Hotel className="w-5 h-5 text-emerald-700 mt-0.5" />

                    <div>
                      <p className="text-xs text-stone-500 mb-1">
                        Accommodation
                      </p>

                      <p className="font-semibold text-stone-900">
                        {trip.accommodation}
                      </p>
                    </div>
                  </div>
                )}

                {/* TRANSPORT */}
                {trip.transport && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-stone-50">
                    <Bus className="w-5 h-5 text-emerald-700 mt-0.5" />

                    <div>
                      <p className="text-xs text-stone-500 mb-1">
                        Transport
                      </p>

                      <p className="font-semibold text-stone-900">
                        {trip.transport}
                      </p>
                    </div>
                  </div>
                )}

                {/* BUDGET */}
                {trip.budget !== undefined &&
                  trip.budget !== null && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-stone-50">
                      <span className="text-xl font-bold text-emerald-700">
                        ₹
                      </span>

                      <div>
                        <p className="text-xs text-stone-500 mb-1">
                          Estimated Budget
                        </p>

                        <p className="font-semibold text-stone-900">
                          ₹{Number(trip.budget).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </section>

            {/* -------------------------------- */}
            {/* ITINERARY */}
            {/* -------------------------------- */}
            {trip.itinerary && (
              <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Navigation className="w-5 h-5 text-emerald-700" />

                  <h2 className="text-xl font-bold text-stone-900">
                    Itinerary
                  </h2>
                </div>

                <div className="text-stone-600 leading-7 whitespace-pre-line">
                  {trip.itinerary}
                </div>
              </section>
            )}

            {/* -------------------------------- */}
            {/* MEMBERS */}
            {/* -------------------------------- */}
            <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">
                    Trip Members
                  </h2>

                  <p className="text-sm text-stone-500 mt-1">
                    {currentMembers} of {maxMembers} travelers
                  </p>
                </div>

                {isTripConfirmed && (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Full
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {/* CREATOR */}
                {creator && (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="flex items-center gap-3">
                      {creatorAvatar ? (
                        <img
                          src={creatorAvatar}
                          alt={creator.full_name || 'Trip creator'}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-emerald-700" />
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-stone-900">
                          {creator.full_name || 'Trip Creator'}
                        </p>

                        <p className="text-sm text-emerald-700">
                          Trip Creator
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Host
                    </div>
                  </div>
                )}

                {/* MEMBERS */}
                {members
                  .filter((member) => member.id !== trip.user_id)
                  .map((member) => {
                    const avatar =
                      member.avatar_url ||
                      member.profile_photo_url ||
                      '';

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-stone-50 border border-stone-100"
                      >
                        <div className="flex items-center gap-3">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={member.full_name || 'Member'}
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
                              Trip Member
                            </p>
                          </div>
                        </div>

                        {member.is_verified && (
                          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="w-4 h-4" />
                            Verified
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* NO OTHER MEMBERS */}
                {members.filter(
                  (member) => member.id !== trip.user_id
                ).length === 0 && (
                  <div className="text-center py-6 text-stone-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />

                    <p>No other travelers have joined yet.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ---------------------------------- */}
          {/* RIGHT SIDEBAR */}
          {/* ---------------------------------- */}
          <div className="space-y-6">
            {/* CREATOR CARD */}
            {creator && (
              <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-stone-900 mb-5">
                  Trip Organizer
                </h2>

                <div className="flex items-center gap-3 mb-5">
                  {creatorAvatar ? (
                    <img
                      src={creatorAvatar}
                      alt={creator.full_name || 'Trip Organizer'}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center">
                      <User className="w-7 h-7 text-stone-500" />
                    </div>
                  )}

                  <div>
                    <p className="font-bold text-stone-900">
                      {creator.full_name || 'Trip Organizer'}
                    </p>

                    {creator.is_verified && (
                      <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                        Verified
                      </div>
                    )}
                  </div>
                </div>

                {creator.bio && (
                  <p className="text-sm text-stone-600 leading-6 mb-5">
                    {creator.bio}
                  </p>
                )}

                {creator.about_me && !creator.bio && (
                  <p className="text-sm text-stone-600 leading-6 mb-5">
                    {creator.about_me}
                  </p>
                )}

                {user?.id !== creator.id && (
                  <button
                    onClick={handleChat}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Chat with Organizer
                  </button>
                )}
              </section>
            )}

            {/* TRIP STATUS CARD */}
            <section
              className={`rounded-2xl border shadow-sm p-6 ${
                isTripConfirmed
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-white border-stone-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center ${
                    isTripConfirmed
                      ? 'bg-emerald-100'
                      : 'bg-stone-100'
                  }`}
                >
                  {isTripConfirmed ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                  ) : (
                    <Clock className="w-6 h-6 text-stone-600" />
                  )}
                </div>

                <div>
                  <p
                    className={`font-bold ${
                      isTripConfirmed
                        ? 'text-emerald-800'
                        : 'text-stone-900'
                    }`}
                  >
                    {isTripConfirmed
                      ? 'Trip Confirmed'
                      : 'Trip Not Confirmed'}
                  </p>

                  <p className="text-sm text-stone-600">
                    {currentMembers}/{maxMembers} travelers
                  </p>
                </div>
              </div>

              {isTripConfirmed ? (
                <>
                  <p className="text-sm text-emerald-800 mb-4">
                    The trip has reached its maximum traveler capacity.
                    You can now manage shared expenses.
                  </p>

                  <button
                    onClick={() => navigate(`/budget/${trip.id}`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition"
                  >
                    <span className="text-lg">₹</span>
                    Open Budget Split
                  </button>
                </>
              ) : (
                <p className="text-sm text-stone-600 leading-6">
                  This trip will be confirmed when all{' '}
                  <strong>{maxMembers}</strong> traveler slots are filled.
                </p>
              )}
            </section>

            {/* BACK BUTTON */}
            <button
              onClick={() => navigate('/browse-trips')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-stone-300 bg-white text-stone-700 font-semibold hover:bg-stone-50 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Browse Trips
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}