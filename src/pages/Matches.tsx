import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  MessageCircle,
  User,
  ShieldCheck,
  CheckCircle2,
  MapPin,
} from 'lucide-react';

export default function Matches() {
  const { user } = useAuth();

  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchMatches = async () => {
      try {
        setLoading(true);

        const { data: myTrips, error: myTripsError } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id);

        if (myTripsError) throw myTripsError;

        if (!myTrips || myTrips.length === 0) {
          setMatches([]);
          return;
        }

        const { data: otherTrips, error: otherTripsError } = await supabase
          .from('trips')
          .select('*')
          .neq('user_id', user.id);

        if (otherTripsError) throw otherTripsError;

        const matchedPairs: any[] = [];

        myTrips.forEach((myTrip: any) => {
          otherTrips?.forEach((trip: any) => {
            const sameDestination =
              myTrip.destination?.toLowerCase().trim() ===
              trip.destination?.toLowerCase().trim();

            const sameStartDate = myTrip.start_date === trip.start_date;
            const sameEndDate = myTrip.end_date === trip.end_date;

            if (sameDestination && sameStartDate && sameEndDate) {
              matchedPairs.push({
                myTrip,
                otherTrip: trip,
              });
            }
          });
        });

        if (matchedPairs.length === 0) {
          setMatches([]);
          return;
        }

        const uniqueUserIds = [
          ...new Set(
            matchedPairs.map((pair) => pair.otherTrip.user_id)
          ),
        ];

        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            avatar_url,
            profile_photo_url,
            bio,
            age,
            gender,
            is_verified
          `)
          .in('id', uniqueUserIds);

        if (profileError) throw profileError;

        const { data: buddyMatches, error: buddyMatchError } = await supabase
          .from('buddy_matches')
          .select('*')
          .or(
            `user1_id.eq.${user.id},user2_id.eq.${user.id}`
          );

        if (buddyMatchError) {
          console.error('Buddy match fetch error:', buddyMatchError);
        }

        const finalMatches = matchedPairs.map((pair) => {
          const profile = profiles?.find(
            (p: any) => p.id === pair.otherTrip.user_id
          );

          const existingMatch = buddyMatches?.find(
            (bm: any) =>
              (bm.user1_id === user.id &&
                bm.user2_id === pair.otherTrip.user_id) ||
              (bm.user2_id === user.id &&
                bm.user1_id === pair.otherTrip.user_id)
          );

          return {
            ...profile,
            avatar_url:
              profile?.avatar_url ||
              profile?.profile_photo_url ||
              null,
            is_verified: profile?.is_verified === true,

            myTripId: pair.myTrip.id,
            otherTripId: pair.otherTrip.id,

            destination: pair.myTrip.destination,
            startDate: pair.myTrip.start_date,
            endDate: pair.myTrip.end_date,

            buddyMatchId: existingMatch?.id || null,
            matchStatus: existingMatch?.status || 'pending',
          };
        });

        // Remove duplicate users
        const uniqueMatches = finalMatches.filter(
          (match, index, self) =>
            index === self.findIndex((m) => m.id === match.id)
        );

        setMatches(uniqueMatches);
      } catch (error) {
        console.error('Matching error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user]);

  // CONFIRM TRIP
  const handleConfirmTrip = async (buddyId: string) => {
    if (!user) return;

    try {
      setConfirming(buddyId);

      const user1 = user.id < buddyId ? user.id : buddyId;
      const user2 = user.id < buddyId ? buddyId : user.id;

      const { data: existingMatch, error: findError } = await supabase
        .from('buddy_matches')
        .select('*')
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .maybeSingle();

      if (findError) throw findError;

      if (existingMatch) {
        const { error } = await supabase
          .from('buddy_matches')
          .update({
            status: 'confirmed',
          })
          .eq('id', existingMatch.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('buddy_matches')
          .insert({
            user1_id: user1,
            user2_id: user2,
            status: 'confirmed',
            compatibility_score: 100,
          });

        if (error) throw error;
      }

      setMatches((prev) =>
        prev.map((match) =>
          match.id === buddyId
            ? { ...match, matchStatus: 'confirmed' }
            : match
        )
      );

      alert('Trip confirmed! 🎉');
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to confirm trip');
    } finally {
      setConfirming(null);
    }
  };

  // RATE
  const handleRate = async (buddyId: string) => {
    const rating = prompt('Give rating between 1 to 5');
    if (!rating) return;

    const numericRating = Number(rating);

    if (numericRating < 1 || numericRating > 5) {
      alert('Rating must be between 1 and 5.');
      return;
    }

    const { error } = await supabase
      .from('buddy_ratings')
      .insert([
        {
          reviewer_id: user?.id,
          reviewed_user_id: buddyId,
          rating: numericRating,
          review: '',
        },
      ]);

    if (error) {
      alert('Failed to submit rating');
      return;
    }

    alert('Rating submitted!');
  };

  // BLOCK
  const handleBlock = async (buddyId: string) => {
    const { error } = await supabase
      .from('blocked_users')
      .insert([
        {
          blocker_id: user?.id,
          blocked_user_id: buddyId,
        },
      ]);

    if (error) {
      alert('Failed to block user');
      return;
    }

    alert('User blocked');

    setMatches((prev) =>
      prev.filter((m) => m.id !== buddyId)
    );
  };

  // REPORT
  const handleReport = async (buddyId: string) => {
    const reason = prompt('Why are you reporting this user?');
    if (!reason) return;

    const { error } = await supabase
      .from('reports')
      .insert([
        {
          reporter_id: user?.id,
          reported_user_id: buddyId,
          reason,
        },
      ]);

    if (error) {
      alert('Failed to report user');
      return;
    }

    alert('User reported successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl font-semibold">
        Finding your travel buddies...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        <div>
          <h1 className="text-4xl font-bold text-stone-900">
            Your Travel Matches
          </h1>

          <p className="text-stone-500 mt-2">
            Travelers with similar destinations and trip dates.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          {matches.length === 0 ? (
            <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center text-stone-500">
              No matching travelers found.
            </div>
          ) : (
            matches.map((match) => (

              <div
                key={match.id}
                className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm hover:shadow-md transition"
              >

                {/* PROFILE */}
                <div className="flex items-center gap-4 mb-4">

                  {match.avatar_url ? (
                    <img
                      src={match.avatar_url}
                      alt={match.full_name || 'Traveler'}
                      className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                      <User
                        size={28}
                        className="text-emerald-700"
                      />
                    </div>
                  )}

                  <div className="min-w-0">

                    <div className="flex items-center gap-1.5">

                      <h2 className="text-xl font-semibold text-stone-900 truncate">
                        {match.full_name || 'Traveler'}
                      </h2>

                      {match.is_verified && (
                        <ShieldCheck
                          className="w-5 h-5 text-emerald-600"
                        />
                      )}

                    </div>

                    {match.is_verified && (
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">
                        Identity Verified
                      </p>
                    )}

                    {(match.age || match.gender) && (
                      <div className="flex items-center gap-2 text-sm text-stone-500 mt-1">
                        {match.age && (
                          <span>{match.age} years</span>
                        )}

                        {match.age && match.gender && (
                          <span>•</span>
                        )}

                        {match.gender && (
                          <span>{match.gender}</span>
                        )}
                      </div>
                    )}

                  </div>
                </div>

                {/* TRIP INFO */}
                <div className="rounded-2xl bg-stone-50 p-4 mb-4">

                  <p className="font-semibold text-stone-800">
                    📍 {match.destination}
                  </p>

                  <p className="text-sm text-stone-500 mt-1">
                    {match.startDate} → {match.endDate}
                  </p>

                </div>

                <p className="text-sm text-stone-600 mb-5">
                  {match.bio || 'No bio added'}
                </p>

                {/* CHAT */}
                <Link
                  to={`/chat/${match.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </Link>

                {/* CONFIRM / MEETING POINT */}

                {match.matchStatus !== 'confirmed' ? (

                  <button
                    onClick={() => handleConfirmTrip(match.id)}
                    disabled={confirming === match.id}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4" />

                    {confirming === match.id
                      ? 'Confirming...'
                      : 'Confirm Trip'}
                  </button>

                ) : (

                  <Link
                    to={`/meeting-point/${match.otherTripId}`}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-100 px-5 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-200 transition"
                  >
                    <MapPin className="w-4 h-4" />
                    Meeting Point
                  </Link>

                )}

                {/* BLOCK / REPORT */}
                <div className="flex gap-2 mt-4">

                  <button
                    onClick={() => handleBlock(match.id)}
                    className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-white font-semibold hover:bg-red-600"
                  >
                    Block
                  </button>

                  <button
                    onClick={() => handleReport(match.id)}
                    className="flex-1 rounded-xl bg-orange-500 px-4 py-2 text-white font-semibold hover:bg-orange-600"
                  >
                    Report
                  </button>

                </div>

                {/* RATE */}
                <button
                  onClick={() => handleRate(match.id)}
                  className="mt-3 w-full rounded-xl bg-yellow-500 px-4 py-2 text-white font-semibold hover:bg-yellow-600"
                >
                  Rate Buddy ⭐
                </button>

              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
}