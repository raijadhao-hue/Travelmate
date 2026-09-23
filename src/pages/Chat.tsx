import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  MessageCircle,
  ShieldCheck,
  MapPin,
  Navigation,
  X,
  Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Chat() {
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();

  const [messages, setMessages] = useState<any[]>([]);
  const [buddy, setBuddy] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);

  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const { onlineUsers = [] } = useAuth();

  // =====================================================
  // LIVE LOCATION STATES
  // =====================================================

  const [showLocationOptions, setShowLocationOptions] =
    useState(false);

  const [sharingLocation, setSharingLocation] =
    useState<any>(null);

  const [receivedLiveLocation, setReceivedLiveLocation] =
    useState<any>(null);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationTimeLeft, setLocationTimeLeft] =
    useState('');

  // =====================================================
  // FORMAT LAST SEEN
  // =====================================================

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) {
      return 'Offline';
    }

    const date = new Date(lastSeen);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'Last seen just now';
    }

    if (diffMinutes < 60) {
      return `Last seen ${diffMinutes} min ago`;
    }

    if (diffHours < 24) {
      return `Last seen ${diffHours} hr ago`;
    }

    if (diffDays === 1) {
      return 'Last seen yesterday';
    }

    return `Last seen ${diffDays} days ago`;
  };

  // =====================================================
  // CHAT LIST
  // =====================================================

  useEffect(() => {
    if (!user || userId) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);

        const {
          data: allMessages,
          error,
        } = await supabase
          .from('messages')
          .select('*')
          .or(
            `sender_id.eq.${user.id},receiver_id.eq.${user.id}`
          )
          .order('created_at', {
            ascending: false,
          });

        if (error) {
          console.error(
            'Chat list messages error:',
            error
          );

          setConversations([]);
          return;
        }

        if (!allMessages || allMessages.length === 0) {
          setConversations([]);
          return;
        }

        const latestMessages = new Map<string, any>();

        allMessages.forEach((message: any) => {
          const partnerId =
            message.sender_id === user.id
              ? message.receiver_id
              : message.sender_id;

          if (!latestMessages.has(partnerId)) {
            latestMessages.set(partnerId, message);
          }
        });

        const partnerIds = Array.from(
          latestMessages.keys()
        );

        if (partnerIds.length === 0) {
          setConversations([]);
          return;
        }

        const {
          data: profiles,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select(
            'id, full_name, email, avatar_url, profile_photo_url, bio, last_seen, is_verified'
          )
          .in('id', partnerIds);

        if (profileError) {
          console.error(
            'Chat profile error:',
            profileError
          );
        }

        const conversationList = partnerIds.map(
          (partnerId) => {
            const lastMessage =
              latestMessages.get(partnerId);

            const profile =
              profiles?.find(
                (p: any) =>
                  p.id === partnerId
              );

            const normalizedProfile = profile
              ? {
                  ...profile,
                  avatar_url:
                    profile.avatar_url ||
                    profile.profile_photo_url ||
                    null,
                  is_verified:
                    profile.is_verified === true,
                }
              : null;

            return {
              userId: partnerId,
              profile: normalizedProfile,
              lastMessage:
                lastMessage?.message || '',
              createdAt:
                lastMessage?.created_at || null,
            };
          }
        );

        setConversations(conversationList);
      } catch (error) {
        console.error(
          'Conversation fetch error:',
          error
        );

        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    const channel = supabase
      .channel(`chat-list-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message =
            payload.new as any;

          const belongsToCurrentUser =
            message.sender_id === user.id ||
            message.receiver_id === user.id;

          if (!belongsToCurrentUser) return;

          await fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userId]);

  // =====================================================
  // FETCH BUDDY PROFILE
  // =====================================================

  useEffect(() => {
    if (!user || !userId) return;

    const fetchBuddy = async () => {
      const {
        data,
        error,
      } = await supabase
        .from('profiles')
        .select(
          'id, full_name, email, avatar_url, profile_photo_url, bio, last_seen, is_verified'
        )
        .eq('id', userId)
        .single();

      if (error) {
        console.error(
          'Failed to fetch buddy:',
          error
        );
        return;
      }

      setBuddy({
        ...data,
        avatar_url:
          data.avatar_url ||
          data.profile_photo_url ||
          null,
        is_verified:
          data.is_verified === true,
      });
    };

    fetchBuddy();

    const interval = setInterval(() => {
      fetchBuddy();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [user, userId]);

  // =====================================================
  // FETCH INDIVIDUAL MESSAGES
  // =====================================================

  useEffect(() => {
    if (!user || !userId) return;

    const fetchMessages = async () => {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`
        )
        .order('created_at', {
          ascending: true,
        });

      if (error) {
        console.error(
          'Failed to fetch messages:',
          error
        );
      } else {
        setMessages(data || []);
      }

      setLoading(false);
    };

    fetchMessages();

    const channel = supabase
      .channel(
        `chat-${user.id}-${userId}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const message =
            payload.new as any;

          const belongsToChat =
            (message.sender_id === user.id &&
              message.receiver_id === userId) ||
            (message.sender_id === userId &&
              message.receiver_id === user.id);

          if (!belongsToChat) return;

          setMessages((current) => {
            if (
              current.some(
                (item) =>
                  item.id === message.id
              )
            ) {
              return current;
            }

            return [
              ...current,
              message,
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userId]);

  // =====================================================
  // GET CURRENT GPS LOCATION
  // =====================================================

  const getCurrentLocation =
    (): Promise<GeolocationPosition> => {
      return new Promise(
        (resolve, reject) => {
          if (
            !navigator.geolocation
          ) {
            reject(
              new Error(
                'Geolocation is not supported.'
              )
            );
            return;
          }

          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
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
  // START LIVE LOCATION
  // =====================================================

  const startLiveLocation = async (
    durationMinutes: number
  ) => {
    if (!user || !userId) return;

    setLocationLoading(true);

    try {
      const position =
        await getCurrentLocation();

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      const startedAt =
        new Date();

      const expiresAt =
        new Date(
          startedAt.getTime() +
            durationMinutes *
              60 *
              1000
        );

      // Remove any old active location
      await supabase
        .from('live_locations')
        .update({
          is_active: false,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'sender_id',
          user.id
        )
        .eq(
          'receiver_id',
          userId
        )
        .eq(
          'is_active',
          true
        );

      const {
        data,
        error,
      } = await supabase
        .from('live_locations')
        .insert({
          sender_id: user.id,
          receiver_id: userId,
          latitude,
          longitude,
          started_at:
            startedAt.toISOString(),
          expires_at:
            expiresAt.toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error(
          'Start live location error:',
          error
        );

        alert(
          'Live location start nahi hui. Please try again.'
        );

        return;
      }

      setSharingLocation(data);

      setShowLocationOptions(
        false
      );

    } catch (error: any) {
      console.error(
        'Location error:',
        error
      );

      if (
        error?.code === 1
      ) {
        alert(
          'Location permission allow karo to live location share kar sake.'
        );
      } else if (
        error?.code === 2
      ) {
        alert(
          'Location available nahi hai. Please GPS/location on karke try karo.'
        );
      } else if (
        error?.code === 3
      ) {
        alert(
          'Location request timeout ho gayi. Please try again.'
        );
      } else {
        alert(
          'Current location nahi mil paayi.'
        );
      }
    } finally {
      setLocationLoading(false);
    }
  };

  // =====================================================
  // STOP LIVE LOCATION
  // =====================================================

  const stopLiveLocation =
    async () => {
      if (
        !sharingLocation?.id ||
        !user
      ) {
        return;
      }

      const {
        error,
      } = await supabase
        .from('live_locations')
        .update({
          is_active: false,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          sharingLocation.id
        )
        .eq(
          'sender_id',
          user.id
        );

      if (error) {
        console.error(
          'Stop live location error:',
          error
        );

        alert(
          'Live location stop nahi hui.'
        );

        return;
      }

      setSharingLocation(null);
      setLocationTimeLeft('');
    };

  // =====================================================
  // CONTINUOUS LOCATION TRACKING
  // =====================================================

  useEffect(() => {
    if (
      !sharingLocation?.id ||
      !user
    ) {
      return;
    }

    let watchId:
      | number
      | null = null;

    const startTracking =
      () => {
        if (
          !navigator.geolocation
        ) {
          return;
        }

        watchId =
          navigator.geolocation.watchPosition(
            async (position) => {
              const latitude =
                position.coords
                  .latitude;

              const longitude =
                position.coords
                  .longitude;

              const {
                error,
              } = await supabase
                .from(
                  'live_locations'
                )
                .update({
                  latitude,
                  longitude,
                  updated_at:
                    new Date().toISOString(),
                })
                .eq(
                  'id',
                  sharingLocation.id
                )
                .eq(
                  'sender_id',
                  user.id
                )
                .eq(
                  'is_active',
                  true
                );

              if (error) {
                console.error(
                  'Location update error:',
                  error
                );
              }
            },
            (error) => {
              console.error(
                'Location tracking error:',
                error
              );
            },
            {
              enableHighAccuracy: true,
              maximumAge: 5000,
              timeout: 15000,
            }
          );
      };

    startTracking();

    return () => {
      if (
        watchId !== null
      ) {
        navigator.geolocation.clearWatch(
          watchId
        );
      }
    };
  }, [
    sharingLocation?.id,
    user,
  ]);

  // =====================================================
  // LIVE LOCATION TIMER
  // =====================================================

  useEffect(() => {
    if (
      !sharingLocation?.expires_at
    ) {
      setLocationTimeLeft('');
      return;
    }

    const updateTimer =
      async () => {
        const expiresAt =
          new Date(
            sharingLocation.expires_at
          ).getTime();

        const now =
          Date.now();

        const difference =
          expiresAt - now;

        if (
          difference <= 0
        ) {
          setLocationTimeLeft('');

          if (user) {
            await supabase
              .from(
                'live_locations'
              )
              .update({
                is_active: false,
                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                'id',
                sharingLocation.id
              )
              .eq(
                'sender_id',
                user.id
              );
          }

          setSharingLocation(
            null
          );

          return;
        }

        const totalSeconds =
          Math.floor(
            difference / 1000
          );

        const hours =
          Math.floor(
            totalSeconds /
              3600
          );

        const minutes =
          Math.floor(
            (totalSeconds %
              3600) /
              60
          );

        const seconds =
          totalSeconds % 60;

        if (hours > 0) {
          setLocationTimeLeft(
            `${hours}h ${minutes}m`
          );
        } else if (
          minutes > 0
        ) {
          setLocationTimeLeft(
            `${minutes}m ${seconds}s`
          );
        } else {
          setLocationTimeLeft(
            `${seconds}s`
          );
        }
      };

    updateTimer();

    const interval =
      setInterval(
        updateTimer,
        1000
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    sharingLocation?.expires_at,
    sharingLocation?.id,
    user,
  ]);

  // =====================================================
  // RECEIVE LIVE LOCATION
  // =====================================================

  useEffect(() => {
    if (!user || !userId) {
      return;
    }

    const fetchReceivedLocation =
      async () => {
        const {
          data,
          error,
        } = await supabase
          .from(
            'live_locations'
          )
          .select('*')
          .eq(
            'sender_id',
            userId
          )
          .eq(
            'receiver_id',
            user.id
          )
          .eq(
            'is_active',
            true
          )
          .gt(
            'expires_at',
            new Date().toISOString()
          )
          .order(
            'created_at',
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error(
            'Received location fetch error:',
            error
          );

          return;
        }

        setReceivedLiveLocation(
          data || null
        );
      };

    fetchReceivedLocation();

    const channel =
      supabase
        .channel(
          `live-location-${user.id}-${userId}`
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'live_locations',
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            const location =
              payload.new as any;

            if (
              location.sender_id !==
              userId
            ) {
              return;
            }

            const isValid =
              location.is_active ===
                true &&
              new Date(
                location.expires_at
              ).getTime() >
                Date.now();

            if (isValid) {
              setReceivedLiveLocation(
                location
              );
            } else {
              setReceivedLiveLocation(
                null
              );
            }
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    user,
    userId,
  ]);

  // =====================================================
  // SEND MESSAGE + NOTIFICATION
  // =====================================================

  const sendMessage =
    async () => {
      if (
        !user ||
        !userId
      ) {
        return;
      }

      const text =
        newMessage.trim();

      if (!text) return;

      setSending(true);

      try {
        // -------------------------------------------------
        // 1. INSERT MESSAGE
        // -------------------------------------------------

        const {
          data,
          error,
        } = await supabase
          .from('messages')
          .insert({
            sender_id:
              user.id,
            receiver_id:
              userId,
            message:
              text,
          })
          .select()
          .single();

        if (error) {
          console.error(
            'Failed to send message:',
            error
          );

          alert(
            'Message send nahi hua. Please try again.'
          );

          return;
        }

        // -------------------------------------------------
        // 2. ADD MESSAGE TO UI
        // -------------------------------------------------

        if (data) {
          setMessages(
            (current) => {
              if (
                current.some(
                  (item) =>
                    item.id ===
                    data.id
                )
              ) {
                return current;
              }

              return [
                ...current,
                data,
              ];
            }
          );
        }

        setNewMessage('');

        // -------------------------------------------------
        // 3. CREATE NOTIFICATION
        // -------------------------------------------------

        const senderName =
          user.user_metadata
            ?.full_name ||
          user.email ||
          'Someone';

        const {
          error:
            notificationError,
        } =
          await supabase
            .from(
              'notifications'
            )
            .insert({
              user_id:
                userId,
              actor_id:
                user.id,
              type:
                'message',
              title:
                'New Message 💬',
              message: `${senderName} sent you a message`,
              reference_id:
                data?.id ||
                null,
              reference_type:
                'message',
              is_read:
                false,
            });

        if (
          notificationError
        ) {
          console.error(
            'Notification creation error:',
            notificationError
          );
        }
      } catch (error) {
        console.error(
          'Send message error:',
          error
        );

        alert(
          'Something went wrong. Please try again.'
        );
      } finally {
        setSending(false);
      }
    };

  // =====================================================
  // ENTER TO SEND
  // =====================================================

  const handleKeyDown =
    (
      e: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (
        e.key === 'Enter'
      ) {
        e.preventDefault();
        sendMessage();
      }
    };

  // =====================================================
  // CHAT LIST
  // =====================================================

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto">

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">

          <div className="px-6 py-5 border-b border-stone-100">

            <h1 className="text-2xl font-bold text-stone-900">
              Chats
            </h1>

            <p className="text-sm text-stone-500 mt-1">
              Your conversations
            </p>

          </div>

          {loading ? (

            <div className="p-12 text-center">
              <p className="text-stone-400">
                Loading chats...
              </p>
            </div>

          ) : conversations.length === 0 ? (

            <div className="p-12 text-center">

              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">

                <MessageCircle className="w-8 h-8 text-emerald-600" />

              </div>

              <h2 className="font-bold text-stone-800">
                No chats yet
              </h2>

              <p className="text-sm text-stone-500 mt-2">
                Go to Matches and message a travel buddy.
              </p>

              <Link
                to="/matches"
                className="inline-block mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition"
              >
                Find Travel Buddies
              </Link>

            </div>

          ) : (

            <div className="divide-y divide-stone-100">

              {conversations.map(
                (
                  conversation
                ) => {

                  const profile =
                    conversation.profile;

                  const displayName =
                    profile?.full_name ||
                    profile?.email ||
                    'Travel Buddy';

                  const isOnline =
                    onlineUsers.includes(
                      conversation.userId
                    );

                  return (
                    <Link
                      key={
                        conversation.userId
                      }
                      to={`/chat/${conversation.userId}`}
                      className="flex items-center gap-4 p-5 hover:bg-stone-50 transition"
                    >

                      <div className="relative flex-shrink-0">

                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg overflow-hidden">

                          {profile?.avatar_url ? (

                            <img
                              src={
                                profile.avatar_url
                              }
                              alt={
                                displayName
                              }
                              className="w-full h-full object-cover"
                            />

                          ) : (

                            displayName[0]?.toUpperCase() ||
                            'T'

                          )}

                        </div>

                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                        )}

                      </div>

                      <div className="flex-1 min-w-0">

                        <div className="flex items-center justify-between gap-3">

                          <div className="flex items-center gap-1.5 min-w-0">

                            <h2 className="font-bold text-stone-900 truncate">
                              {displayName}
                            </h2>

                            {profile?.is_verified && (
                              <ShieldCheck
                                className="w-4 h-4 text-emerald-600 flex-shrink-0"
                                strokeWidth={2.5}
                              />
                            )}

                          </div>

                          {conversation.createdAt && (

                            <span className="text-[11px] text-stone-400 flex-shrink-0">

                              {new Date(
                                conversation.createdAt
                              ).toLocaleDateString(
                                [],
                                {
                                  day: 'numeric',
                                  month: 'short',
                                }
                              )}

                            </span>

                          )}

                        </div>

                        <div className="flex items-center gap-2 mt-1">

                          <p className="text-sm text-stone-500 truncate">
                            {conversation.lastMessage}
                          </p>

                        </div>

                        <p className="text-xs mt-1">

                          {isOnline ? (
                            <span className="text-emerald-600 font-semibold">
                              Online
                            </span>
                          ) : (
                            <span className="text-stone-400">
                              {formatLastSeen(
                                profile?.last_seen
                              )}
                            </span>
                          )}

                        </p>

                      </div>

                      <MessageCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />

                    </Link>
                  );
                }
              )}

            </div>

          )}

        </div>

      </div>
    );
  }

  // =====================================================
  // INDIVIDUAL CHAT
  // =====================================================

  const buddyName =
    buddy?.full_name ||
    buddy?.email ||
    'Travel Buddy';

  const buddyIsOnline =
    onlineUsers.includes(
      userId
    );

  return (
    <div className="max-w-4xl mx-auto">

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="px-6 py-5 border-b border-stone-100 flex items-center gap-4">

          <Link
            to="/chat"
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </Link>

          <div className="relative flex-shrink-0">

            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg overflow-hidden">

              {buddy?.avatar_url ? (

                <img
                  src={
                    buddy.avatar_url
                  }
                  alt={
                    buddyName
                  }
                  className="w-full h-full object-cover"
                />

              ) : (

                buddyName[0]?.toUpperCase() ||
                'T'

              )}

            </div>

            {buddyIsOnline && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
            )}

          </div>

          <div>

            <div className="flex items-center gap-1.5">

              <h1 className="font-bold text-lg text-stone-900">
                {buddyName}
              </h1>

              {buddy?.is_verified && (
                <ShieldCheck
                  className="w-5 h-5 text-emerald-600"
                  strokeWidth={2.5}
                />
              )}

            </div>

            {buddyIsOnline ? (

              <p className="text-sm text-emerald-600 font-medium">
                ● Online
              </p>

            ) : (

              <p className="text-xs text-stone-400">
                {formatLastSeen(
                  buddy?.last_seen
                )}
              </p>

            )}

          </div>

        </div>

        {/* =====================================================
            MESSAGES
        ===================================================== */}

        <div className="h-[500px] overflow-y-auto p-6 bg-stone-50">

          {/* -------------------------------------------------
              RECEIVED LIVE LOCATION
          ------------------------------------------------- */}

          {receivedLiveLocation && (
            <div className="mb-4 flex justify-start">

              <div className="w-full max-w-sm bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">

                <div className="flex items-center gap-3">

                  <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Navigation className="w-5 h-5 text-emerald-600" />
                  </div>

                  <div className="flex-1">

                    <p className="font-bold text-stone-900">
                      Live Location
                    </p>

                    <p className="text-xs text-stone-500 mt-0.5">
                      {buddyName} is sharing their live location
                    </p>

                  </div>

                </div>

                <a
                  href={`https://www.google.com/maps?q=${receivedLiveLocation.latitude},${receivedLiveLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-semibold hover:bg-emerald-700 transition"
                >
                  <MapPin className="w-4 h-4" />
                  View Live Location
                </a>

                <p className="text-[11px] text-stone-400 text-center mt-2">
                  Location updates automatically
                </p>

              </div>

            </div>
          )}

          {/* -------------------------------------------------
              MY ACTIVE LIVE LOCATION
          ------------------------------------------------- */}

          {sharingLocation && (
            <div className="mb-4 flex justify-end">

              <div className="w-full max-w-sm bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">

                <div className="flex items-center gap-3">

                  <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Navigation className="w-5 h-5 text-emerald-600" />
                  </div>

                  <div className="flex-1">

                    <p className="font-bold text-stone-900">
                      Live Location
                    </p>

                    <p className="text-xs text-stone-500 mt-0.5">
                      You are sharing your live location
                    </p>

                  </div>

                </div>

                <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-emerald-700 font-semibold">

                  <Clock className="w-3.5 h-3.5" />

                  {locationTimeLeft
                    ? `Sharing for ${locationTimeLeft}`
                    : 'Live location active'}

                </div>

                <a
                  href={`https://www.google.com/maps?q=${sharingLocation.latitude},${sharingLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-semibold hover:bg-emerald-700 transition"
                >
                  <MapPin className="w-4 h-4" />
                  View My Location
                </a>

                <button
                  onClick={
                    stopLiveLocation
                  }
                  className="mt-2 w-full rounded-xl border border-red-200 bg-white text-red-600 py-2.5 text-sm font-semibold hover:bg-red-50 transition"
                >
                  Stop Sharing
                </button>

              </div>

            </div>
          )}

          {/* -------------------------------------------------
              LOADING
          ------------------------------------------------- */}

          {loading ? (

            <div className="h-full flex items-center justify-center">

              <p className="text-stone-400">
                Loading conversation...
              </p>

            </div>

          ) : messages.length === 0 &&
            !receivedLiveLocation &&
            !sharingLocation ? (

            <div className="h-full flex flex-col items-center justify-center text-center">

              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">

                <MessageCircle className="w-8 h-8 text-emerald-600" />

              </div>

              <h2 className="font-bold text-stone-800">
                Start a conversation
              </h2>

              <p className="text-sm text-stone-500 mt-2">
                Say hello to your travel buddy!
              </p>

            </div>

          ) : (

            <div className="space-y-4">

              {messages.map(
                (msg) => {

                  const isMine =
                    msg.sender_id ===
                    user?.id;

                  return (
                    <div
                      key={
                        msg.id
                      }
                      className={`flex ${
                        isMine
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >

                      <div
                        className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                          isMine
                            ? 'bg-emerald-600 text-white rounded-br-md'
                            : 'bg-white text-stone-800 border border-stone-200 rounded-bl-md'
                        }`}
                      >

                        <p className="text-sm leading-relaxed">
                          {msg.message}
                        </p>

                        <p
                          className={`text-[10px] mt-1 ${
                            isMine
                              ? 'text-emerald-100'
                              : 'text-stone-400'
                          }`}
                        >
                          {new Date(
                            msg.created_at
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </p>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </div>

        {/* =====================================================
            INPUT AREA
        ===================================================== */}

        <div className="p-4 bg-white border-t border-stone-100">

          {/* ===================================================
              LOCATION OPTIONS
          =================================================== */}

          {showLocationOptions && (
            <div className="mb-3 bg-white border border-stone-200 rounded-2xl shadow-md p-4">

              <div className="flex items-center justify-between mb-3">

                <div>

                  <h3 className="font-bold text-stone-900">
                    Share Live Location
                  </h3>

                  <p className="text-xs text-stone-500 mt-1">
                    Choose how long you want to share
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowLocationOptions(
                      false
                    )
                  }
                  className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-stone-500" />
                </button>

              </div>

              <div className="grid grid-cols-3 gap-2">

                <button
                  type="button"
                  onClick={() =>
                    startLiveLocation(
                      15
                    )
                  }
                  disabled={
                    locationLoading
                  }
                  className="px-3 py-3 rounded-xl border border-stone-200 hover:bg-emerald-50 hover:border-emerald-300 transition text-sm font-semibold disabled:opacity-50"
                >
                  15 min
                </button>

                <button
                  type="button"
                  onClick={() =>
                    startLiveLocation(
                      60
                    )
                  }
                  disabled={
                    locationLoading
                  }
                  className="px-3 py-3 rounded-xl border border-stone-200 hover:bg-emerald-50 hover:border-emerald-300 transition text-sm font-semibold disabled:opacity-50"
                >
                  1 hour
                </button>

                <button
                  type="button"
                  onClick={() =>
                    startLiveLocation(
                      480
                    )
                  }
                  disabled={
                    locationLoading
                  }
                  className="px-3 py-3 rounded-xl border border-stone-200 hover:bg-emerald-50 hover:border-emerald-300 transition text-sm font-semibold disabled:opacity-50"
                >
                  8 hours
                </button>

              </div>

              {locationLoading && (
                <p className="text-xs text-emerald-600 mt-3 text-center font-medium">
                  Getting your location...
                </p>
              )}

            </div>
          )}

          {/* ===================================================
              INPUT
          =================================================== */}

          <div className="flex gap-2">

            {/* LOCATION BUTTON */}

            <button
              type="button"
              onClick={() =>
                setShowLocationOptions(
                  !showLocationOptions
                )
              }
              disabled={
                locationLoading
              }
              title="Share live location"
              className="w-12 h-12 rounded-xl border border-stone-200 bg-white text-emerald-600 flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-50 transition flex-shrink-0"
            >
              <MapPin className="w-5 h-5" />
            </button>

            {/* MESSAGE INPUT */}

            <input
              type="text"
              value={newMessage}
              onChange={(e) =>
                setNewMessage(
                  e.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Type a message..."
              className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={sending}
            />

            {/* SEND BUTTON */}

            <button
              onClick={
                sendMessage
              }
              disabled={
                sending ||
                !newMessage.trim()
              }
              className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}