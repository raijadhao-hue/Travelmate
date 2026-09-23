import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Clock,
  Hotel,
  Bus,
  CheckCircle2,
  Loader2,
  User,
  Navigation,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type ItineraryDay = {
  day: number;
  city: string;
  title: string;
  activities: string[];
  transport?: string;
  hotel?: string;
  hotelUrl?: string;
};

type DestinationPlan = {
  name: string;
  route: string;
  budget: string;
  duration: string;
  transport: string;
  itinerary: ItineraryDay[];
};

/*
  Destination plans
  These match the plans currently used in Plans.tsx.
*/

const destinationPlans: Record<string, DestinationPlan> = {
  'Goa, India': {
    name: 'Goa',
    route: 'North Goa → South Goa',
    budget: '₹12,000 - ₹18,000',
    duration: '5 Days',
    transport: 'Flight / Train + Local Cab',
    itinerary: [
      {
        day: 1,
        city: 'North Goa',
        title: 'Arrival & Beach Evening',
        activities: [
          'Arrive in Goa',
          'Check-in to hotel',
          'Visit Baga Beach',
          'Explore Tito’s Lane',
          'Sunset at the beach',
        ],
        transport: 'Airport/Railway Station → Hotel',
        hotel: 'North Goa Hotel',
      },
      {
        day: 2,
        city: 'North Goa',
        title: 'North Goa Sightseeing',
        activities: [
          'Fort Aguada',
          'Candolim Beach',
          'Calangute Beach',
          'Anjuna Beach',
          'Vagator Beach',
        ],
        transport: 'Local Cab / Scooter',
        hotel: 'North Goa Hotel',
      },
      {
        day: 3,
        city: 'South Goa',
        title: 'South Goa Exploration',
        activities: [
          'Travel to South Goa',
          'Colva Beach',
          'Benaulim Beach',
          'Palolem Beach',
          'Sunset at Palolem',
        ],
        transport: 'Cab / Rental Scooter',
        hotel: 'South Goa Hotel',
      },
      {
        day: 4,
        city: 'South Goa',
        title: 'Relaxation & Local Exploration',
        activities: [
          'Visit Butterfly Beach',
          'Explore local markets',
          'Beach activities',
          'Local Goan food experience',
          'Evening leisure',
        ],
        transport: 'Local Cab / Scooter',
        hotel: 'South Goa Hotel',
      },
      {
        day: 5,
        city: 'Goa',
        title: 'Departure',
        activities: [
          'Breakfast',
          'Free time',
          'Check-out',
          'Return journey',
        ],
        transport: 'Hotel → Airport/Railway Station',
      },
    ],
  },

  'Rajasthan, India': {
    name: 'Rajasthan',
    route: 'Jaipur → Jodhpur → Udaipur',
    budget: '₹18,000 - ₹25,000',
    duration: '6 Days',
    transport: 'Train / Flight + Local Cab',
    itinerary: [
      {
        day: 1,
        city: 'Jaipur',
        title: 'Arrival & Jaipur',
        activities: [
          'Arrive in Jaipur',
          'Hotel check-in',
          'City Palace',
          'Hawa Mahal',
          'Local market',
        ],
        transport: 'Airport/Railway Station → Hotel',
        hotel: 'Jaipur Hotel',
      },
      {
        day: 2,
        city: 'Jaipur',
        title: 'Jaipur Sightseeing',
        activities: [
          'Amber Fort',
          'Jal Mahal',
          'Jantar Mantar',
          'Albert Hall Museum',
        ],
        transport: 'Local Cab',
        hotel: 'Jaipur Hotel',
      },
      {
        day: 3,
        city: 'Jodhpur',
        title: 'Travel to Jodhpur',
        activities: [
          'Travel to Jodhpur',
          'Hotel check-in',
          'Mehrangarh Fort',
          'Blue City exploration',
        ],
        transport: 'Train / Cab',
        hotel: 'Jodhpur Hotel',
      },
      {
        day: 4,
        city: 'Jodhpur',
        title: 'Jodhpur Exploration',
        activities: [
          'Jaswant Thada',
          'Umaid Bhawan Palace',
          'Clock Tower Market',
          'Local food',
        ],
        transport: 'Local Cab',
        hotel: 'Jodhpur Hotel',
      },
      {
        day: 5,
        city: 'Udaipur',
        title: 'Travel to Udaipur',
        activities: [
          'Travel to Udaipur',
          'Lake Pichola',
          'City Palace',
          'Bagore Ki Haveli',
        ],
        transport: 'Cab / Bus',
        hotel: 'Udaipur Hotel',
      },
      {
        day: 6,
        city: 'Udaipur',
        title: 'Departure',
        activities: [
          'Sajjangarh Palace',
          'Local shopping',
          'Breakfast',
          'Check-out',
          'Return journey',
        ],
        transport: 'Hotel → Airport/Railway Station',
      },
    ],
  },

  'Kerala, India': {
    name: 'Kerala',
    route: 'Kochi → Munnar → Alleppey',
    budget: '₹15,000 - ₹22,000',
    duration: '5 Days',
    transport: 'Flight / Train + Cab',
    itinerary: [
      {
        day: 1,
        city: 'Kochi',
        title: 'Arrival in Kochi',
        activities: [
          'Arrive in Kochi',
          'Hotel check-in',
          'Fort Kochi',
          'Chinese Fishing Nets',
          'Marine Drive',
        ],
        transport: 'Airport/Railway Station → Hotel',
        hotel: 'Kochi Hotel',
      },
      {
        day: 2,
        city: 'Munnar',
        title: 'Travel to Munnar',
        activities: [
          'Travel to Munnar',
          'Tea plantations',
          'Waterfalls',
          'Munnar market',
        ],
        transport: 'Private Cab',
        hotel: 'Munnar Hotel',
      },
      {
        day: 3,
        city: 'Munnar',
        title: 'Munnar Sightseeing',
        activities: [
          'Eravikulam National Park',
          'Tea Museum',
          'Mattupetty Dam',
          'Echo Point',
        ],
        transport: 'Local Cab',
        hotel: 'Munnar Hotel',
      },
      {
        day: 4,
        city: 'Alleppey',
        title: 'Backwaters',
        activities: [
          'Travel to Alleppey',
          'Houseboat experience',
          'Backwater sightseeing',
          'Sunset cruise',
        ],
        transport: 'Cab',
        hotel: 'Houseboat',
      },
      {
        day: 5,
        city: 'Kochi',
        title: 'Departure',
        activities: [
          'Breakfast',
          'Free time',
          'Check-out',
          'Return journey',
        ],
        transport: 'Cab → Airport/Railway Station',
      },
    ],
  },

  'Himachal, India': {
    name: 'Himachal Pradesh',
    route: 'Shimla → Manali',
    budget: '₹15,000 - ₹22,000',
    duration: '6 Days',
    transport: 'Bus / Train + Cab',
    itinerary: [
      {
        day: 1,
        city: 'Shimla',
        title: 'Arrival in Shimla',
        activities: [
          'Arrive in Shimla',
          'Hotel check-in',
          'Mall Road',
          'The Ridge',
          'Local market',
        ],
        transport: 'Bus / Cab',
        hotel: 'Shimla Hotel',
      },
      {
        day: 2,
        city: 'Shimla',
        title: 'Shimla Sightseeing',
        activities: [
          'Kufri',
          'Jakhoo Temple',
          'Green Valley',
          'Christ Church',
        ],
        transport: 'Local Cab',
        hotel: 'Shimla Hotel',
      },
      {
        day: 3,
        city: 'Manali',
        title: 'Travel to Manali',
        activities: [
          'Travel to Manali',
          'Hotel check-in',
          'Mall Road',
          'Manali market',
        ],
        transport: 'Volvo Bus / Cab',
        hotel: 'Manali Hotel',
      },
      {
        day: 4,
        city: 'Manali',
        title: 'Manali Sightseeing',
        activities: [
          'Hadimba Temple',
          'Vashisht Hot Springs',
          'Old Manali',
          'Manali Nature Park',
        ],
        transport: 'Local Cab',
        hotel: 'Manali Hotel',
      },
      {
        day: 5,
        city: 'Manali',
        title: 'Adventure Day',
        activities: [
          'Solang Valley',
          'Adventure activities',
          'Mountain views',
          'Local cafés',
        ],
        transport: 'Local Cab',
        hotel: 'Manali Hotel',
      },
      {
        day: 6,
        city: 'Manali',
        title: 'Departure',
        activities: [
          'Breakfast',
          'Check-out',
          'Return journey',
        ],
        transport: 'Bus / Cab',
      },
    ],
  },

  Thailand: {
    name: 'Thailand',
    route: 'Bangkok → Phuket',
    budget: '₹35,000 - ₹50,000',
    duration: '6 Days',
    transport: 'Flight + Local Transport',
    itinerary: [
      {
        day: 1,
        city: 'Bangkok',
        title: 'Arrival in Bangkok',
        activities: [
          'Airport arrival',
          'Hotel check-in',
          'Bangkok city exploration',
          'Night market',
        ],
        transport: 'Airport → Hotel',
        hotel: 'Bangkok Hotel',
      },
      {
        day: 2,
        city: 'Bangkok',
        title: 'Bangkok Sightseeing',
        activities: [
          'Grand Palace',
          'Wat Arun',
          'Chao Phraya River',
          'Local market',
        ],
        transport: 'Metro / Cab / Boat',
        hotel: 'Bangkok Hotel',
      },
      {
        day: 3,
        city: 'Phuket',
        title: 'Travel to Phuket',
        activities: [
          'Flight to Phuket',
          'Hotel check-in',
          'Patong Beach',
          'Beachside evening',
        ],
        transport: 'Flight',
        hotel: 'Phuket Hotel',
      },
      {
        day: 4,
        city: 'Phuket',
        title: 'Island Tour',
        activities: [
          'Phi Phi Islands',
          'Snorkelling',
          'Island sightseeing',
          'Beach activities',
        ],
        transport: 'Boat',
        hotel: 'Phuket Hotel',
      },
      {
        day: 5,
        city: 'Phuket',
        title: 'Phuket Exploration',
        activities: [
          'Big Buddha',
          'Old Phuket Town',
          'Local markets',
          'Sunset',
        ],
        transport: 'Local Cab',
        hotel: 'Phuket Hotel',
      },
      {
        day: 6,
        city: 'Phuket',
        title: 'Departure',
        activities: [
          'Breakfast',
          'Check-out',
          'Airport transfer',
          'Return journey',
        ],
        transport: 'Hotel → Airport',
      },
    ],
  },

  Vietnam: {
    name: 'Vietnam',
    route: 'Hanoi → Da Nang → Ho Chi Minh City',
    budget: '₹35,000 - ₹50,000',
    duration: '7 Days',
    transport: 'Flight + Local Transport',
    itinerary: [
      {
        day: 1,
        city: 'Hanoi',
        title: 'Arrival in Hanoi',
        activities: [
          'Airport arrival',
          'Hotel check-in',
          'Old Quarter',
          'Local food',
        ],
        transport: 'Airport → Hotel',
        hotel: 'Hanoi Hotel',
      },
      {
        day: 2,
        city: 'Hanoi',
        title: 'Hanoi Sightseeing',
        activities: [
          'Hoan Kiem Lake',
          'Temple of Literature',
          'Old Quarter',
          'Night market',
        ],
        transport: 'Local Cab / Walk',
        hotel: 'Hanoi Hotel',
      },
      {
        day: 3,
        city: 'Da Nang',
        title: 'Travel to Da Nang',
        activities: [
          'Flight to Da Nang',
          'Hotel check-in',
          'My Khe Beach',
          'Dragon Bridge',
        ],
        transport: 'Flight',
        hotel: 'Da Nang Hotel',
      },
      {
        day: 4,
        city: 'Da Nang',
        title: 'Da Nang Exploration',
        activities: [
          'Ba Na Hills',
          'Golden Bridge',
          'Beach exploration',
        ],
        transport: 'Local Cab',
        hotel: 'Da Nang Hotel',
      },
      {
        day: 5,
        city: 'Ho Chi Minh City',
        title: 'Travel to Ho Chi Minh City',
        activities: [
          'Flight to Ho Chi Minh City',
          'Hotel check-in',
          'City exploration',
          'Local market',
        ],
        transport: 'Flight',
        hotel: 'Ho Chi Minh City Hotel',
      },
      {
        day: 6,
        city: 'Ho Chi Minh City',
        title: 'City Sightseeing',
        activities: [
          'War Remnants Museum',
          'Notre Dame Cathedral',
          'Ben Thanh Market',
          'Local food',
        ],
        transport: 'Local Cab',
        hotel: 'Ho Chi Minh City Hotel',
      },
      {
        day: 7,
        city: 'Ho Chi Minh City',
        title: 'Departure',
        activities: [
          'Breakfast',
          'Free time',
          'Check-out',
          'Return journey',
        ],
        transport: 'Hotel → Airport',
      },
    ],
  },
};

