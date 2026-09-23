import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar,
  MapPin,
  Heart,
  MessageCircle,
  User,
  Users,
  UsersRound,
  Lock,
  UserPlus,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

export default function BrowseTrips() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [trips, setTrips] = useState<any[]>([]);
  const [savedTripIds, setSavedTripIds] = useState<Set<string>>(
    new Set()
  );

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [requestingTripId, setRequestingTripId] =
    useState<string | null>(null);

  // =====================================================
  // LOCAL DATE
  // =====================================================

  const getTodayDate = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // FETCH ALL DATA
  // =====================================================

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const today = getTodayDate();

      // =================================================
      // 1. NORMAL FUTURE TRIPS
      // =================================================

      const {
        data: tripsData,
        error: tripsError,
      } = await supabase
        .from('trips')
        .select('*')
        .gte('start_date', today)
        .order('start_date', { ascending: true });

      if (tripsError) {
        console.error('Trips fetch error:', tripsError);
        throw tripsError;
      }

      // =================================================
      // 2. FUTURE GROUPS
      // =================================================

      const {
        data: groupsData,
        error: groupsError,
      } = await supabase
        .from('travel_groups')
        .select('*')
        .gte('start_date', today)
        .order('start_date', { ascending: true });

      if (groupsError) {
        console.error('Groups fetch error:', groupsError);
      }

      // =================================================
      // 3. CREATOR IDS
      // =================================================

      const normalCreatorIds = (tripsData || [])
        .map((trip) => trip.user_id)
        .filter(Boolean);

      const groupCreatorIds = (groupsData || [])
        .map((group) => group.created_by)
        .filter(Boolean);

      const userIds = [
        ...new Set([
          ...normalCreatorIds,
          ...groupCreatorIds,
        ]),
      ];

      // =================================================
      // 4. FETCH PROFILES
      // =================================================

      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const {
          data: profilesData,
          error: profilesError,
        } = await supabase
          .from('profiles')
          .select(
            'id, full_name, avatar_url, profile_photo_url'
          )
          .in('id', userIds);

        if (profilesError) {
          console.error(
            'Profiles fetch error:',
            profilesError
          );
        } else {
          profilesMap = (profilesData || []).reduce(
            (acc: Record<string, any>, profile: any) => {
              acc[profile.id] = profile;
              return acc;
            },
            {}
          );
        }
      }

      // =================================================
      // 5. NORMAL TRIP MEMBERS
      // =================================================

      const tripIds = (tripsData || [])
        .map((trip) => trip.id)
        .filter(Boolean);

      let tripMemberCounts: Record<string, number> = {};
      let currentUserTripStatus: Record<string, string> = {};

      if (tripIds.length > 0) {
        const {
          data: tripMembersData,
          error: tripMembersError,
        } = await supabase
          .from('trip_members')
          .select('trip_id, user_id, status')
          .in('trip_id', tripIds);

        if (tripMembersError) {
          console.error(
            'Trip members fetch error:',
            tripMembersError
          );

          /*
           * If trip_members table/RLS has an issue,
           * don't silently show wrong capacity.
           */
          throw tripMembersError;
        }

        (tripMembersData || []).forEach((member: any) => {
          // Only ACCEPTED members occupy capacity
          if (member.status === 'accepted') {
            tripMemberCounts[member.trip_id] =
              (tripMemberCounts[member.trip_id] || 0) + 1;
          }

          // Current user's membership/request status
          if (
            user &&
            member.user_id === user.id
          ) {
            currentUserTripStatus[member.trip_id] =
              member.status;
          }
        });
      }

      // =================================================
      // 6. GROUP MEMBERS
      // =================================================

      const groupIds = (groupsData || [])
        .map((group) => group.id)
        .filter(Boolean);

      let groupMemberCounts: Record<string, number> = {};
      let currentUserGroupMembership: Record<string, boolean> =
        {};

      if (groupIds.length > 0) {
        const {
          data: membersData,
          error: membersError,
        } = await supabase
          .from('group_members')
          .select('group_id, user_id, status')
          .in('group_id', groupIds);

        if (membersError) {
          console.error(
            'Group members fetch error:',
            membersError
          );
        } else {
          (membersData || []).forEach((member: any) => {
            // Only accepted members count
            if (member.status === 'accepted') {
              groupMemberCounts[member.group_id] =
                (groupMemberCounts[member.group_id] || 0) + 1;
            }

            // Current user's group membership
            if (
              user &&
              member.user_id === user.id &&
              member.status === 'accepted'
            ) {
              currentUserGroupMembership[member.group_id] =
                true;
            }
          });
        }
      }

      // =================================================
      // 7. FORMAT NORMAL TRIPS
      // =================================================

      const formattedTrips = (tripsData || []).map(
        (trip) => {
          const maxMembers =
            Number(trip.max_members) || 2;

          /*
           * Actual accepted member count from trip_members.
           *
           * IMPORTANT:
           * The creator should already exist in trip_members
           * with status = accepted.
           */
          const currentMembers =
            tripMemberCounts[trip.id] || 0;

          const vacancies = Math.max(
            maxMembers - currentMembers,
            0
          );

          const userStatus =
            currentUserTripStatus[trip.id] || null;

          return {
            ...trip,

            itemType: 'trip',

            profiles:
              profilesMap[trip.user_id] || null,

            currentMembers,
            maxMembers,
            vacancies,

            isFull: vacancies <= 0,

            userStatus,

            isJoined:
              userStatus === 'accepted',

            isPending:
              userStatus === 'pending',

            isRejected:
              userStatus === 'rejected',
          };
        }
      );

      // =================================================
      // 8. FORMAT GROUPS
      // =================================================

      const formattedGroups = (groupsData || []).map(
        (group) => {
          const databaseMax =
            Number(group.max_members) || 5;

          /*
           * Duo = max 2
           * Normal group = max 5
           */
          const maxMembers =
            String(group.group_type).toLowerCase() === 'duo'
              ? 2
              : Math.min(databaseMax, 5);

          const currentMembers =
            groupMemberCounts[group.id] || 0;

          const vacancies = Math.max(
            maxMembers - currentMembers,
            0
          );

          return {
            ...group,

            itemType: 'group',

            user_id: group.created_by,

            profiles:
              profilesMap[group.created_by] || null,

            currentMembers,
            maxMembers,
            vacancies,

            isFull: vacancies <= 0,

            isMember:
              !!currentUserGroupMembership[group.id],
          };
        }
      );

      // =================================================
      // 9. COMBINE + SORT
      // =================================================

      const allTrips = [
        ...formattedTrips,
        ...formattedGroups,
      ].sort((a, b) => {
        return (
          new Date(a.start_date).getTime() -
          new Date(b.start_date).getTime()
        );
      });

      setTrips(allTrips);

      // =================================================
      // 10. SAVED NORMAL TRIPS
      // =================================================

      if (user) {
        const {
          data: savedData,
          error: savedError,
        } = await supabase
          .from('saved_trips')
          .select('trip_id')
          .eq('user_id', user.id);

        if (savedError) {
          console.error(
            'Saved trips error:',
            savedError
          );
        } else {
          setSavedTripIds(
            new Set(
              savedData?.map(
                (item) => item.trip_id
              ) || []
            )
          );
        }
      } else {
        setSavedTripIds(new Set());
      }

    } catch (error: any) {
      console.error(
        'Error fetching trips:',
        error
      );

      setErrorMessage(
        error?.message ||
          'Unable to load trips.'
      );

      setTrips([]);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // =====================================================
  // SAVE / UNSAVE
  // =====================================================

  const toggleSave = async (tripId: string) => {
    if (!user) {
      alert('Please log in to save trips.');
      return;
    }

    const isSaved =
      savedTripIds.has(tripId);

    try {
      if (isSaved) {
        const { error } =
          await supabase
            .from('saved_trips')
            .delete()
            .eq('user_id', user.id)
            .eq('trip_id', tripId);

        if (error) throw error;

        setSavedTripIds((prev) => {
          const next = new Set(prev);
          next.delete(tripId);
          return next;
        });

      } else {
        const { error } =
          await supabase
            .from('saved_trips')
            .insert([
              {
                user_id: user.id,
                trip_id: tripId,
              },
            ]);

        if (error) throw error;

        setSavedTripIds((prev) => {
          const next = new Set(prev);
          next.add(tripId);
          return next;
        });
      }

    } catch (error) {
      console.error(
        'Error toggling save:',
        error
      );
    }
  };

  // =====================================================
  // REQUEST TO JOIN NORMAL TRIP
  // =====================================================

  const handleRequestToJoin = async (
    trip: any
  ) => {
    if (!user) {
      navigate('/login');
      return;
    }

    // -----------------------------------------------
    // OWN TRIP
    // -----------------------------------------------

    if (trip.user_id === user.id) {
      return;
    }

    // -----------------------------------------------
    // ALREADY ACCEPTED
    // -----------------------------------------------

    if (trip.userStatus === 'accepted') {
      return;
    }

    // -----------------------------------------------
    // REQUEST ALREADY SENT
    // -----------------------------------------------

    if (trip.userStatus === 'pending') {
      return;
    }

    // -----------------------------------------------
    // FULL CHECK
    // -----------------------------------------------

    if (trip.isFull) {
      alert(
        'This trip is already full.'
      );
      return;
    }

    try {
      setRequestingTripId(trip.id);
      setErrorMessage('');

      // ---------------------------------------------
      // RE-CHECK LIVE CAPACITY
      // ---------------------------------------------

      const {
        data: tripData,
        error: tripError,
      } = await supabase
        .from('trips')
        .select('max_members, user_id, destination')
        .eq('id', trip.id)
        .single();

      if (tripError) {
        throw tripError;
      }

      const maxMembers =
        Number(tripData?.max_members) || 2;

      const {
        count,
        error: countError,
      } = await supabase
        .from('trip_members')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('trip_id', trip.id)
        .eq('status', 'accepted');

      if (countError) {
        throw countError;
      }

      const latestCount = count || 0;

      // ---------------------------------------------
      // TRIP BECAME FULL
      // ---------------------------------------------

      if (latestCount >= maxMembers) {
        alert(
          'This trip is now full. No more members can join.'
        );

        await fetchData();
        return;
      }

      // ---------------------------------------------
      // CHECK EXISTING REQUEST
      // ---------------------------------------------

      const {
        data: existingMember,
        error: existingError,
      } = await supabase
        .from('trip_members')
        .select('id, status')
        .eq('trip_id', trip.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      // ---------------------------------------------
      // EXISTING REQUEST
      // ---------------------------------------------

      if (existingMember) {

        if (
          existingMember.status ===
          'accepted'
        ) {
          await fetchData();
          return;
        }

        if (
          existingMember.status ===
          'pending'
        ) {
          alert(
            'Your request has already been sent.'
          );
          await fetchData();
          return;
        }

        /*
         * If previously rejected,
         * change rejected → pending.
         */
        if (
          existingMember.status ===
          'rejected'
        ) {
          const {
            error: updateError,
          } = await supabase
            .from('trip_members')
            .update({
              status: 'pending',
            })
            .eq(
              'id',
              existingMember.id
            );

          if (updateError) {
            throw updateError;
          }

          await fetchData();
          return;
        }
      }

      // ---------------------------------------------
      // INSERT NEW REQUEST
      // ---------------------------------------------

      const {
        error: insertError,
      } = await supabase
        .from('trip_members')
        .insert({
          trip_id: trip.id,
          user_id: user.id,
          status: 'pending',
        });

      if (insertError) {
        throw insertError;
      }

      // ---------------------------------------------
      // OPTIONAL CHAT NOTIFICATION
      // ---------------------------------------------
      /*
       * We keep chat functionality.
       * Sending this message lets the trip owner
       * know that someone requested to join.
       */

      const destination =
        tripData?.destination ||
        trip.destination ||
        'this trip';

      const requestMessage =
        `Hi! I'd like to join your ${destination} trip. I've sent a request to join.`;

      const {
        error: messageError,
      } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: trip.user_id,
          message: requestMessage,
        });

      /*
       * If message fails, the join request is still
       * successfully created. So don't fail the request.
       */
      if (messageError) {
        console.warn(
          'Request notification message failed:',
          messageError
        );
      }

      await fetchData();

    } catch (error: any) {
      console.error(
        'Request to join error:',
        error
      );

      setErrorMessage(
        error?.message ||
          'Unable to send join request.'
      );

    } finally {
      setRequestingTripId(null);
    }
  };

  // =====================================================
  // OPEN GROUP
  // =====================================================

  const handleOpenGroup = (
    group: any
  ) => {
    navigate(`/group/${group.id}`);
  };

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDate = (
    date: string
  ) => {
    if (!date) {
      return 'Date not available';
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
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="text-center py-12 text-stone-600">
        Loading trips...
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex justify-between items-center">

        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Browse Travel Trips
          </h1>

          <p className="text-sm text-stone-500 mt-1">
            Find future trips and travel groups
          </p>
        </div>

        <Link
          to="/plans"
          className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors"
        >
          Post a Trip
        </Link>

      </div>

      {/* ERROR */}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">

          <p className="font-medium">
            Unable to load trips
          </p>

          <p className="text-sm mt-1">
            {errorMessage}
          </p>

        </div>
      )}

      {/* TRIPS GRID */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {trips.map((trip) => {

          const creator =
            trip.profiles;

          const creatorName =
            creator?.full_name ||
            'Unknown User';

          const creatorPhoto =
            creator?.avatar_url ||
            creator?.profile_photo_url ||
            null;

          const isGroup =
            trip.itemType === 'group';

          const isOwnTrip =
            user?.id === trip.user_id;

          const isRequesting =
            requestingTripId === trip.id;

          const currentMembers =
            trip.currentMembers || 0;

          const maxMembers =
            trip.maxMembers ||
            (isGroup ? 5 : 2);

          const vacancies =
            trip.vacancies ??
            Math.max(
              maxMembers -
                currentMembers,
              0
            );

          const isFull =
            trip.isFull ||
            vacancies <= 0;

          const userStatus =
            trip.userStatus;

          return (
            <div
              key={`${trip.itemType}-${trip.id}`}
              className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col"
            >

              {/* CARD CONTENT */}

              <div className="p-5 flex-1">

                {/* TYPE + FULL BADGE */}

                <div className="flex items-center justify-between mb-3">

                  {isGroup ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">

                      <UsersRound className="w-3.5 h-3.5" />

                      Travel Group

                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">

                      <User className="w-3.5 h-3.5" />

                      Buddy Trip

                    </span>
                  )}

                  {isFull && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-100">

                      <Lock className="w-3 h-3" />

                      FULL

                    </span>
                  )}

                </div>

                {/* DESTINATION + SAVE */}

                <div className="flex justify-between items-start mb-4">

                  <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">

                    <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0" />

                    <span>
                      {trip.destination ||
                        'Unknown Destination'}
                    </span>

                  </h3>

                  {/* SAVE NORMAL TRIPS ONLY */}

                  {!isGroup && (
                    <button
                      onClick={() =>
                        toggleSave(
                          trip.id
                        )
                      }
                      className={`p-2 rounded-full transition-colors ${
                        savedTripIds.has(
                          trip.id
                        )
                          ? 'text-red-500 bg-red-50'
                          : 'text-stone-400 hover:text-red-500 hover:bg-stone-50'
                      }`}
                      title={
                        savedTripIds.has(
                          trip.id
                        )
                          ? 'Remove from saved'
                          : 'Save trip'
                      }
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          savedTripIds.has(
                            trip.id
                          )
                            ? 'fill-current'
                            : ''
                        }`}
                      />
                    </button>
                  )}

                </div>

                {/* CREATOR */}

                <div className="flex items-center gap-2 text-sm text-stone-500 mb-4">

                  {creatorPhoto ? (
                    <img
                      src={creatorPhoto}
                      alt={creatorName}
                      className="w-8 h-8 rounded-full object-cover border border-stone-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">

                      <User className="w-4 h-4 text-emerald-600" />

                    </div>
                  )}

                  <span>
                    Posted by{' '}

                    <span className="font-medium text-stone-700">
                      {creatorName}
                    </span>
                  </span>

                </div>

                {/* DATE */}

                <div className="space-y-2 text-sm text-stone-600 mb-4">

                  <div className="flex items-center gap-2">

                    <Calendar className="w-4 h-4 flex-shrink-0" />

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

                </div>

                {/* CAPACITY */}

                <div
                  className={`rounded-lg border p-3 mb-4 ${
                    isFull
                      ? 'bg-red-50 border-red-100'
                      : 'bg-emerald-50 border-emerald-100'
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2">

                      <Users
                        className={`w-4 h-4 ${
                          isFull
                            ? 'text-red-500'
                            : 'text-emerald-600'
                        }`}
                      />

                      <span className="text-sm font-medium text-stone-700">
                        {currentMembers}/
                        {maxMembers}{' '}
                        members
                      </span>

                    </div>

                    <span
                      className={`text-xs font-semibold ${
                        isFull
                          ? 'text-red-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {isFull
                        ? 'FULL'
                        : `${vacancies} ${
                            vacancies === 1
                              ? 'spot'
                              : 'spots'
                          } left`}
                    </span>

                  </div>

                  {!isFull && (
                    <p className="text-xs text-stone-500 mt-1">

                      {isGroup
                        ? `${vacancies} ${
                            vacancies === 1
                              ? 'person'
                              : 'people'
                          } can still join this group`
                        : `Looking for ${vacancies} ${
                            vacancies === 1
                              ? 'buddy'
                              : 'buddies'
                          }`}

                    </p>
                  )}

                </div>

                {/* DESCRIPTION */}

                <p className="text-stone-600 line-clamp-3 text-sm">

                  {trip.description ||
                    trip.name ||
                    'No description available for this trip.'}

                </p>

                {/* GROUP TYPE */}

                {isGroup &&
                  trip.group_type && (
                    <div className="mt-3 flex items-center gap-2">

                      <span className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded-md">
                        {trip.group_type}
                      </span>

                      {trip.is_private && (
                        <span className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded-md flex items-center gap-1">

                          <Lock className="w-3 h-3" />

                          Private

                        </span>
                      )}

                    </div>
                  )}

              </div>

              {/* ACTIONS */}

              <div className="bg-stone-50 px-5 py-3 border-t border-stone-200">

                {/* =================================================
                    GROUP ACTION
                ================================================= */}

                {isGroup ? (
                  <>
                    {isOwnTrip || trip.isMember ? (
                      <button
                        onClick={() => handleOpenGroup(trip)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors"
                      >
                        <UsersRound className="w-4 h-4" />
                        View Group
                      </button>
                    ) : isFull ? (
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-stone-200 text-stone-400 font-medium rounded-md cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4" />
                        Group Full
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenGroup(trip)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors"
                      >
                        <UsersRound className="w-4 h-4" />
                        View Group
                      </button>
                    )}
                  </>
                ) : (
                  /* =================================================
                     NORMAL BUDDY TRIP
                  ================================================= */
                  isOwnTrip ? (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-stone-100 border border-stone-200 text-stone-400 font-medium rounded-md cursor-not-allowed"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Your Trip
                    </button>
                  ) : userStatus === 'accepted' ? (
                    <button
                      onClick={() => navigate(`/chat/${trip.user_id}`)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Joined • Chat
                    </button>
                  ) : userStatus === 'pending' ? (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 font-medium rounded-md cursor-default"
                    >
                      <Clock className="w-4 h-4" />
                      Request Sent
                    </button>
                  ) : isFull ? (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-stone-200 text-stone-400 font-medium rounded-md cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4" />
                      Trip Full
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRequestToJoin(trip)}
                      disabled={isRequesting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {isRequesting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending Request...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Request to Join
                        </>
                      )}
                    </button>
                  )
                )}

              </div>

            </div>
          );
        })}

        {/* NO TRIPS */}

        {trips.length === 0 &&
          !errorMessage && (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-stone-200 border-dashed">

              <MapPin className="w-10 h-10 text-stone-300 mx-auto mb-3" />

              <p className="text-stone-500">
                No future trips found.
                Be the first to post one!
              </p>

              <Link
                to="/plans"
                className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                Post a Trip
              </Link>

            </div>
          )}

      </div>
    </div>
  );
}