import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  MapPin,
  Calendar,
  IndianRupee,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function CreateGroup() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [maxMembers, setMaxMembers] = useState('5');
  const [groupType, setGroupType] = useState('Friends');
  const [isPrivate, setIsPrivate] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setError('');

    // -----------------------------
    // AUTH CHECK
    // -----------------------------
    if (!user) {
      setError('Please login first.');
      return;
    }

    // -----------------------------
    // BASIC VALIDATION
    // -----------------------------
    if (!name.trim()) {
      setError('Please enter a group name.');
      return;
    }

    if (!destination.trim()) {
      setError('Please enter a destination.');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }

    // -----------------------------
    // DATE VALIDATION
    // -----------------------------
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (end < start) {
      setError('End date cannot be before start date.');
      return;
    }

    // -----------------------------
    // BUDGET VALIDATION
    // -----------------------------
    const budgetNumber = Number(budget);

    if (budget === '' || !Number.isFinite(budgetNumber) || budgetNumber < 0) {
      setError('Please enter a valid budget.');
      return;
    }

    // -----------------------------
    // MEMBER VALIDATION
    // -----------------------------
    const membersNumber = Number(maxMembers);

    if (
      !Number.isInteger(membersNumber) ||
      membersNumber < 2 ||
      membersNumber > 5
    ) {
      setError('Maximum members must be between 2 and 5.');
      return;
    }

    try {
      setLoading(true);

      // -----------------------------
      // CREATE GROUP
      // -----------------------------
      const { data: group, error: groupError } = await supabase
        .from('travel_groups')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          destination: destination.trim(),
          start_date: startDate,
          end_date: endDate,
          budget: budgetNumber,
          max_members: membersNumber,
          created_by: user.id,
          group_type: groupType,
          is_private: isPrivate,
        })
        .select('*')
        .single();

      if (groupError) {
        console.error('TRAVEL_GROUPS INSERT ERROR:', groupError);

        throw new Error(
          groupError.message ||
            'Unable to create the travel group.'
        );
      }

      if (!group?.id) {
        throw new Error('Group was created but no group ID was returned.');
      }

      // -----------------------------
      // ADD CREATOR AS FIRST MEMBER
      // -----------------------------
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          status: 'accepted',
        });

      if (memberError) {
        console.error('GROUP_MEMBERS INSERT ERROR:', memberError);

        // Group was created but creator membership failed.
        // Show the real database error instead of generic message.
        throw new Error(
          `Group created, but adding you as a member failed: ${memberError.message}`
        );
      }

      // -----------------------------
      // SUCCESS
      // -----------------------------
      navigate(`/group/${group.id}`);

    } catch (err: any) {
      console.error('CREATE GROUP FAILED:', err);

      setError(
        err?.message ||
          'Unable to create group. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">

      {/* HEADER */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">

          <Link
            to="/groups"
            className="p-2 rounded-lg hover:bg-stone-100 mr-3"
          >
            <ArrowLeft size={20} />
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Users
                className="text-emerald-600"
                size={20}
              />
            </div>

            <div>
              <h1 className="font-bold text-stone-900">
                Create Group
              </h1>

              <p className="text-xs text-stone-500">
                Plan your group trip
              </p>
            </div>
          </div>

        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-4xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h2 className="text-3xl font-bold text-stone-900">
            Create a Travel Group
          </h2>

          <p className="text-stone-500 mt-1">
            Create a trip and invite other travellers to join.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            <p className="font-medium">
              {error}
            </p>
          </div>
        )}

        <form
          onSubmit={handleCreateGroup}
          className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 md:p-8"
        >

          {/* NAME */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Group Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Goa Beach Trip"
              maxLength={100}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* DESTINATION */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Destination
            </label>

            <div className="relative">
              <MapPin
                size={18}
                className="absolute left-3 top-3.5 text-emerald-500"
              />

              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Goa"
                maxLength={100}
                className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell travellers about your trip..."
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* DATES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

            {/* START DATE */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Start Date
              </label>

              <div className="relative">
                <Calendar
                  size={18}
                  className="absolute left-3 top-3.5 text-emerald-500"
                />

                <input
                  type="date"
                  value={startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setStartDate(e.target.value);

                    // If end date becomes invalid, clear it
                    if (
                      endDate &&
                      e.target.value &&
                      endDate < e.target.value
                    ) {
                      setEndDate('');
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* END DATE */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                End Date
              </label>

              <div className="relative">
                <Calendar
                  size={18}
                  className="absolute left-3 top-3.5 text-emerald-500"
                />

                <input
                  type="date"
                  value={endDate}
                  min={
                    startDate ||
                    new Date().toISOString().split('T')[0]
                  }
                  onChange={(e) =>
                    setEndDate(e.target.value)
                  }
                  className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

          </div>

          {/* BUDGET + MEMBERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

            {/* BUDGET */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Budget per Person
              </label>

              <div className="relative">
                <IndianRupee
                  size={18}
                  className="absolute left-3 top-3.5 text-emerald-500"
                />

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={budget}
                  onChange={(e) =>
                    setBudget(e.target.value)
                  }
                  placeholder="5000"
                  className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* MAX MEMBERS */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Maximum Members
              </label>

              <div className="relative">
                <Users
                  size={18}
                  className="absolute left-3 top-3.5 text-emerald-500"
                />

                <input
                  type="number"
                  min="2"
                  max="5"
                  step="1"
                  value={maxMembers}
                  onChange={(e) =>
                    setMaxMembers(e.target.value)
                  }
                  className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <p className="text-xs text-stone-500 mt-1">
                Group size: 2–5 members
              </p>
            </div>

          </div>

          {/* GROUP TYPE */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Group Type
            </label>

            <select
              value={groupType}
              onChange={(e) =>
                setGroupType(e.target.value)
              }
              className="w-full px-4 py-3 border border-stone-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Friends">Friends</option>
              <option value="Adventure">Adventure</option>
              <option value="Backpacking">Backpacking</option>
              <option value="Family">Family</option>
              <option value="Weekend">Weekend</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* PRIVATE */}
          <div className="mb-7 flex items-center justify-between bg-stone-50 rounded-xl p-4">

            <div>
              <p className="font-semibold text-stone-800">
                Private Group
              </p>

              <p className="text-sm text-stone-500">
                Private groups won't appear in public listings.
              </p>
            </div>

            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) =>
                setIsPrivate(e.target.checked)
              }
              className="w-5 h-5 accent-emerald-600"
            />

          </div>

          {/* BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-3">

            <Link
              to="/groups"
              className="flex-1 text-center px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-5 py-3 rounded-xl font-semibold"
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Creating...
                </>
              ) : (
                <>
                  <Users size={18} />
                  Create Group
                </>
              )}
            </button>

          </div>

        </form>
      </main>
    </div>
  );
}