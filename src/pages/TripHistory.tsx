import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Calendar,
  MapPin,
  IndianRupee,
  Clock,
  CheckCircle2,
  History,
  ArrowRight,
  Plane
} from 'lucide-react';

export default function TripHistory() {
  const { user } = useAuth();

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // FETCH COMPLETED / PAST TRIPS
  // =====================================================

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTripHistory = async () => {
      try {
        setLoading(true);

        const today = new Date()
          .toISOString()
          .split('T')[0];

        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .lt('end_date', today)
          .order('end_date', {
            ascending: false
          });

        if (error) {
          console.error(
            'Trip history error:',
            error
          );

          setTrips([]);
          return;
        }

        setTrips(data || []);

      } catch (error) {
        console.error(
          'Failed to fetch trip history:',
          error
        );

        setTrips([]);

      } finally {
        setLoading(false);
      }
    };

    fetchTripHistory();

  }, [user]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">

        <div className="text-center">

          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <History className="w-7 h-7 text-emerald-600" />
          </div>

          <p className="text-stone-500">
            Loading your trip history...
          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-8">

      <div className="max-w-6xl mx-auto">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">

              <History className="w-6 h-6 text-emerald-600" />

            </div>

            <div>

              <h1 className="text-3xl md:text-4xl font-bold text-stone-900">
                Trip History
              </h1>

              <p className="text-stone-500 mt-1">
                Explore the trips you have completed.
              </p>

            </div>

          </div>

        </div>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {trips.length === 0 ? (

          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-12 text-center">

            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">

              <Plane className="w-9 h-9 text-emerald-600" />

            </div>

            <h2 className="text-2xl font-bold text-stone-900">
              No Trip History Yet
            </h2>

            <p className="text-stone-500 mt-2 max-w-md mx-auto">
              Your completed trips will appear here once
              you finish your first trip.
            </p>

            <Link
              to="/browse-trips"
              className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
            >
              Explore Trips

              <ArrowRight className="w-4 h-4" />

            </Link>

          </div>

        ) : (

          <>
            {/* =================================================
                SUMMARY
            ================================================= */}

            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 mb-8">

              <div className="flex items-center gap-4">

                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">

                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />

                </div>

                <div>

                  <p className="text-sm text-stone-500">
                    Completed Trips
                  </p>

                  <h2 className="text-3xl font-bold text-stone-900">
                    {trips.length}
                  </h2>

                </div>

              </div>

            </div>

            {/* =================================================
                TRIP CARDS
            ================================================= */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {trips.map((trip) => {

                const startDate = trip.start_date
                  ? new Date(
                      trip.start_date
                    ).toLocaleDateString(
                      'en-IN',
                      {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      }
                    )
                  : 'Not available';

                const endDate = trip.end_date
                  ? new Date(
                      trip.end_date
                    ).toLocaleDateString(
                      'en-IN',
                      {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      }
                    )
                  : 'Not available';

                return (

                  <div
                    key={trip.id}
                    className="bg-white rounded-3xl border border-stone-200 shadow-sm hover:shadow-lg transition overflow-hidden"
                  >

                    {/* TOP */}

                    <div className="bg-emerald-600 p-6 text-white">

                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <div className="flex items-center gap-2 mb-2">

                            <MapPin className="w-5 h-5" />

                            <span className="text-sm text-emerald-100">
                              Destination
                            </span>

                          </div>

                          <h2 className="text-2xl font-bold">
                            {trip.destination ||
                              'Unknown Destination'}
                          </h2>

                        </div>

                        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">

                          <Plane className="w-5 h-5" />

                        </div>

                      </div>

                    </div>

                    {/* CONTENT */}

                    <div className="p-6">

                      {/* DESCRIPTION */}

                      <p className="text-stone-600 mb-5 line-clamp-3">

                        {trip.description ||
                          'No description available for this trip.'}

                      </p>

                      {/* DATE */}

                      <div className="flex items-start gap-3 mb-4">

                        <Calendar className="w-5 h-5 text-emerald-600 mt-0.5" />

                        <div>

                          <p className="text-xs text-stone-400">
                            Travel Dates
                          </p>

                          <p className="text-sm font-semibold text-stone-800">
                            {startDate} → {endDate}
                          </p>

                        </div>

                      </div>

                      {/* BUDGET */}

                      {trip.budget !== null &&
                        trip.budget !== undefined && (

                        <div className="flex items-start gap-3 mb-4">

                          <IndianRupee className="w-5 h-5 text-emerald-600 mt-0.5" />

                          <div>

                            <p className="text-xs text-stone-400">
                              Budget
                            </p>

                            <p className="text-sm font-semibold text-stone-800">
                              ₹{trip.budget}
                            </p>

                          </div>

                        </div>

                      )}

                      {/* STATUS */}

                      <div className="flex items-center gap-2 mb-5">

                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />

                        <span className="text-sm font-semibold text-emerald-700">
                          Trip Completed
                        </span>

                      </div>

                      {/* VIEW BUTTON */}

                      <Link
                        to={`/trip/${trip.id}`}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-emerald-600 text-emerald-600 font-semibold hover:bg-emerald-50 transition"
                      >

                        View Trip

                        <ArrowRight className="w-4 h-4" />

                      </Link>

                    </div>

                  </div>

                );

              })}

            </div>

          </>

        )}

      </div>

    </div>
  );
}