import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function BlockedUsers() {

  const { user } = useAuth();

  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  useEffect(() => {

    if (!user) return;

    const fetchBlockedUsers = async () => {

      // 🔥 FETCH BLOCK LIST
      const { data, error } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('blocker_id', user.id);

      if (error) {
        console.log(error);
        return;
      }

      if (!data || data.length === 0) {
        setBlockedUsers([]);
        return;
      }

      // 🔥 GET BLOCKED USER IDS
      const blockedIds = data.map(
        (item: any) => item.blocked_user_id
      );

      // 🔥 FETCH PROFILE DETAILS
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', blockedIds);

      if (profileError) {
        console.log(profileError);
        return;
      }

      setBlockedUsers(profiles || []);
    };

    fetchBlockedUsers();

  }, [user]);

  // 🔥 UNBLOCK FUNCTION
  const handleUnblock = async (buddyId: string) => {

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user?.id)
      .eq('blocked_user_id', buddyId);

    if (error) {
      console.log(error);
      alert("Failed to unblock");
      return;
    }

    alert("User unblocked");

    setBlockedUsers((prev) =>
      prev.filter((u) => u.id !== buddyId)
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 p-8">

      <div className="max-w-4xl mx-auto">

        <h1 className="text-3xl font-bold mb-8">
          Blocked Users
        </h1>

        <div className="space-y-4">

          {blockedUsers.length === 0 ? (

            <div className="bg-white rounded-2xl border p-6 text-stone-500">
              No blocked users.
            </div>

          ) : (

            blockedUsers.map((user) => (

              <div
                key={user.id}
                className="bg-white rounded-2xl border p-5 flex items-center justify-between"
              >

                <div>
                  <h2 className="font-bold text-lg">
                    {user.full_name}
                  </h2>

                  <p className="text-sm text-stone-500">
                    {user.email}
                  </p>
                </div>

                <button
                  onClick={() => handleUnblock(user.id)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-700"
                >
                  Unblock
                </button>

              </div>

            ))
          )}

        </div>
      </div>
    </div>
  );
}