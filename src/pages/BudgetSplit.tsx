import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  IndianRupee,
  Trash2,
  Receipt,
  Loader2,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Expense {
  id: string;
  description: string;
  amount: number;
  paid_by: string;
  created_at: string;
}

interface Member {
  id: string;
  name: string;
}

export default function BudgetSplit() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (tripId) {
      loadExpenses();
      loadMembers();
    }
  }, [tripId]);

  const loadExpenses = async () => {
    if (!tripId) return;

    const { data, error } = await supabase
      .from('trip_expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (!error) {
      setExpenses(data || []);
    }

    setLoading(false);
  };

  const loadMembers = async () => {
    /*
      TEMPORARY:
      Current logged-in user is added as a member.
      Later we will connect this with your confirmed-trip members.
    */

    if (user) {
      setMembers([
        {
          id: user.id,
          name: user.email || 'You',
        },
      ]);

      setPaidBy(user.id);
    }
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tripId || !user) return;

    if (!description.trim() || !amount || Number(amount) <= 0) {
      alert('Please enter a valid expense and amount.');
      return;
    }

    setAdding(true);

    const { data, error } = await supabase
      .from('trip_expenses')
      .insert({
        trip_id: tripId,
        description: description.trim(),
        amount: Number(amount),
        paid_by: paidBy || user.id,
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      setAdding(false);
      return;
    }

    if (data) {
      setExpenses((prev) => [data, ...prev]);
    }

    setDescription('');
    setAmount('');
    setAdding(false);
  };

  const deleteExpense = async (id: string) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this expense?'
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from('trip_expenses')
      .delete()
      .eq('id', id);

    if (error) {
      alert(error.message);
      return;
    }

    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
  };

  const totalExpense = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );

  const equalShare =
    members.length > 0 ? totalExpense / members.length : totalExpense;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-stone-200"
          >
            <ArrowLeft size={22} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-stone-900">
              Budget Split
            </h1>
            <p className="text-sm text-stone-500">
              Track and split your trip expenses
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200">
            <p className="text-sm text-stone-500">Total Expenses</p>

            <div className="flex items-center gap-1 mt-2">
              <IndianRupee size={24} />
              <span className="text-3xl font-bold">
                {totalExpense.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200">
            <p className="text-sm text-stone-500">Equal Share</p>

            <div className="flex items-center gap-1 mt-2">
              <IndianRupee size={24} />
              <span className="text-3xl font-bold">
                {equalShare.toFixed(2)}
              </span>
            </div>
          </div>

        </div>

        {/* Add Expense */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 mb-6">

          <div className="flex items-center gap-2 mb-5">
            <Plus size={20} />
            <h2 className="text-lg font-semibold">
              Add Expense
            </h2>
          </div>

          <form onSubmit={addExpense} className="space-y-4">

            <div>
              <label className="block text-sm font-medium mb-1">
                Expense
              </label>

              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hotel, Food, Taxi..."
                className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Amount
              </label>

              <div className="relative">
                <IndianRupee
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"
                />

                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full border border-stone-300 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Paid By
              </label>

              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full border border-stone-300 rounded-xl px-4 py-3"
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={adding}
              className="w-full bg-emerald-700 text-white rounded-xl py-3 font-semibold hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {adding ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Add Expense
                </>
              )}
            </button>

          </form>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200">

          <div className="p-6 border-b border-stone-200">
            <h2 className="text-lg font-semibold">
              Expenses
            </h2>
          </div>

          {expenses.length === 0 ? (
            <div className="p-10 text-center text-stone-500">
              <Receipt size={40} className="mx-auto mb-3 opacity-50" />
              <p>No expenses added yet.</p>
            </div>
          ) : (
            <div>
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-5 border-b border-stone-100 last:border-b-0"
                >

                  <div>
                    <p className="font-semibold text-stone-900">
                      {expense.description}
                    </p>

                    <p className="text-sm text-stone-500 mt-1">
                      Paid by{' '}
                      {expense.paid_by === user?.id
                        ? 'You'
                        : 'Trip member'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center font-semibold">
                      <IndianRupee size={16} />
                      {Number(expense.amount).toFixed(2)}
                    </div>

                    {expense.paid_by === user?.id && (
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}