function normalizeDestination(destination: string) {
  const value = destination.trim().toLowerCase();

  if (value.includes('goa')) return 'Goa, India';
  if (value.includes('rajasthan')) return 'Rajasthan, India';
  if (value.includes('kerala')) return 'Kerala, India';
  if (value.includes('himachal')) return 'Himachal, India';
  if (value.includes('thailand')) return 'Thailand';
  if (value.includes('vietnam')) return 'Vietnam';

  return destination.trim();
}

function formatDate(dateString: string) {
  if (!dateString) return '';

  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    'en-IN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );
}

function getDayDate(startDate: string, dayNumber: number) {
  const date = new Date(`${startDate}T00:00:00`);

  date.setDate(date.getDate() + dayNumber - 1);

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export default function TripDetails() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (tripId) {
      fetchTripDetails();
    }
  }, [tripId]);

  const fetchTripDetails = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      if (!tripId) {
        setErrorMessage('Trip ID is missing.');
        return;
      }

      // ================= TRIP =================

      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) {
        console.error('Trip fetch error:', tripError);
        throw tripError;
      }

      setTrip(tripData);

      // ================= CREATOR =================

      if (tripData.user_id) {
        const { data: creatorData, error: creatorError } =
          await supabase
            .from('profiles')
            .select(
              'id, full_name, email, avatar_url, profile_photo_url, bio, about_me, is_verified'
            )
            .eq('id', tripData.user_id)
            .maybeSingle();

        if (creatorError) {
          console.error('Creator fetch error:', creatorError);
        }

        setCreator(creatorData);
      }

      // ================= MEMBERS =================

      const { data: memberRows, error: memberError } =
        await supabase
          .from('trip_members')
          .select('user_id, status')
          .eq('trip_id', tripId)
          .eq('status', 'accepted');

      if (memberError) {
        console.error('Members fetch error:', memberError);
      }

      if (memberRows && memberRows.length > 0) {
        const memberIds = memberRows.map(
          (member: any) => member.user_id
        );

        const { data: memberProfiles, error: profileError } =
          await supabase
            .from('profiles')
            .select(
              'id, full_name, email, avatar_url, profile_photo_url, is_verified'
            )
            .in('id', memberIds);

        if (profileError) {
          console.error('Member profiles error:', profileError);
        }

        setMembers(memberProfiles || []);
      } else {
        setMembers([]);
      }
    } catch (error: any) {
      console.error('Trip details error:', error);

      setErrorMessage(
        error?.message ||
          'Unable to load this trip. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ================= LOADING =================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-stone-600">
            Loading trip details...
          </p>
        </div>
      </div>
    );
  }

  // ================= ERROR =================

  if (errorMessage || !trip) {
    return (
      <div className="min-h-screen bg-stone-50 p-6">
        <div className="max-w-4xl mx-auto">

          <button
            onClick={() => navigate('/browse-trips')}
            className="flex items-center gap-2 text-stone-600 hover:text-emerald-700 mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Browse Trips
          </button>

          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
            <p className="text-red-600 font-medium mb-4">
              {errorMessage || 'Trip not found.'}
            </p>

            <button
              onClick={fetchTripDetails}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Try Again
            </button>
          </div>

        </div>
      </div>
    );
  }

  const normalizedDestination = normalizeDestination(
    trip.destination || ''
  );

  const plan = destinationPlans[normalizedDestination];

  const maxMembers =
    Number(trip.max_members) ||
    Number(trip.buddy_limit || 1) + 1;

  const currentMembers = members.length;

  return (
    <div className="min-h-screen bg-stone-50">

      {/* ================= HEADER ================= */}

      <div className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 py-5">

          <button
            onClick={() => navigate('/browse-trips')}
            className="flex items-center gap-2 text-stone-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Browse Trips
          </button>

        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* ================= TRIP HERO ================= */}

        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">

          <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-7 py-8 text-white">

            <div className="flex flex-wrap items-start justify-between gap-5">

              <div>
                <div className="flex items-center gap-2 text-emerald-100 mb-3">
                  <MapPin className="w-5 h-5" />
                  <span>Travel Plan</span>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold">
                  {trip.destination}
                </h1>

                {plan && (
                  <p className="mt-2 text-emerald-100">
                    {plan.route}
                  </p>
                )}
              </div>

              {plan && (
                <div className="bg-white/15 rounded-2xl px-5 py-4 backdrop-blur-sm">
                  <p className="text-sm text-emerald-100">
                    Estimated Budget
                  </p>
                  <p className="text-xl font-semibold">
                    {plan.budget}
                  </p>
                </div>
              )}

            </div>

          </div>

          {/* ================= BASIC DETAILS ================= */}

          <div className="p-7">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-50">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-emerald-700" />
                </div>

                <div>
                  <p className="text-xs text-stone-500">
                    Dates
                  </p>
                  <p className="font-semibold text-stone-800">
                    {formatDate(trip.start_date)}
                  </p>
                  <p className="text-sm text-stone-500">
                    to {formatDate(trip.end_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-50">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-700" />
                </div>

                <div>
                  <p className="text-xs text-stone-500">
                    Travelers
                  </p>
                  <p className="font-semibold text-stone-800">
                    {currentMembers} / {maxMembers}
                  </p>
                  <p className="text-sm text-stone-500">
                    members joined
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-50">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-emerald-700" />
                </div>

                <div>
                  <p className="text-xs text-stone-500">
                    Transport
                  </p>
                  <p className="font-semibold text-stone-800">
                    {plan?.transport || 'As planned'}
                  </p>
                </div>
              </div>

            </div>

            {/* ================= DESCRIPTION ================= */}

            {trip.description && (
              <div className="mt-7">
                <h2 className="text-lg font-bold text-stone-900 mb-2">
                  About this trip
                </h2>

                <p className="text-stone-600 leading-relaxed whitespace-pre-line">
                  {trip.description}
                </p>
              </div>
            )}

          </div>
        </div>

        {/* ================= CREATOR ================= */}

        <div className="mt-6 bg-white rounded-3xl border border-stone-200 p-6">

          <h2 className="text-lg font-bold text-stone-900 mb-4">
            Trip Creator
          </h2>

          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-4">

              {creator?.avatar_url || creator?.profile_photo_url ? (
                <img
                  src={
                    creator.avatar_url ||
                    creator.profile_photo_url
                  }
                  alt={creator?.full_name || 'Creator'}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="w-7 h-7 text-emerald-700" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-stone-900">
                    {creator?.full_name || 'Trip Creator'}
                  </p>

                  {creator?.is_verified && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>

                <p className="text-sm text-stone-500">
                  {creator?.email || ''}
                </p>
              </div>

            </div>

            {creator?.id && creator.id !== user?.id && (
              <button
                onClick={() =>
                  navigate(`/chat/${creator.id}`)
                }
                className="px-4 py-2.5 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition"
              >
                Chat
              </button>
            )}

          </div>

        </div>

        {/* ================= MEMBERS ================= */}

        <div className="mt-6 bg-white rounded-3xl border border-stone-200 p-6">

          <div className="flex items-center justify-between mb-5">

            <h2 className="text-lg font-bold text-stone-900">
              Trip Members
            </h2>

            <span className="text-sm text-stone-500">
              {currentMembers} / {maxMembers}
            </span>

          </div>

          {members.length === 0 ? (
            <p className="text-stone-500">
              No members have joined yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50"
                >

                  {member.avatar_url ||
                  member.profile_photo_url ? (
                    <img
                      src={
                        member.avatar_url ||
                        member.profile_photo_url
                      }
                      alt={member.full_name || 'Member'}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-700" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="font-medium text-stone-800 truncate">
                      {member.full_name || 'Traveler'}
                    </p>

                    <div className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Joined
                    </div>
                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

        {/* ================= ITINERARY ================= */}

        <div className="mt-6 bg-white rounded-3xl border border-stone-200 p-6 md:p-7">

          <div className="flex items-center justify-between gap-4 mb-6">

            <div>
              <h2 className="text-2xl font-bold text-stone-900">
                Full Itinerary
              </h2>

              <p className="text-stone-500 mt-1">
                Day-by-day travel plan
              </p>
            </div>

            {plan && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium">
                <Clock className="w-4 h-4" />
                {plan.duration}
              </div>
            )}

          </div>

          {plan?.itinerary?.length ? (
            <div className="space-y-5">

              {plan.itinerary.map((day, index) => (

                <div
                  key={day.day}
                  className="relative pl-12"
                >

                  {/* Timeline line */}

                  {index !== plan.itinerary.length - 1 && (
                    <div className="absolute left-[19px] top-10 bottom-[-20px] w-px bg-emerald-200" />
                  )}

                  {/* Day circle */}

                  <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {day.day}
                  </div>

                  <div className="border border-stone-200 rounded-2xl p-5 hover:border-emerald-200 transition">

                    <div className="flex flex-wrap items-start justify-between gap-3">

                      <div>
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                          Day {day.day}
                          {trip.start_date &&
                            ` • ${getDayDate(
                              trip.start_date,
                              day.day
                            )}`}
                        </p>

                        <h3 className="text-lg font-bold text-stone-900 mt-1">
                          {day.title}
                        </h3>

                        <p className="text-sm text-stone-500 mt-1">
                          {day.city}
                        </p>
                      </div>

                    </div>

                    {/* Activities */}

                    <div className="mt-4">

                      <p className="text-sm font-semibold text-stone-700 mb-2">
                        Activities
                      </p>

                      <ul className="space-y-2">

                        {day.activities.map(
                          (activity, activityIndex) => (
                            <li
                              key={activityIndex}
                              className="flex items-start gap-2 text-sm text-stone-600"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                              <span>{activity}</span>
                            </li>
                          )
                        )}

                      </ul>

                    </div>

                    {/* Transport + Hotel */}

                    <div className="mt-4 flex flex-wrap gap-3">

                      {day.transport && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 text-sm text-stone-600">
                          <Bus className="w-4 h-4 text-emerald-600" />
                          {day.transport}
                        </div>
                      )}

                      {day.hotel && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 text-sm text-stone-600">
                          <Hotel className="w-4 h-4 text-emerald-600" />
                          {day.hotel}
                        </div>
                      )}

                    </div>

                  </div>

                </div>

              ))}

            </div>
          ) : (
            <div className="rounded-2xl bg-stone-50 p-6 text-center">

              <MapPin className="w-8 h-8 mx-auto text-stone-400 mb-2" />

              <p className="font-medium text-stone-700">
                Detailed itinerary is not available
              </p>

              <p className="text-sm text-stone-500 mt-1">
                The trip creator has not added a detailed
                itinerary for this destination.
              </p>

            </div>
          )}

        </div>

        {/* ================= BOTTOM ACTIONS ================= */}

        <div className="mt-6 flex flex-wrap gap-3">

          {trip.user_id && trip.user_id !== user?.id && (
            <button
              onClick={() =>
                navigate(`/chat/${trip.user_id}`)
              }
              className="flex-1 min-w-[180px] px-5 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
            >
              Chat with Trip Creator
            </button>
          )}

          <button
            onClick={() => navigate('/browse-trips')}
            className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-white transition"
          >
            Back to Browse Trips
          </button>

        </div>

      </main>
    </div>
  );
}