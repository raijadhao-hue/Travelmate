import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  Heart,
  Image as ImageIcon,
  MapPinned,
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

interface TravelPost {
  id: string;
  user_id: string;
  trip_id?: string | null;
  caption?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  created_at: string;
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

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [posts, setPosts] = useState<TravelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);

  const [friendStatus, setFriendStatus] =
    useState<FriendStatus>('none');

  const [requestLoading, setRequestLoading] = useState(false);

  const [followers, setFollowers] = useState<Person[]>([]);
  const [following, setFollowing] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleModal, setPeopleModal] =
    useState<PeopleModal>(null);

  const today = new Date().toISOString().split('T')[0];

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
        console.error('Profile loading error:', profileError);
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
        is_verified: profileData.is_verified === true,
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
        .order('start_date', { ascending: true });

      if (tripError) {
        console.error('Trips loading error:', tripError);
      } else {
        setTrips(tripData || []);
      }

      // =================================================
      // TRAVEL FEED POSTS
      // =================================================

      await loadTravelPosts(userId);

      // =================================================
      // FOLLOWERS + FOLLOWING
      // =================================================

      await loadFollowersFollowing(userId);

      // =================================================
      // FRIEND STATUS
      // =================================================

      if (user && user.id !== userId) {
        await checkFriendStatus(user.id, userId);
      } else {
        setFriendStatus('none');
      }
    } catch (error) {
      console.error('Public profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD USER TRAVEL POSTS
  // =====================================================

  const loadTravelPosts = async (profileId: string) => {
    try {
      setPostsLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from('travel_posts')
        .select(`
          id,
          user_id,
          trip_id,
          caption,
          image_url,
          image_urls,
          created_at
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Travel posts loading error:', error);
        setPosts([]);
        return;
      }

      setPosts((data || []) as TravelPost[]);
    } catch (error) {
      console.error('Travel posts error:', error);
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  // =====================================================
  // POST IMAGES
  // =====================================================

  const getPostImages = (post: TravelPost) => {
    const images: string[] = [];

    if (Array.isArray(post.image_urls)) {
      post.image_urls.forEach((url) => {
        if (typeof url === 'string' && url.trim()) {
          images.push(url);
        }
      });
    }

    if (
      post.image_url &&
      !images.includes(post.image_url)
    ) {
      images.unshift(post.image_url);
    }

    return [...new Set(images)];
  };

  const getPostTrip = (post: TravelPost) => {
    if (!post.trip_id) return null;

    return (
      trips.find((trip) => trip.id === post.trip_id) ||
      null
    );
  };

  // =====================================================
  // LOAD FOLLOWERS / FOLLOWING
  // =====================================================

  const loadFollowersFollowing = async (profileId: string) => {
    try {
      setPeopleLoading(true);

      const {
        data: followerRows,
        error: followerError,
      } = await supabase
        .from('friend_requests')
        .select('sender_id')
        .eq('receiver_id', profileId)
        .eq('status', 'accepted');

      if (followerError) {
        console.error('Followers rows error:', followerError);
      }

      const {
        data: followingRows,
        error: followingError,
      } = await supabase
        .from('friend_requests')
        .select('receiver_id')
        .eq('sender_id', profileId)
        .eq('status', 'accepted');

      if (followingError) {
        console.error('Following rows error:', followingError);
      }

      const followerIds =
        followerRows?.map((row: any) => row.sender_id) || [];

      const followingIds =
        followingRows?.map((row: any) => row.receiver_id) || [];

      if (followerIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            avatar_url,
            profile_photo_url,
            bio,
            is_verified
          `)
          .in('id', followerIds);

        if (error) {
          console.error('Follower profiles error:', error);
        }

        setFollowers(
          (data || []).map((person: any) => ({
            ...person,
            avatar_url:
              person.avatar_url ||
              person.profile_photo_url ||
              null,
            is_verified: person.is_verified === true,
          }))
        );
      } else {
        setFollowers([]);
      }

      if (followingIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            avatar_url,
            profile_photo_url,
            bio,
            is_verified
          `)
          .in('id', followingIds);

        if (error) {
          console.error('Following profiles error:', error);
        }

        setFollowing(
          (data || []).map((person: any) => ({
            ...person,
            avatar_url:
              person.avatar_url ||
              person.profile_photo_url ||
              null,
            is_verified: person.is_verified === true,
          }))
        );
      } else {
        setFollowing([]);
      }
    } catch (error) {
      console.error('Followers/following error:', error);
    } finally {
      setPeopleLoading(false);
    }
  };

  const openPeopleModal = (type: PeopleModal) => {
    setPeopleModal(type);
  };

  const closePeopleModal = () => {
    setPeopleModal(null);
  };

  const openPersonProfile = (id: string) => {
    setPeopleModal(null);
    navigate(`/public-profile/${id}`);
  };

  // =====================================================
  // FRIEND STATUS
  // =====================================================

  const checkFriendStatus = async (
    currentUserId: string,
    otherUserId: string
  ) => {
    try {
      const { data: sentRequest, error: sentError } =
        await supabase
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status')
          .eq('sender_id', currentUserId)
          .eq('receiver_id', otherUserId)
          .maybeSingle();

      if (sentError) {
        console.error('Sent request check error:', sentError);
      }

      if (sentRequest) {
        setFriendStatus(
          sentRequest.status === 'accepted'
            ? 'friends'
            : 'pending_sent'
        );
        return;
      }

      const { data: receivedRequest, error: receivedError } =
        await supabase
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status')
          .eq('sender_id', otherUserId)
          .eq('receiver_id', currentUserId)
          .maybeSingle();

      if (receivedError) {
        console.error(
          'Received request check error:',
          receivedError
        );
      }

      if (receivedRequest) {
        setFriendStatus(
          receivedRequest.status === 'accepted'
            ? 'friends'
            : 'pending_received'
        );
        return;
      }

      setFriendStatus('none');
    } catch (error) {
      console.error('Friend status error:', error);
      setFriendStatus('none');
    }
  };

  // =====================================================
  // SEND FRIEND REQUEST
  // =====================================================

  const sendFriendRequest = async () => {
    if (!user || !userId || user.id === userId) return;

    try {
      setRequestLoading(true);

      const { data: sentRequest } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', userId)
        .maybeSingle();

      if (sentRequest) {
        setFriendStatus(
          sentRequest.status === 'accepted'
            ? 'friends'
            : 'pending_sent'
        );
        return;
      }

      const { data: receivedRequest } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status')
        .eq('sender_id', userId)
        .eq('receiver_id', user.id)
        .maybeSingle();

      if (receivedRequest) {
        setFriendStatus(
          receivedRequest.status === 'accepted'
            ? 'friends'
            : 'pending_received'
        );
        return;
      }

      const { error: insertError } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: userId,
          status: 'pending',
        });

      if (insertError) {
        console.error(
          'Friend request insert error:',
          insertError
        );
        alert(`Friend request failed: ${insertError.message}`);
        return;
      }

      setFriendStatus('pending_sent');
    } catch (error: any) {
      console.error('Send friend request error:', error);
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

  const acceptFriendRequest = async () => {
    if (!user || !userId) return;

    try {
      setRequestLoading(true);

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('sender_id', userId)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Accept request error:', error);
        alert(`Could not accept request: ${error.message}`);
        return;
      }

      setFriendStatus('friends');
      await loadFollowersFollowing(userId);
    } catch (error: any) {
      console.error('Accept request error:', error);
      alert(
        error?.message ||
          'Could not accept friend request.'
      );
    } finally {
      setRequestLoading(false);
    }
  };

  // =====================================================
  // CANCEL REQUEST
  // =====================================================

  const cancelRequest = async () => {
    if (!user || !userId) return;

    try {
      setRequestLoading(true);

      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('sender_id', user.id)
        .eq('receiver_id', userId);

      if (error) {
        console.error('Cancel request error:', error);
        alert(`Could not cancel request: ${error.message}`);
        return;
      }

      setFriendStatus('none');
    } catch (error: any) {
      console.error('Cancel request error:', error);
    } finally {
      setRequestLoading(false);
    }
  };

  const handleMessage = () => {
    if (!userId) return;
    navigate(`/chat/${userId}`);
  };

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDate = (date: string) => {
    if (!date) return '';

    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPostDate = (date: string) => {
    if (!date) return '';

    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const profilePhoto =
    profile?.avatar_url ||
    profile?.profile_photo_url ||
    '';

  const futureTrips = trips.filter(
    (trip) =>
      trip.end_date &&
      trip.end_date >= today
  );

  const pastTrips = trips.filter(
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
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-3" />
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
          <User className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold">
            User not found
          </h2>

          <button
            onClick={() => navigate(-1)}
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

  const modalPeople =
    peopleModal === 'followers'
      ? followers
      : following;

  const modalTitle =
    peopleModal === 'followers'
      ? 'Followers'
      : 'Following';

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* BACK */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-600 hover:text-emerald-600 mb-5"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* =================================================
            PROFILE HEADER
        ================================================= */}

        <div className="bg-white rounded-3xl shadow-lg border border-stone-200 overflow-hidden">
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
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <User
                    size={50}
                    className="text-emerald-600"
                  />
                )}
              </div>

              {/* NAME */}
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
              {user?.id !== profile.id && (
                <div className="flex flex-wrap justify-center gap-3">

                  <button
                    onClick={handleMessage}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 transition"
                  >
                    <MessageCircle size={18} />
                    Message
                  </button>

                  {friendStatus === 'none' && (
                    <button
                      onClick={sendFriendRequest}
                      disabled={requestLoading}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {requestLoading ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <UserPlus size={18} />
                      )}
                      Add Friend
                    </button>
                  )}

                  {friendStatus === 'pending_sent' && (
                    <button
                      onClick={cancelRequest}
                      disabled={requestLoading}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200"
                    >
                      <Clock size={18} />
                      Requested
                    </button>
                  )}

                  {friendStatus === 'pending_received' && (
                    <button
                      onClick={acceptFriendRequest}
                      disabled={requestLoading}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {requestLoading ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <UserCheck size={18} />
                      )}
                      Accept
                    </button>
                  )}

                  {friendStatus === 'friends' && (
                    <button
                      disabled
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-semibold"
                    >
                      <UserCheck size={18} />
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
              profile.preferences.length > 0 && (
                <div className="mt-5">
                  <h3 className="font-bold text-stone-900 mb-3">
                    Travel Interests
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {profile.preferences.map(
                      (preference) => (
                        <span
                          key={preference}
                          className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold"
                        >
                          {preference}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* STATS */}
            <div className="grid grid-cols-3 gap-3 mt-7">
              <div className="bg-stone-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-stone-900">
                  {trips.length}
                </p>
                <p className="text-xs text-stone-500">
                  Trips
                </p>
              </div>

              <button
                type="button"
                onClick={() => openPeopleModal('followers')}
                className="bg-stone-50 rounded-2xl p-4 text-center hover:bg-emerald-50 transition cursor-pointer"
              >
                <p className="text-2xl font-bold text-stone-900">
                  {followers.length}
                </p>
                <p className="text-xs text-stone-500">
                  Followers
                </p>
              </button>

              <button
                type="button"
                onClick={() => openPeopleModal('following')}
                className="bg-stone-50 rounded-2xl p-4 text-center hover:bg-emerald-50 transition cursor-pointer"
              >
                <p className="text-2xl font-bold text-stone-900">
                  {following.length}
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
            TRAVEL FEED
        ================================================= */}

        <div className="bg-white rounded-3xl shadow-lg border border-stone-200 p-6 md:p-8 mt-7">

          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <ImageIcon
                  size={23}
                  className="text-emerald-600"
                />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-stone-900">
                  Travel Feed
                </h2>
                <p className="text-sm text-stone-500">
                  {name}'s travel posts and memories
                </p>
              </div>
            </div>

            <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1.5 text-sm font-semibold">
              {posts.length}{' '}
              {posts.length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          {postsLoading ? (
            <div className="py-12 text-center">
              <Loader2
                size={32}
                className="animate-spin text-emerald-600 mx-auto mb-3"
              />
              <p className="text-stone-500">
                Loading travel posts...
              </p>
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl bg-stone-50 border border-stone-200 py-12 px-5 text-center">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
                <ImageIcon
                  size={26}
                  className="text-stone-300"
                />
              </div>

              <h3 className="font-semibold text-stone-800">
                No travel posts yet
              </h3>

              <p className="text-sm text-stone-500 mt-1">
                {name} hasn't shared any travel memories yet.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {posts.map((post) => {
                const images = getPostImages(post);
                const postTrip = getPostTrip(post);

                return (
                  <article
                    key={post.id}
                    className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm hover:shadow-md transition"
                  >

                    {/* POST IMAGE */}
                    {images.length > 0 ? (
                      <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                        <img
                          src={images[0]}
                          alt={
                            postTrip?.destination ||
                            'Travel post'
                          }
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />

                        {images.length > 1 && (
                          <div className="absolute right-3 top-3 rounded-full bg-black/60 text-white px-3 py-1.5 text-xs font-semibold">
                            +{images.length - 1} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-stone-100 flex items-center justify-center">
                        <ImageIcon
                          size={42}
                          className="text-stone-300"
                        />
                      </div>
                    )}

                    {/* POST CONTENT */}
                    <div className="p-5">

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-emerald-50 overflow-hidden flex items-center justify-center shrink-0">
                            {profilePhoto ? (
                              <img
                                src={profilePhoto}
                                alt={name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <User
                                size={18}
                                className="text-emerald-600"
                              />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-900 truncate">
                              {name}
                            </p>
                            <p className="text-xs text-stone-400">
                              {formatPostDate(post.created_at)}
                            </p>
                          </div>
                        </div>

                        {postTrip?.destination && (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <MapPin size={12} />
                            {postTrip.destination}
                          </span>
                        )}
                      </div>

                      {post.caption && (
                        <p className="mt-4 text-sm leading-6 text-stone-700 whitespace-pre-line">
                          {post.caption}
                        </p>
                      )}

                      {postTrip && (
                        <Link
                          to={`/trip/${postTrip.id}`}
                          className="mt-4 flex items-center gap-2 rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-3 hover:bg-emerald-50 hover:border-emerald-200 transition"
                        >
                          <MapPinned
                            size={17}
                            className="text-emerald-600 shrink-0"
                          />

                          <div className="min-w-0">
                            <p className="text-xs text-stone-400">
                              Related Trip
                            </p>
                            <p className="text-sm font-semibold text-stone-800 truncate">
                              {postTrip.destination}
                            </p>
                            <p className="text-xs text-stone-500">
                              {formatDate(postTrip.start_date)}
                              {' → '}
                              {formatDate(postTrip.end_date)}
                            </p>
                          </div>

                          <span className="ml-auto text-emerald-600 text-sm font-semibold">
                            View →
                          </span>
                        </Link>
                      )}

                      <div className="mt-4 flex items-center gap-2 text-xs text-stone-400">
                        <Heart size={15} />
                        <span>Travel memory</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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

          {futureTrips.length === 0 ? (
            <p className="text-stone-500 text-center py-8">
              No upcoming trips.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {futureTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="border border-stone-200 rounded-2xl p-5 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin
                      size={19}
                      className="text-emerald-600"
                    />

                    <h3 className="text-lg font-bold">
                      {trip.destination}
                    </h3>
                  </div>

                  {trip.description && (
                    <p className="text-stone-600 text-sm mb-3">
                      {trip.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-stone-500">
                    <Calendar size={16} />

                    {formatDate(trip.start_date)}
                    {' → '}
                    {formatDate(trip.end_date)}
                  </div>

                  <Link
                    to={`/trip/${trip.id}`}
                    className="inline-block mt-4 text-emerald-600 font-semibold hover:underline"
                  >
                    View Trip →
                  </Link>
                </div>
              ))}
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

          {pastTrips.length === 0 ? (
            <p className="text-stone-500 text-center py-8">
              No completed trips yet.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {pastTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="border border-stone-200 rounded-2xl p-5 bg-stone-50"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin
                      size={19}
                      className="text-emerald-600"
                    />

                    <h3 className="text-lg font-bold">
                      {trip.destination}
                    </h3>
                  </div>

                  {trip.description && (
                    <p className="text-stone-600 text-sm mb-3">
                      {trip.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-stone-500 mb-3">
                    <Calendar size={16} />

                    {formatDate(trip.start_date)}
                    {' → '}
                    {formatDate(trip.end_date)}
                  </div>

                  <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                    <CheckCircle size={16} />
                    Completed
                  </div>

                  <Link
                    to={`/trip/${trip.id}`}
                    className="inline-block mt-3 text-emerald-600 font-semibold hover:underline"
                  >
                    View Trip →
                  </Link>
                </div>
              ))}
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
          onClick={closePeopleModal}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
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
                    {modalTitle}
                  </h2>

                  <p className="text-xs text-stone-500">
                    {modalPeople.length}{' '}
                    {modalPeople.length === 1
                      ? 'person'
                      : 'people'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closePeopleModal}
                className="w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

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
              ) : modalPeople.length === 0 ? (
                <div className="py-12 text-center px-6">
                  <Users
                    size={45}
                    className="text-stone-300 mx-auto mb-3"
                  />

                  <p className="font-semibold text-stone-700">
                    {peopleModal === 'followers'
                      ? 'No followers yet'
                      : 'Not following anyone yet'}
                  </p>

                  <p className="text-sm text-stone-400 mt-1">
                    This list is empty.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {modalPeople.map((person) => {
                    const personName =
                      person.full_name?.trim() ||
                      'Traveler';

                    const personPhoto =
                      person.avatar_url ||
                      person.profile_photo_url ||
                      '';

                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() =>
                          openPersonProfile(person.id)
                        }
                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition text-left"
                      >
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center shrink-0 border border-stone-200">
                          {personPhoto ? (
                            <img
                              src={personPhoto}
                              alt={personName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display =
                                  'none';
                              }}
                            />
                          ) : (
                            <span className="text-xl font-bold text-emerald-600">
                              {personName
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="font-bold text-stone-900 truncate">
                              {personName}
                            </p>

                            {person.is_verified === true && (
                              <span
                                title="Identity Verified"
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white shrink-0"
                              >
                                <ShieldCheck
                                  size={13}
                                  strokeWidth={3}
                                />
                              </span>
                            )}
                          </div>

                          {person.bio && (
                            <p className="text-sm text-stone-500 truncate mt-0.5">
                              {person.bio}
                            </p>
                          )}

                          <p className="text-xs text-emerald-600 mt-1 font-medium">
                            View profile →
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
