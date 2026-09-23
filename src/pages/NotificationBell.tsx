import React, { useEffect, useState } from 'react';
import {
  Bell,
  UserPlus,
  Heart,
  MessageCircle,
  MapPin,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  message: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function NotificationBell() {
  const { user } = useAuth();

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [open, setOpen] = useState(false);

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // UNREAD COUNT
  // =====================================================

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  // =====================================================
  // LOAD NOTIFICATIONS
  // =====================================================

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          user_id,
          actor_id,
          type,
          title,
          message,
          reference_id,
          reference_type,
          is_read,
          created_at,
          actor:profiles!notifications_actor_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', {
          ascending: false,
        })
        .limit(50);

      if (error) {
        console.error(
          'LOAD NOTIFICATIONS ERROR:',
          error
        );
        return;
      }

      // =================================================
      // FIX TYPESCRIPT / SUPABASE RELATION TYPE
      // =================================================

      const formattedNotifications: Notification[] =
        (data || []).map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          actor_id: item.actor_id,
          type: item.type,
          title: item.title,
          message: item.message,
          reference_id: item.reference_id,
          reference_type:
            item.reference_type,
          is_read: item.is_read,
          created_at: item.created_at,
          actor: item.actor || null,
        }));

      setNotifications(
        formattedNotifications
      );

    } catch (error) {
      console.error(
        'LOAD NOTIFICATIONS FAILED:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD + REALTIME
  // =====================================================

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    loadNotifications();

    const channel = supabase
      .channel(
        `notifications-${user.id}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log(
            'NEW NOTIFICATION:',
            payload.new
          );

          const newNotification: Notification = {
            id: (payload.new as any).id,
            user_id:
              (payload.new as any).user_id,
            actor_id:
              (payload.new as any).actor_id ||
              null,
            type:
              (payload.new as any).type,
            title:
              (payload.new as any).title,
            message:
              (payload.new as any).message ||
              null,
            reference_id:
              (payload.new as any)
                .reference_id || null,
            reference_type:
              (payload.new as any)
                .reference_type || null,
            is_read:
              (payload.new as any).is_read ??
              false,
            created_at:
              (payload.new as any).created_at,
            actor: null,
          };

          setNotifications((prev) => {

            const alreadyExists =
              prev.some(
                (notification) =>
                  notification.id ===
                  newNotification.id
              );

            if (alreadyExists) {
              return prev;
            }

            return [
              newNotification,
              ...prev,
            ];
          });
        }
      )
      .subscribe((status) => {
        console.log(
          'Notification realtime status:',
          status
        );
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // =====================================================
  // MARK ONE AS READ
  // =====================================================

  const markRead = async (
    notificationId: string
  ) => {
    if (!user) return;

    const notification =
      notifications.find(
        (item) =>
          item.id === notificationId
      );

    if (
      !notification ||
      notification.is_read
    ) {
      return;
    }

    // -----------------------------------------------
    // Immediately reduce count in UI
    // -----------------------------------------------

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              is_read: true,
            }
          : item
      )
    );

    // -----------------------------------------------
    // Update Supabase
    // -----------------------------------------------

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error(
        'MARK READ ERROR:',
        error
      );

      // ---------------------------------------------
      // Revert if database update failed
      // ---------------------------------------------

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                is_read: false,
              }
            : item
        )
      );
    }
  };

  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  const markAllRead = async () => {
    if (!user || unreadCount === 0) {
      return;
    }

    // -----------------------------------------------
    // Immediately make all read
    // -----------------------------------------------

    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );

    // -----------------------------------------------
    // Update Supabase
    // -----------------------------------------------

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
      })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error(
        'MARK ALL READ ERROR:',
        error
      );

      await loadNotifications();
    }
  };

  // =====================================================
  // ICON
  // =====================================================

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow':
      case 'friend_request':
      case 'buddy_connection':
        return (
          <UserPlus
            size={18}
            className="text-emerald-600"
          />
        );

      case 'like':
      case 'trip_like':
        return (
          <Heart
            size={18}
            className="text-red-500 fill-red-500"
          />
        );

      case 'comment':
      case 'message':
        return (
          <MessageCircle
            size={18}
            className="text-blue-500"
          />
        );

      case 'new_trip':
        return (
          <MapPin
            size={18}
            className="text-emerald-600"
          />
        );

      default:
        return (
          <Bell
            size={18}
            className="text-stone-500"
          />
        );
    }
  };

  // =====================================================
  // TIME AGO
  // =====================================================

  const timeAgo = (date: string) => {
    const diff =
      Date.now() -
      new Date(date).getTime();

    const minutes = Math.floor(
      diff / 60000
    );

    if (minutes < 1) {
      return 'Just now';
    }

    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    if (hours < 24) {
      return `${hours}h`;
    }

    const days = Math.floor(
      hours / 24
    );

    if (days < 7) {
      return `${days}d`;
    }

    return new Date(
      date
    ).toLocaleDateString('en-IN');
  };

  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!user) {
    return null;
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="relative">

      {/* =================================================
          BELL
      ================================================= */}

      <button
        type="button"
        onClick={() =>
          setOpen((prev) => !prev)
        }
        className="relative p-2.5 rounded-xl hover:bg-stone-100 transition"
      >
        <Bell
          size={23}
          className="text-stone-700"
        />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
            {unreadCount > 99
              ? '99+'
              : unreadCount}
          </span>
        )}
      </button>

      {/* =================================================
          DROPDOWN
      ================================================= */}

      {open && (
        <>
          {/* BACKDROP */}

          <div
            className="fixed inset-0 z-40"
            onClick={() =>
              setOpen(false)
            }
          />

          {/* DROPDOWN */}

          <div className="absolute right-0 top-14 w-[380px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="px-5 py-4 border-b flex items-center justify-between">

              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  Notifications
                </h3>

                {unreadCount > 0 && (
                  <p className="text-xs text-stone-500 mt-1">
                    {unreadCount} unread
                  </p>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                >
                  Mark all read
                </button>
              )}

            </div>

            {/* =================================================
                NOTIFICATION LIST
            ================================================= */}

            <div className="max-h-[500px] overflow-y-auto">

              {loading ? (

                <div className="py-12 text-center text-stone-500">
                  Loading...
                </div>

              ) : notifications.length ===
                0 ? (

                <div className="py-14 text-center">

                  <Bell
                    size={40}
                    className="mx-auto text-stone-300 mb-3"
                  />

                  <p className="font-semibold text-stone-700">
                    No notifications
                  </p>

                  <p className="text-sm text-stone-400 mt-1">
                    You're all caught up!
                  </p>

                </div>

              ) : (

                notifications.map(
                  (notification) => (

                    <button
                      type="button"
                      key={
                        notification.id
                      }
                      onClick={() =>
                        markRead(
                          notification.id
                        )
                      }
                      className={`w-full text-left px-5 py-4 flex gap-3 hover:bg-stone-50 transition border-b border-stone-100 ${
                        !notification.is_read
                          ? 'bg-emerald-50/60'
                          : 'bg-white'
                      }`}
                    >

                      {/* ICON */}

                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                        {getIcon(
                          notification.type
                        )}
                      </div>

                      {/* CONTENT */}

                      <div className="flex-1 min-w-0">

                        <p className="text-sm text-stone-800">

                          <span className="font-bold">
                            {
                              notification.title
                            }
                          </span>

                        </p>

                        {notification.message && (
                          <p className="text-sm text-stone-600 mt-0.5">
                            {
                              notification.message
                            }
                          </p>
                        )}

                        <p className="text-xs text-stone-400 mt-1">
                          {timeAgo(
                            notification.created_at
                          )}
                        </p>

                      </div>

                      {/* UNREAD DOT */}

                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 shrink-0" />
                      )}

                    </button>

                  )
                )

              )}

            </div>

          </div>
        </>
      )}

    </div>
  );
}