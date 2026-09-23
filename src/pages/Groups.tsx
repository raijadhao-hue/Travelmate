import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  MapPin,
  Calendar,
  IndianRupee,
  Loader2,
  Plus,
  CheckCircle2,
  Lock,
  UserPlus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Group {
  id: string;
  name: string;
  description: string | null;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  max_members: number;
  created_by: string;
  group_type: string;
  is_private: boolean;
  member_count?: number;
  joined?: boolean;
}

export default function Groups() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError('');

      /*
       * Fetch all public groups.
       * Private groups are not shown in public listing.
       */
      const { data: groupData, error: groupError } = await supabase
        .from('travel_groups')
        .select('*')
        .eq('is_private', false)
        .order('start_date', { ascending: true });

      if (groupError) {
        console.error('Fetch groups error:', groupError);
        throw groupError;
      }

      if (!groupData || groupData.length === 0) {
        setGroups([]);
        return;
      }

      const groupIds = groupData.map((group) => group.id);

      /*
       * Get accepted members for all groups.
       */
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id, user_id, status')
        .in('group_id', groupIds)
        .eq('status', 'accepted');

      if (memberError) {
        console.error('Fetch group members error:', memberError);
        throw memberError;
      }

      const memberCounts: Record<string, number> = {};
      const joinedGroups = new Set<string>();

      (memberData || []).forEach((member) => {
        memberCounts[member.group_id] =
          (memberCounts[member.group_id] || 0) + 1;

        if (user && member.user_id === user.id) {
          joinedGroups.add(member.group_id);
        }
      });

      const formattedGroups: Group[] = groupData.map((group) => {
        /*
         * Safety rule:
         * Duo = maximum 2
         * Every other group = maximum 5
         *
         * We also respect a smaller max_members value
         * already stored in the database.
         */
        const databaseMax = Number(group.max_members || 5);

        const maxMembers =
          String(group.group_type).toLowerCase() === 'duo'
            ? 2
            : Math.min(databaseMax, 5);

        return {
          ...group,
          max_members: maxMembers,
          member_count: memberCounts[group.id] || 0,
          joined: joinedGroups.has(group.id),
        };
      });

      setGroups(formattedGroups);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || 'Unable to load travel groups.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (group: Group) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const currentMembers = group.member_count || 0;
    const maxMembers = group.max_members || 5;

    /*
     * NEVER allow joining a full group.
     */
    if (currentMembers >= maxMembers) {
      return;
    }

    /*
     * Don't allow the same user to join twice.
     */
    if (group.joined) {
      return;
    }

    try {
      setJoiningId(group.id);
      setError('');

      /*
       * Re-check the member count directly from Supabase
       * before inserting. This prevents joining based on
       * an old/stale card count.
       */
      const { count, error: countError } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id)
        .eq('status', 'accepted');

      if (countError) {
        throw countError;
      }

      const latestCount = count || 0;

      if (latestCount >= maxMembers) {
        setError(
          `"${group.name}" is now full. No more members can join.`
        );

        await fetchGroups();
        return;
      }

      /*
       * Check whether the user already has a membership/request.
       */
      const { data: existingMember, error: existingError } =
        await supabase
          .from('group_members')
          .select('id, status')
          .eq('group_id', group.id)
          .eq('user_id', user.id)
          .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingMember) {
        if (existingMember.status === 'accepted') {
          await fetchGroups();
          return;
        }

        setError(
          'You already have a request for this group.'
        );
        return;
      }

      /*
       * Add the traveller as accepted.
       *
       * If your project uses an approval/request system,
       * change this status to 'pending'.
       */
      const { error: insertError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          status: 'accepted',
        });

      if (insertError) {
        throw insertError;
      }

      await fetchGroups();
    } catch (err: any) {
      console.error('Join group error:', err);

      setError(
        err?.message || 'Unable to join this group.'
      );
    } finally {
      setJoiningId(null);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '';

    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getCapacityText = (group: Group) => {
    const current = group.member_count || 0;
    const max = group.max_members || 5;

    if (current >= max) {
      return 'FULL';
    }

    const spots = max - current;

    return `${current}/${max} • ${spots} ${
      spots === 1 ? 'spot' : 'spots'
    } left`;
  };

  const isFull = (group: Group) => {
    return (group.member_count || 0) >= (group.max_members || 5);
  };

  return (
    <div className="min-h-screen bg-stone-50">

      {/* HEADER */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          <div className="flex items-center">

            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-stone-100 transition mr-3"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex items-center gap-2">

              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Users
                  size={20}
                  className="text-emerald-600"
                />
              </div>

              <div>
                <h1 className="font-bold text-stone-900">
                  Travel Groups
                </h1>

                <p className="text-xs text-stone-500">
                  Find travellers for your trip
                </p>
              </div>

            </div>

          </div>

          <Link
            to="/create-group"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold transition"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">
              Create Group
            </span>
          </Link>

        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* TITLE */}
        <div className="mb-7">

          <h2 className="text-3xl font-bold text-stone-900">
            Explore Travel Groups
          </h2>

          <p className="text-stone-500 mt-1">
            Join travellers heading to the same destination.
          </p>

        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            <p className="font-medium">
              {error}
            </p>
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="flex items-center justify-center py-20">

            <Loader2
              size={32}
              className="animate-spin text-emerald-600"
            />

          </div>
        ) : groups.length === 0 ? (

          /* EMPTY STATE */
          <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center">

            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
              <Users
                size={26}
                className="text-emerald-600"
              />
            </div>

            <h3 className="text-xl font-bold text-stone-900">
              No travel groups yet
            </h3>

            <p className="text-stone-500 mt-2 mb-6">
              Be the first traveller to create a group.
            </p>

            <Link
              to="/create-group"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-semibold"
            >
              <Plus size={18} />
              Create Group
            </Link>

          </div>

        ) : (

          /* GROUP GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {groups.map((group) => {

              const full = isFull(group);
              const joined = group.joined;
              const current = group.member_count || 0;
              const max = group.max_members || 5;

              return (
                <div
                  key={group.id}
                  className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden hover:shadow-md transition"
                >

                  {/* CARD TOP */}
                  <div className="p-5">

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <div className="flex items-center gap-2 mb-1">

                          <h3 className="text-lg font-bold text-stone-900 truncate">
                            {group.name}
                          </h3>

                        </div>

                        <p className="text-sm text-stone-500">
                          {group.group_type}
                        </p>

                      </div>

                      {/* CAPACITY BADGE */}
                      <div
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${
                          full
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {full ? (
                          <span className="flex items-center gap-1">
                            <Lock size={12} />
                            FULL
                          </span>
                        ) : (
                          `${current}/${max}`
                        )}
                      </div>

                    </div>

                    {/* DESTINATION */}
                    <div className="flex items-center gap-2 mt-5 text-stone-700">

                      <MapPin
                        size={17}
                        className="text-emerald-600 shrink-0"
                      />

                      <span className="font-medium">
                        {group.destination}
                      </span>

                    </div>

                    {/* DATES */}
                    <div className="flex items-center gap-2 mt-3 text-sm text-stone-600">

                      <Calendar
                        size={16}
                        className="text-emerald-600 shrink-0"
                      />

                      <span>
                        {formatDate(group.start_date)}
                        {' – '}
                        {formatDate(group.end_date)}
                      </span>

                    </div>

                    {/* BUDGET */}
                    <div className="flex items-center gap-2 mt-3 text-sm text-stone-600">

                      <IndianRupee
                        size={16}
                        className="text-emerald-600 shrink-0"
                      />

                      <span>
                        ₹{Number(group.budget || 0).toLocaleString(
                          'en-IN'
                        )}{' '}
                        / person
                      </span>

                    </div>

                    {/* CAPACITY INFORMATION */}
                    <div
                      className={`mt-5 rounded-xl p-3 border ${
                        full
                          ? 'bg-red-50 border-red-100'
                          : 'bg-emerald-50 border-emerald-100'
                      }`}
                    >

                      <div className="flex items-center gap-2">

                        <Users
                          size={18}
                          className={
                            full
                              ? 'text-red-600'
                              : 'text-emerald-600'
                          }
                        />

                        <div>

                          <p
                            className={`text-sm font-bold ${
                              full
                                ? 'text-red-800'
                                : 'text-emerald-800'
                            }`}
                          >
                            {getCapacityText(group)}
                          </p>

                          <p
                            className={`text-xs mt-0.5 ${
                              full
                                ? 'text-red-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {full
                              ? 'No more members can join'
                              : group.group_type.toLowerCase() ===
                                'duo'
                              ? 'Duo trip • Maximum 2 members'
                              : 'Group trip • Maximum 5 members'}
                          </p>

                        </div>

                      </div>

                    </div>

                    {/* DESCRIPTION */}
                    {group.description && (
                      <p className="text-sm text-stone-500 mt-4 line-clamp-2">
                        {group.description}
                      </p>
                    )}

                  </div>

                  {/* CARD FOOTER */}
                  <div className="border-t border-stone-100 p-4 flex gap-2">

                    {/* VIEW */}
                    <Link
                      to={`/group/${group.id}`}
                      className="flex-1 text-center px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50 transition"
                    >
                      View Details
                    </Link>

                    {/* JOIN */}
                    {joined ? (

                      <button
                        disabled
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-100 text-emerald-700 font-semibold cursor-default"
                      >
                        <CheckCircle2 size={17} />
                        Joined
                      </button>

                    ) : full ? (

                      <button
                        disabled
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 text-stone-400 font-semibold cursor-not-allowed"
                      >
                        <Lock size={17} />
                        Full
                      </button>

                    ) : (

                      <button
                        onClick={() => handleJoinGroup(group)}
                        disabled={joiningId === group.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold transition"
                      >

                        {joiningId === group.id ? (
                          <>
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                            Joining...
                          </>
                        ) : (
                          <>
                            <UserPlus size={17} />
                            Join
                          </>
                        )}

                      </button>

                    )}

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </main>

    </div>
  );
}