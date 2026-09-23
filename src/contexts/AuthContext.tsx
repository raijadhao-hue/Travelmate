import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;

  // Online users
  onlineUsers: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // ONLINE USERS
  // =====================================================

  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // =====================================================
  // FETCH PROFILE
  // =====================================================

  const fetchProfile = async (userId: string) => {
    try {
      const {
        data,
        error,
      } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error(
          'Error fetching profile:',
          error
        );
      }

      setProfile(data);
    } catch (err) {
      console.error(
        'Unexpected error fetching profile:',
        err
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // AUTH + PRESENCE
  // =====================================================

  useEffect(() => {
    let presenceChannel: any = null;
    let currentUserId: string | null = null;

    // ---------------------------------------------------
    // UPDATE LAST SEEN
    // ---------------------------------------------------

    const updateLastSeen = async (
      userId: string
    ) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          last_seen: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error(
          'Failed to update last_seen:',
          error
        );
      }
    };

    // ---------------------------------------------------
    // SETUP ONLINE PRESENCE
    // ---------------------------------------------------

    const setupPresence = async (
      loggedInUser: User
    ) => {
      currentUserId = loggedInUser.id;

      // Remove old channel if any
      if (presenceChannel) {
        await supabase.removeChannel(
          presenceChannel
        );
      }

      presenceChannel = supabase.channel(
        'travelmate-online-users',
        {
          config: {
            presence: {
              key: loggedInUser.id,
            },
          },
        }
      );

      // -----------------------------------------------
      // PRESENCE SYNC
      // -----------------------------------------------

      const updateOnlineUsers = () => {
        if (!presenceChannel) return;

        const state =
          presenceChannel.presenceState();

        const users: string[] = [];

        Object.keys(state).forEach(
          (key) => {
            const entries =
              state[key] || [];

            if (entries.length > 0) {
              users.push(key);
            }
          }
        );

        setOnlineUsers(users);
      };

      presenceChannel.on(
        'presence',
        {
          event: 'sync',
        },
        updateOnlineUsers
      );

      presenceChannel.on(
        'presence',
        {
          event: 'join',
        },
        updateOnlineUsers
      );

      presenceChannel.on(
        'presence',
        {
          event: 'leave',
        },
        updateOnlineUsers
      );

      // -----------------------------------------------
      // SUBSCRIBE
      // -----------------------------------------------

      presenceChannel.subscribe(
        async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              user_id: loggedInUser.id,
              online_at:
                new Date().toISOString(),
            });

            // Update last seen when coming online
            await updateLastSeen(
              loggedInUser.id
            );

            updateOnlineUsers();
          }
        }
      );

      // -----------------------------------------------
      // TAB VISIBILITY
      // -----------------------------------------------

      const handleVisibilityChange =
        async () => {
          if (!currentUserId) return;

          if (
            document.visibilityState ===
            'visible'
          ) {
            // User came back
            await updateLastSeen(
              currentUserId
            );

            if (presenceChannel) {
              await presenceChannel.track({
                user_id: currentUserId,
                online_at:
                  new Date().toISOString(),
              });
            }
          } else {
            // User switched away
            await updateLastSeen(
              currentUserId
            );
          }
        };

      document.addEventListener(
        'visibilitychange',
        handleVisibilityChange
      );

      // Save cleanup function on channel
      presenceChannel.__cleanup =
        () => {
          document.removeEventListener(
            'visibilitychange',
            handleVisibilityChange
          );
        };
    };

    // ===================================================
    // GET CURRENT SESSION
    // ===================================================

    supabase.auth
      .getSession()
      .then(
        async ({
          data: { session },
        }) => {
          const loggedInUser =
            session?.user ?? null;

          setUser(loggedInUser);

          if (loggedInUser) {
            await fetchProfile(
              loggedInUser.id
            );

            await setupPresence(
              loggedInUser
            );
          } else {
            setLoading(false);
          }
        }
      )
      .catch((error) => {
        console.error('Session error:', error);
        setLoading(false);
      });

    // ===================================================
    // AUTH STATE CHANGES
    // ===================================================

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        async (
          _event,
          session
        ) => {
          const loggedInUser =
            session?.user ?? null;

          setUser(loggedInUser);

          if (loggedInUser) {
            await fetchProfile(
              loggedInUser.id
            );

            // Avoid unnecessary duplicate setup
            if (
              currentUserId !==
              loggedInUser.id
            ) {
              await setupPresence(
                loggedInUser
              );
            }
          } else {
            setProfile(null);
            setOnlineUsers([]);
            setLoading(false);

            if (presenceChannel) {
              if (
                presenceChannel.__cleanup
              ) {
                presenceChannel.__cleanup();
              }

              await presenceChannel.untrack();

              await supabase.removeChannel(
                presenceChannel
              );

              presenceChannel = null;
              currentUserId = null;
            }
          }
        }
      );

    // ===================================================
    // CLEANUP
    // ===================================================

    return () => {
      subscription.unsubscribe();

      if (presenceChannel) {
        if (
          presenceChannel.__cleanup
        ) {
          presenceChannel.__cleanup();
        }

        presenceChannel.untrack();

        supabase.removeChannel(
          presenceChannel
        );

        presenceChannel = null;
      }
    };
  }, []);

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = async () => {
    if (user) {
      // Update last seen before logout
      await supabase
        .from('profiles')
        .update({
          last_seen:
            new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    await supabase.auth.signOut();
  };

  // =====================================================
  // REFRESH PROFILE
  // =====================================================

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // =====================================================
  // PROVIDER
  // =====================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        logout,
        refreshProfile,
        isAuthenticated: !!user,
        onlineUsers,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

// =======================================================
// USE AUTH
// =======================================================

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
}