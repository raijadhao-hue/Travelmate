import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User,
  MapPin,
  Calendar,
  MessageCircle,
  UserPlus,
  UserCheck,
  Clock,
  CheckCircle,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_photo_url?: string | null;
  bio: string | null;
  preferences: string[] | null;
  is_verified: boolean | null;
}

interface Trip {
  id: string;
  user_id: string;
  destination: string;
  description?: string | null;
  start_date: string;
  end_date: string;
}

interface Person {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_photo_url?: string | null;
  bio?: string | null;
  is_verified?: boolean | null;
}

type FriendStatus =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'friends';

type PeopleModal =
  | 'followers'
  | 'following'
  | null;

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] =
    useState<ProfileData | null>(null);

  const [trips, setTrips] =
    useState<Trip[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [friendStatus, setFriendStatus] =
    useState<FriendStatus>('none');

  const [requestLoading, setRequestLoading] =
    useState(false);

  // =====================================================
  // FOLLOWERS / FOLLOWING
  // =====================================================

  const [followers, setFollowers] =
    useState<Person[]>([]);

  const [following, setFollowing] =
    useState<Person[]>([]);

  const [peopleLoading, setPeopleLoading] =
    useState(false);

  const [peopleModal, setPeopleModal] =
    useState<PeopleModal>(null);

  const today =
    new Date().toISOString().split('T')[0];

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId, user?.id]);

  const loadProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // =================================================
      // PROFILE
      // =================================================

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
          bio,
          preferences,
          is_verified
        `)
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error(
          'Profile loading error:',
          profileError
        );
      }

      if (!profileData) {
        setProfile(null);
        return;
      }

      setProfile({
        ...profileData,
        avatar_url:
          profileData.avatar_url ||
          profileData.profile_photo_url ||
          null,

        // Make sure it is always a boolean
        is_verified:
          profileData.is_verified === true,
      });

      // =================================================
      // TRIPS
      // =================================================

      const {
        data: tripData,
        error: tripError,
      } = await supabase
        .from('trips')
        .select(`
          id,
          user_id,
          destination,
          description,
          start_date,
          end_date
        `)
        .eq('user_id', userId)
        .order('start_date', {
          ascending: true,
        });

      if (tripError) {
        console.error(
          'Trips loading error:',
          tripError
        );
      } else {
        setTrips(tripData || []);
      }

      // =================================================
      // FOLLOWERS + FOLLOWING
      // =================================================

      await loadFollowersFollowing(userId);

      // =================================================
      // FRIEND STATUS
      // =================================================

      if (
        user &&
        user.id !== userId
      ) {
        await checkFriendStatus(
          user.id,
          userId
        );
      } else {
        setFriendStatus('none');
      }

    } catch (error) {
      console.error(
        'Public profile error:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD FOLLOWERS / FOLLOWING
  // =====================================================

  const loadFollowersFollowing = async (
    profileId: string
  ) => {
    try {
      setPeopleLoading(true);

      // =================================================
      // FOLLOWERS
      // =================================================

      const {
        data: followerRows,
        error: followerError,
      } = await supabase
        .from('friend_requests')
        .select('sender_id')
        .eq(
          'receiver_id',
          profileId
        )
        .eq(
          'status',
          'accepted'
        );

      if (followerError) {
        console.error(
          'Followers rows error:',
          followerError
        );
      }

      // =================================================
      // FOLLOWING
      // =================================================

      const {
        data: followingRows,
        error: followingError,
      } = await supabase
        .from('friend_requests')
        .select('receiver_id')
        .eq(
          'sender_id',
          profileId
        )
        .eq(
          'status',
          'accepted'
        );

      if (followingError) {
        console.error(
          'Following rows error:',
          followingError
        );
      }

      const followerIds =
        followerRows?.map(
          (row: any) =>
            row.sender_id
        ) || [];

      const followingIds =
        followingRows?.map(
          (row: any) =>
            row.receiver_id
        ) || [];

      // =================================================
      // FOLLOWER PROFILES
      // =================================================

      if (
        followerIds.length > 0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            avatar_url,
            profile_photo_url,
            bio,
            is_verified
          `)
          .in(
            'id',
            followerIds
          );

        if (error) {
          console.error(
            'Follower profiles error:',
            error
          );
        }

        const formatted =
          (data || []).map(
            (person: any) => ({
              ...person,

              avatar_url:
                person.avatar_url ||
                person.profile_photo_url ||
                null,

              is_verified:
                person.is_verified === true,
            })
          );

        setFollowers(
          formatted
        );
      } else {
        setFollowers([]);
      }

      // =================================================
      // FOLLOWING PROFILES
      // =================================================

      if (
        followingIds.length > 0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            avatar_url,
            profile_photo_url,
            bio,
            is_verified
          `)
          .in(
            'id',
            followingIds
          );

        if (error) {
          console.error(
            'Following profiles error:',
            error
          );
        }

        const formatted =
          (data || []).map(
            (person: any) => ({
              ...person,

              avatar_url:
                person.avatar_url ||
                person.profile_photo_url ||
                null,

              is_verified:
                person.is_verified === true,
            })
          );

        setFollowing(
          formatted
        );
      } else {
        setFollowing([]);
      }

    } catch (error) {
      console.error(
        'Followers/following error:',
        error
      );
    } finally {
      setPeopleLoading(false);
    }
  };

  // =====================================================
  // OPEN PEOPLE MODAL
  // =====================================================

  const openPeopleModal = (
    type: PeopleModal
  ) => {
    setPeopleModal(type);
  };

  const closePeopleModal = () => {
    setPeopleModal(null);
  };

  // =====================================================
  // OPEN OTHER PROFILE
  // =====================================================

  const openPersonProfile = (
    id: string
  ) => {
    setPeopleModal(null);
    navigate(
      `/public-profile/${id}`
    );
  };

  // =====================================================
  // CHECK FRIEND REQUEST STATUS
  // =====================================================

  const checkFriendStatus = async (
    currentUserId: string,
    otherUserId: string
  ) => {
    try {
      const {
        data: sentRequest,
        error: sentError,
      } = await supabase
        .from('friend_requests')
        .select(
          'id, sender_id, receiver_id, status'
        )
        .eq(
          'sender_id',
          currentUserId
        )
        .eq(
          'receiver_id',
          otherUserId
        )
        .maybeSingle();

      if (sentError) {
        console.error(
          'Sent request check error:',
          sentError
        );
      }

      if (sentRequest) {
        if (
          sentRequest.status ===
          'accepted'
        ) {
          setFriendStatus(
            'friends'
          );
        } else {
          setFriendStatus(
            'pending_sent'
          );
        }

        return;
      }

      const {
        data: receivedRequest,
        error: receivedError,
      } = await supabase
        .from('friend_requests')
        .select(
          'id, sender_id, receiver_id, status'
        )
        .eq(
          'sender_id',
          otherUserId
        )
        .eq(
          'receiver_id',
          currentUserId
        )
        .maybeSingle();

      if (receivedError) {
        console.error(
          'Received request check error:',
          receivedError
        );
      }

      if (receivedRequest) {
        if (
          receivedRequest.status ===
          'accepted'
        ) {
          setFriendStatus(
            'friends'
          );
        } else {
          setFriendStatus(
            'pending_received'
          );
        }

        return;
      }

      setFriendStatus('none');

    } catch (error) {
      console.error(
        'Friend status error:',
        error
      );

      setFriendStatus('none');
    }
  };

  // =====================================================
  // SEND FRIEND REQUEST
  // =====================================================

  const sendFriendRequest = async () => {
    if (
      !user ||
      !userId ||
      user.id === userId
    ) {
      return;
    }

    try {
      setRequestLoading(true);

      const {
        data: sentRequest,
      } = await supabase
        .from('friend_requests')
        .select(
          'id, sender_id, receiver_id, status'
        )
        .eq(
          'sender_id',
          user.id
        )
        .eq(
          'receiver_id',
          userId
        )
        .maybeSingle();

      if (sentRequest) {
        if (
          sentRequest.status ===
          'accepted'
        ) {
          setFriendStatus(
            'friends'
          );
        } else {
          setFriendStatus(
            'pending_sent'
          );
        }

        return;
      }

      const {
        data: receivedRequest,
      } = await supabase
        .from('friend_requests')
        .select(
          'id, sender_id, receiver_id, status'
        )
        .eq(
          'sender_id',
          userId
        )
        .eq(
          'receiver_id',
          user.id
        )
        .maybeSingle();

      if (receivedRequest) {
        if (
          receivedRequest.status ===
          'accepted'
        ) {
          setFriendStatus(
            'friends'
          );
        } else {
          setFriendStatus(
            'pending_received'
          );
        }

        return;
      }

      const {
        error: insertError,
      } = await supabase
        .from('friend_requests')
        .insert({
          sender_id:
            user.id,

          receiver_id:
            userId,

          status:
            'pending',
        });

      if (insertError) {
        console.error(
          'Friend request insert error:',
          insertError
        );

        alert(
          `Friend request failed: ${insertError.message}`
        );

        return;
      }

      setFriendStatus(
        'pending_sent'
      );

    } catch (error: any) {
      console.error(
        'Send friend request error:',
        error
      );

      alert(
        error?.message ||
        'Failed to send friend request.'
      );
    } finally {
      setRequestLoading(false);
    }
  };

  // =====================================================
  // ACCEPT FRIEND REQUEST
  // =====================================================

  const acceptFriendRequest =
    async () => {
      if (
        !user ||
        !userId
      ) {
        return;
      }

      try {
        setRequestLoading(
          true
        );

        const {
          error,
        } = await supabase
          .from(
            'friend_requests'
          )
          .update({
            status:
              'accepted',
          })
          .eq(
            'sender_id',
            userId
          )
          .eq(
            'receiver_id',
            user.id
          )
          .eq(
            'status',
            'pending'
          );

        if (error) {
          console.error(
            'Accept request error:',
            error
          );

          alert(
            `Could not accept request: ${error.message}`
          );

          return;
        }

        setFriendStatus(
          'friends'
        );

        await loadFollowersFollowing(
          userId
        );

      } catch (error: any) {
        console.error(
          'Accept request error:',
          error
        );

        alert(
          error?.message ||
          'Could not accept friend request.'
        );
      } finally {
        setRequestLoading(
          false
        );
      }
    };

  // =====================================================
  // CANCEL REQUEST
  // =====================================================

  const cancelRequest =
    async () => {
      if (
        !user ||
        !userId
      ) {
        return;
      }

      try {
        setRequestLoading(
          true
        );

        const {
          error,
        } = await supabase
          .from(
            'friend_requests'
          )
          .delete()
          .eq(
            'sender_id',
            user.id
          )
          .eq(
            'receiver_id',
            userId
          );

        if (error) {
          console.error(
            'Cancel request error:',
            error
          );

          alert(
            `Could not cancel request: ${error.message}`
          );

          return;
        }

        setFriendStatus(
          'none'
        );

      } catch (error: any) {
        console.error(
          'Cancel request error:',
          error
        );
      } finally {
        setRequestLoading(
          false
        );
      }
    };

  // =====================================================
  // MESSAGE
  // =====================================================

  const handleMessage =
    () => {
      if (!userId) return;

      navigate(
        `/chat/${userId}`
      );
    };

  // =====================================================
  // DATE FORMAT
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
        year: 'numeric',
      }
    );
  };

  // =====================================================
  // PHOTO
  // =====================================================

  const profilePhoto =
    profile?.avatar_url ||
    profile?.profile_photo_url ||
    '';

  // =====================================================
  // TRIPS
  // =====================================================

  const futureTrips =
    trips.filter(
      (trip) =>
        trip.end_date &&
        trip.end_date >= today
    );

  const pastTrips =
    trips.filter(
      (trip) =>
        trip.end_date &&
        trip.end_date < today
    );

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">

        <div className="text-center">

          <Loader2
            className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-3"
          />

          <p className="text-stone-500">
            Loading profile...
          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // NOT FOUND
  // =====================================================

  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-5">

        <div className="bg-white rounded-2xl p-8 text-center shadow">

          <User
            className="w-12 h-12 text-stone-300 mx-auto mb-4"
          />

          <h2 className="text-xl font-bold">
            User not found
          </h2>

          <button
            onClick={() =>
              navigate(-1)
            }
            className="mt-5 px-5 py-2.5 bg-emerald-600 text-white rounded-xl"
          >
            Go Back
          </button>

        </div>

      </div>
    );
  }

  const name =
    profile.full_name?.trim() ||
    'Traveler';

  // =====================================================
  // MODAL
  // =====================================================

  const modalPeople =
    peopleModal ===
    'followers'
      ? followers
      : following;

  const modalTitle =
    peopleModal ===
    'followers'
      ? 'Followers'
      : 'Following';

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-8">

      <div className="max-w-5xl mx-auto">

        {/* BACK */}

        <button
          onClick={() =>
            navigate(-1)
          }
          className="flex items-center gap-2 text-stone-600 hover:text-emerald-600 mb-5"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* =================================================
            PROFILE HEADER
        ================================================= */}

        <div className="bg-white rounded-3xl shadow-lg border border-stone-200 overflow-hidden">

          {/* COVER */}

          <div className="h-32 md:h-44 bg-gradient-to-r from-emerald-600 to-teal-600" />

          <div className="px-6 md:px-10 pb-8">

            <div className="flex flex-col md:flex-row gap-6 items-center md:items-end -mt-16">

              {/* PHOTO */}

              <div className="w-32 h-32 rounded-full border-4 border-white bg-emerald-50 shadow-lg overflow-hidden flex items-center justify-center shrink-0">

                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display =
                        'none';
                    }}
                  />
                ) : (
                  <User
                    size={50}
                    className="text-emerald-600"
                  />
                )}

              </div>

              {/* NAME + VERIFIED BADGE */}

              <div className="flex-1 text-center md:text-left">

                <div className="flex items-center justify-center md:justify-start gap-2">

                  <h1 className="text-3xl font-bold text-stone-900">
                    {name}
                  </h1>

                  {profile.is_verified === true && (
                    <span
                      title="Identity Verified"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white shrink-0"
                    >
                      <ShieldCheck
                        size={17}
                        strokeWidth={3}
                      />
                    </span>
                  )}

                </div>

                {profile.is_verified === true && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    Identity Verified
                  </p>
                )}

              </div>

              {/* ACTIONS */}

              {user?.id !==
                profile.id && (

                <div className="flex flex-wrap justify-center gap-3">

                  {/* MESSAGE */}

                  <button
                    onClick={
                      handleMessage
                    }
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 transition"
                  >
                    <MessageCircle
                      size={18}
                    />
                    Message
                  </button>

                  {/* ADD FRIEND */}

                  {friendStatus ===
                    'none' && (
                    <button
                      onClick={
                        sendFriendRequest
                      }
                      disabled={
                        requestLoading
                      }
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {requestLoading ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <UserPlus
                          size={18}
                        />
                      )}

                      Add Friend
                    </button>
                  )}

                  {/* REQUESTED */}

                  {friendStatus ===
                    'pending_sent' && (
                    <button
                      onClick={
                        cancelRequest
                      }
                      disabled={
                        requestLoading
                      }
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200"
                    >
                      <Clock
                        size={18}
                      />

                      Requested
                    </button>
                  )}

                  {/* ACCEPT */}

                  {friendStatus ===
                    'pending_received' && (
                    <button
                      onClick={
                        acceptFriendRequest
                      }
                      disabled={
                        requestLoading
                      }
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {requestLoading ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <UserCheck
                          size={18}
                        />
                      )}

                      Accept
                    </button>
                  )}

                  {/* FRIENDS */}

                  {friendStatus ===
                    'friends' && (
                    <button
                      disabled
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-semibold"
                    >
                      <UserCheck
                        size={18}
                      />

                      Friends
                    </button>
                  )}

                </div>

              )}

            </div>

            {/* BIO */}

            <div className="mt-7">

              <p className="text-stone-700 text-center md:text-left leading-relaxed">
                {profile.bio ||
                  'Hey! I love travelling and exploring new places 🌍'}
              </p>

            </div>

            {/* INTERESTS */}

            {profile.preferences &&
              profile.preferences.length >
                0 && (

                <div className="mt-5">

                  <h3 className="font-bold text-stone-900 mb-3">
                    Travel Interests
                  </h3>

                  <div className="flex flex-wrap gap-2">

                    {profile.preferences.map(
                      (
                        preference
                      ) => (
                        <span
                          key={
                            preference
                          }
                          className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold"
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
                STATS
            ================================================= */}

            <div className="grid grid-cols-3 gap-3 mt-7">

              {/* TRIPS */}

              <div className="bg-stone-50 rounded-2xl p-4 text-center">

                <p className="text-2xl font-bold text-stone-900">
                  {trips.length}
                </p>

                <p className="text-xs text-stone-500">
                  Trips
                </p>

              </div>

              {/* FOLLOWERS */}

              <button
                type="button"
                onClick={() =>
                  openPeopleModal(
                    'followers'
                  )
                }
                className="bg-stone-50 rounded-2xl p-4 text-center hover:bg-emerald-50 transition cursor-pointer"
              >

                <p className="text-2xl font-bold text-stone-900">
                  {
                    followers.length
                  }
                </p>

                <p className="text-xs text-stone-500">
                  Followers
                </p>

              </button>

              {/* FOLLOWING */}

              <button
                type="button"
                onClick={() =>
                  openPeopleModal(
                    'following'
                  )
                }
                className="bg-stone-50 rounded-2xl p-4 text-center hover:bg-emerald-50 transition cursor-pointer"
              >

                <p className="text-2xl font-bold text-stone-900">
                  {
                    following.length
                  }
                </p>

                <p className="text-xs text-stone-500">
                  Following
                </p>

              </button>

            </div>

            <p className="text-center text-xs text-stone-400 mt-3">
              Tap followers or following to view the list
            </p>

          </div>

        </div>

        {/* =================================================
            FUTURE TRIPS
        ================================================= */}

        <div className="bg-white rounded-3xl shadow-lg border border-stone-200 p-6 md:p-8 mt-7">

          <div className="flex items-center gap-3 mb-6">

            <Clock
              className="text-emerald-600"
              size={24}
            />

            <div>

              <h2 className="text-2xl font-bold">
                Future Trips
              </h2>

              <p className="text-sm text-stone-500">
                Upcoming travel plans
              </p>

            </div>

          </div>

          {futureTrips.length ===
          0 ? (

            <p className="text-stone-500 text-center py-8">
              No upcoming trips.
            </p>

          ) : (

            <div className="grid md:grid-cols-2 gap-5">

              {futureTrips.map(
                (trip) => (

                  <div
                    key={
                      trip.id
                    }
                    className="border border-stone-200 rounded-2xl p-5 hover:shadow-md transition"
                  >

                    <div className="flex items-center gap-2 mb-3">

                      <MapPin
                        size={19}
                        className="text-emerald-600"
                      />

                      <h3 className="text-lg font-bold">
                        {
                          trip.destination
                        }
                      </h3>

                    </div>

                    {trip.description && (
                      <p className="text-stone-600 text-sm mb-3">
                        {
                          trip.description
                        }
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-sm text-stone-500">

                      <Calendar
                        size={16}
                      />

                      {formatDate(
                        trip.start_date
                      )}

                      {' → '}

                      {formatDate(
                        trip.end_date
                      )}

                    </div>

                    <Link
                      to={`/trip/${trip.id}`}
                      className="inline-block mt-4 text-emerald-600 font-semibold hover:underline"
                    >
                      View Trip →
                    </Link>

                  </div>

                )
              )}

            </div>

          )}

        </div>

        {/* =================================================
            PAST TRIPS
        ================================================= */}

        <div className="bg-white rounded-3xl shadow-lg border border-stone-200 p-6 md:p-8 mt-7 mb-8">

          <div className="flex items-center gap-3 mb-6">

            <CheckCircle
              className="text-emerald-600"
              size={24}
            />

            <div>

              <h2 className="text-2xl font-bold">
                Past & Published Trips
              </h2>

              <p className="text-sm text-stone-500">
                Trips this traveller has completed
              </p>

            </div>

          </div>

          {pastTrips.length ===
          0 ? (

            <p className="text-stone-500 text-center py-8">
              No completed trips yet.
            </p>

          ) : (

            <div className="grid md:grid-cols-2 gap-5">

              {pastTrips.map(
                (trip) => (

                  <div
                    key={
                      trip.id
                    }
                    className="border border-stone-200 rounded-2xl p-5 bg-stone-50"
                  >

                    <div className="flex items-center gap-2 mb-3">

                      <MapPin
                        size={19}
                        className="text-emerald-600"
                      />

                      <h3 className="text-lg font-bold">
                        {
                          trip.destination
                        }
                      </h3>

                    </div>

                    {trip.description && (
                      <p className="text-stone-600 text-sm mb-3">
                        {
                          trip.description
                        }
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-sm text-stone-500 mb-3">

                      <Calendar
                        size={16}
                      />

                      {formatDate(
                        trip.start_date
                      )}

                      {' → '}

                      {formatDate(
                        trip.end_date
                      )}

                    </div>

                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">

                      <CheckCircle
                        size={16}
                      />

                      Completed

                    </div>

                    <Link
                      to={`/trip/${trip.id}`}
                      className="inline-block mt-3 text-emerald-600 font-semibold hover:underline"
                    >
                      View Trip →
                    </Link>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </div>

      {/* =====================================================
          FOLLOWERS / FOLLOWING MODAL
      ===================================================== */}

      {peopleModal && (

        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={
            closePeopleModal
          }
        >

          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">

                  <Users
                    size={20}
                    className="text-emerald-600"
                  />

                </div>

                <div>

                  <h2 className="text-xl font-bold text-stone-900">
                    {
                      modalTitle
                    }
                  </h2>

                  <p className="text-xs text-stone-500">
                    {
                      modalPeople.length
                    }{' '}
                    {modalPeople.length ===
                    1
                      ? 'person'
                      : 'people'}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  closePeopleModal
                }
                className="w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center"
              >
                <X size={20} />
              </button>

            </div>

            {/* CONTENT */}

            <div className="max-h-[65vh] overflow-y-auto">

              {peopleLoading ? (

                <div className="py-12 text-center">

                  <Loader2
                    size={30}
                    className="animate-spin text-emerald-600 mx-auto mb-3"
                  />

                  <p className="text-stone-500">
                    Loading...
                  </p>

                </div>

              ) : modalPeople.length ===
                0 ? (

                <div className="py-12 text-center px-6">

                  <Users
                    size={45}
                    className="text-stone-300 mx-auto mb-3"
                  />

                  <p className="font-semibold text-stone-700">
                    {peopleModal ===
                    'followers'
                      ? 'No followers yet'
                      : 'Not following anyone yet'}
                  </p>

                  <p className="text-sm text-stone-400 mt-1">
                    This list is empty.
                  </p>

                </div>

              ) : (

                <div className="divide-y divide-stone-100">

                  {modalPeople.map(
                    (person) => {

                      const personName =
                        person.full_name?.trim() ||
                        'Traveler';

                      const personPhoto =
                        person.avatar_url ||
                        person.profile_photo_url ||
                        '';

                      return (

                        <button
                          key={
                            person.id
                          }
                          type="button"
                          onClick={() =>
                            openPersonProfile(
                              person.id
                            )
                          }
                          className="w-full flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition text-left"
                        >

                          {/* PHOTO */}

                          <div className="w-14 h-14 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center shrink-0 border border-stone-200">

                            {personPhoto ? (

                              <img
                                src={
                                  personPhoto
                                }
                                alt={
                                  personName
                                }
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(
                                  e
                                ) => {
                                  e.currentTarget.style.display =
                                    'none';
                                }}
                              />

                            ) : (

                              <span className="text-xl font-bold text-emerald-600">

                                {personName
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}

                              </span>

                            )}

                          </div>

                          {/* INFO */}

                          <div className="flex-1 min-w-0">

                            <div className="flex items-center gap-1">

                              <p className="font-bold text-stone-900 truncate">
                                {
                                  personName
                                }
                              </p>

                              {person.is_verified ===
                                true && (
                                <span
                                  title="Identity Verified"
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white shrink-0"
                                >
                                  <ShieldCheck
                                    size={
                                      13
                                    }
                                    strokeWidth={
                                      3
                                    }
                                  />
                                </span>
                              )}

                            </div>

                            {person.bio && (

                              <p className="text-sm text-stone-500 truncate mt-0.5">
                                {
                                  person.bio
                                }
                              </p>

                            )}

                            <p className="text-xs text-emerald-600 mt-1 font-medium">
                              View profile →
                            </p>

                          </div>

                        </button>

                      );
                    }
                  )}

                </div>

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}