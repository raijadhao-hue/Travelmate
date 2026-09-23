import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar,
  MapPin,
  Trash2,
  Users,
  Plane,
  Hotel,
  Wallet,
  Clock,
  ExternalLink,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

const destinationPlans: Record<string, DestinationPlan> = {
  'Rajasthan, India': {
    name: 'Rajasthan, India',
    route: 'Mumbai → Jaipur → Udaipur → Jaisalmer → Mumbai',
    budget: '₹30,000 – ₹40,000',
    duration: '7 Days / 6 Nights',
    transport: 'Train / Flight + Intercity Train/Bus',
    itinerary: [
      {
        day: 1,
        city: 'Mumbai → Jaipur',
        title: 'Arrival in Jaipur',
        activities: [
          'Travel from Mumbai to Jaipur by train or flight',
          'Hotel check-in',
          'Evening visit to local market and Bapu Bazaar',
        ],
        transport: 'Mumbai → Jaipur',
        hotel: 'Jaipur Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Jaipur%2C+India',
      },
      {
        day: 2,
        city: 'Jaipur',
        title: 'Explore the Pink City',
        activities: [
          'Visit Amber Fort',
          'Visit City Palace',
          'Explore Jantar Mantar',
          'Visit Hawa Mahal',
          'Evening at local markets',
        ],
        hotel: 'Jaipur Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Jaipur%2C+India',
      },
      {
        day: 3,
        city: 'Jaipur → Udaipur',
        title: 'Journey to the City of Lakes',
        activities: [
          'Travel from Jaipur to Udaipur',
          'Hotel check-in',
          'Evening visit to Lake Pichola',
          'Explore Udaipur old city',
        ],
        transport: 'Jaipur → Udaipur',
        hotel: 'Udaipur Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Udaipur%2C+India',
      },
      {
        day: 4,
        city: 'Udaipur',
        title: 'City of Lakes',
        activities: [
          'Visit City Palace',
          'Visit Jagdish Temple',
          'Explore Saheliyon-ki-Bari',
          'Boat ride at Lake Pichola',
        ],
        hotel: 'Udaipur Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Udaipur%2C+India',
      },
      {
        day: 5,
        city: 'Udaipur → Jaisalmer',
        title: 'Journey to the Golden City',
        activities: [
          'Travel towards Jaisalmer',
          'Hotel check-in',
          'Explore Jaisalmer local market',
          'Evening walk around Gadisar Lake',
        ],
        transport: 'Udaipur → Jaisalmer',
        hotel: 'Jaisalmer Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Jaisalmer%2C+India',
      },
      {
        day: 6,
        city: 'Jaisalmer',
        title: 'Golden Fort & Desert Experience',
        activities: [
          'Visit Jaisalmer Fort',
          'Visit Patwon Ki Haveli',
          'Visit Gadisar Lake',
          'Desert safari at Sam Sand Dunes',
          'Camel ride and cultural evening',
        ],
        hotel: 'Jaisalmer Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Jaisalmer%2C+India',
      },
      {
        day: 7,
        city: 'Jaisalmer → Mumbai',
        title: 'Return Journey',
        activities: [
          'Check out from hotel',
          'Travel back to Mumbai',
          'Trip completed',
        ],
        transport: 'Jaisalmer → Mumbai',
      },
    ],
  },

  'Goa, India': {
    name: 'Goa, India',
    route: 'Mumbai → North Goa → Panjim → South Goa → Mumbai',
    budget: '₹15,000 – ₹20,000',
    duration: '5 Days / 4 Nights',
    transport: 'Train / Flight + Local Transport',
    itinerary: [
      {
        day: 1,
        city: 'Mumbai → North Goa',
        title: 'Arrival in North Goa',
        activities: [
          'Travel from Mumbai to Goa',
          'Hotel check-in',
          'Visit Baga and Calangute Beach',
          'Evening beach walk',
        ],
        transport: 'Mumbai → Goa',
        hotel: 'North Goa Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=North+Goa%2C+India',
      },
      {
        day: 2,
        city: 'North Goa',
        title: 'Beaches & Forts',
        activities: [
          'Visit Fort Aguada',
          'Explore Candolim Beach',
          'Visit Anjuna Beach',
          'Explore Vagator Beach',
          'Evening at beach shacks',
        ],
        hotel: 'North Goa Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=North+Goa%2C+India',
      },
      {
        day: 3,
        city: 'Panjim',
        title: 'Goan Culture & Heritage',
        activities: [
          'Travel to Panjim',
          'Explore Fontainhas Latin Quarter',
          'Visit Basilica of Bom Jesus',
          'Visit Church of Our Lady of Immaculate Conception',
          'Explore Panjim market',
        ],
        transport: 'North Goa → Panjim',
        hotel: 'Panjim Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Panjim%2C+India',
      },
      {
        day: 4,
        city: 'South Goa',
        title: 'Peaceful Beaches',
        activities: [
          'Travel towards South Goa',
          'Visit Colva Beach',
          'Visit Benaulim Beach',
          'Relax at Palolem Beach',
          'Sunset by the beach',
        ],
        transport: 'Panjim → South Goa',
        hotel: 'South Goa Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=South+Goa%2C+India',
      },
      {
        day: 5,
        city: 'South Goa → Mumbai',
        title: 'Return Journey',
        activities: [
          'Breakfast and hotel checkout',
          'Free time for shopping',
          'Travel back to Mumbai',
        ],
        transport: 'Goa → Mumbai',
      },
    ],
  },

  'Kerala, India': {
    name: 'Kerala, India',
    route:
      'Mumbai → Kochi → Munnar → Alleppey → Thiruvananthapuram → Mumbai',
    budget: '₹25,000 – ₹35,000',
    duration: '6 Days / 5 Nights',
    transport: 'Flight / Train + Cab / Bus',
    itinerary: [
      {
        day: 1,
        city: 'Mumbai → Kochi',
        title: 'Arrival in Kochi',
        activities: [
          'Travel from Mumbai to Kochi',
          'Hotel check-in',
          'Visit Fort Kochi',
          'Explore Chinese Fishing Nets',
        ],
        transport: 'Mumbai → Kochi',
        hotel: 'Kochi Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Kochi%2C+India',
      },
      {
        day: 2,
        city: 'Kochi → Munnar',
        title: 'Journey to the Hills',
        activities: [
          'Travel to Munnar',
          'Check-in at hotel',
          'Visit tea gardens',
          'Enjoy Munnar viewpoints',
        ],
        transport: 'Kochi → Munnar',
        hotel: 'Munnar Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Munnar%2C+India',
      },
      {
        day: 3,
        city: 'Munnar',
        title: 'Tea Gardens & Nature',
        activities: [
          'Visit Eravikulam National Park',
          'Visit Mattupetty Dam',
          'Explore tea plantations',
          'Visit Echo Point',
        ],
        hotel: 'Munnar Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Munnar%2C+India',
      },
      {
        day: 4,
        city: 'Munnar → Alleppey',
        title: 'Backwater Experience',
        activities: [
          'Travel to Alleppey',
          'Houseboat check-in',
          'Enjoy Kerala backwaters',
          'Traditional Kerala dinner',
        ],
        transport: 'Munnar → Alleppey',
        hotel: 'Alleppey Houseboats & Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Alleppey%2C+India',
      },
      {
        day: 5,
        city: 'Alleppey → Thiruvananthapuram',
        title: 'Beach & City Exploration',
        activities: [
          'Travel to Thiruvananthapuram',
          'Visit Padmanabhaswamy Temple',
          'Visit Kovalam Beach',
          'Explore local markets',
        ],
        transport: 'Alleppey → Thiruvananthapuram',
        hotel: 'Thiruvananthapuram Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Thiruvananthapuram%2C+India',
      },
      {
        day: 6,
        city: 'Thiruvananthapuram → Mumbai',
        title: 'Return Journey',
        activities: [
          'Breakfast and checkout',
          'Travel back to Mumbai',
          'Trip completed',
        ],
        transport: 'Thiruvananthapuram → Mumbai',
      },
    ],
  },

  'Himachal, India': {
    name: 'Himachal, India',
    route:
      'Mumbai → Delhi → Shimla → Manali → Kasol → Delhi → Mumbai',
    budget: '₹30,000 – ₹40,000',
    duration: '7 Days / 6 Nights',
    transport: 'Train / Flight + Volvo Bus / Cab',
    itinerary: [
      {
        day: 1,
        city: 'Mumbai → Delhi → Shimla',
        title: 'Journey to Shimla',
        activities: [
          'Travel from Mumbai to Delhi',
          'Continue towards Shimla',
          'Hotel check-in and rest',
        ],
        transport: 'Mumbai → Delhi → Shimla',
        hotel: 'Shimla Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Shimla%2C+India',
      },
      {
        day: 2,
        city: 'Shimla',
        title: 'Explore Shimla',
        activities: [
          'Visit Mall Road',
          'Visit Ridge',
          'Visit Christ Church',
          'Explore Lakkar Bazaar',
          'Visit Jakhoo Temple',
        ],
        hotel: 'Shimla Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Shimla%2C+India',
      },
      {
        day: 3,
        city: 'Shimla → Manali',
        title: 'Journey to Manali',
        activities: [
          'Travel to Manali',
          'Hotel check-in',
          'Explore Mall Road',
          'Evening leisure',
        ],
        transport: 'Shimla → Manali',
        hotel: 'Manali Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Manali%2C+India',
      },
      {
        day: 4,
        city: 'Manali',
        title: 'Mountain Adventure',
        activities: [
          'Visit Solang Valley',
          'Visit Hadimba Temple',
          'Explore Old Manali',
          'Visit Manu Temple',
        ],
        hotel: 'Manali Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Manali%2C+India',
      },
      {
        day: 5,
        city: 'Manali → Kasol',
        title: 'Kasol Valley',
        activities: [
          'Travel towards Kasol',
          'Explore Kasol village',
          'Walk along Parvati River',
          'Visit nearby cafes',
        ],
        transport: 'Manali → Kasol',
        hotel: 'Kasol Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Kasol%2C+India',
      },
      {
        day: 6,
        city: 'Kasol → Delhi',
        title: 'Return towards Delhi',
        activities: [
          'Morning leisure in Kasol',
          'Travel towards Delhi',
          'Overnight journey',
        ],
        transport: 'Kasol → Delhi',
      },
      {
        day: 7,
        city: 'Delhi → Mumbai',
        title: 'Return to Mumbai',
        activities: [
          'Travel from Delhi to Mumbai',
          'Trip completed',
        ],
        transport: 'Delhi → Mumbai',
      },
    ],
  },

  Thailand: {
    name: 'Thailand',
    route: 'Mumbai → Bangkok → Pattaya → Phuket → Mumbai',
    budget: '₹70,000 – ₹75,000',
    duration: '7 Days / 6 Nights',
    transport: 'International Flight + Domestic Flight / Bus',
    itinerary: [
      {
        day: 1,
        city: 'Mumbai → Bangkok',
        title: 'Arrival in Bangkok',
        activities: [
          'International flight from Mumbai to Bangkok',
          'Airport transfer and hotel check-in',
          'Evening explore Bangkok',
        ],
        transport: 'Mumbai → Bangkok',
        hotel: 'Bangkok Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Bangkok%2C+Thailand',
      },
      {
        day: 2,
        city: 'Bangkok',
        title: 'Bangkok City Tour',
        activities: [
          'Visit Grand Palace',
          'Visit Wat Pho',
          'Visit Wat Arun',
          'Explore local markets',
          'Evening Bangkok street food',
        ],
        hotel: 'Bangkok Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Bangkok%2C+Thailand',
      },
      {
        day: 3,
        city: 'Bangkok → Pattaya',
        title: 'Beach & Nightlife',
        activities: [
          'Travel to Pattaya',
          'Hotel check-in',
          'Visit Pattaya Beach',
          'Explore Walking Street',
        ],
        transport: 'Bangkok → Pattaya',
        hotel: 'Pattaya Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Pattaya%2C+Thailand',
      },
      {
        day: 4,
        city: 'Pattaya',
        title: 'Island Experience',
        activities: [
          'Visit Coral Island',
          'Enjoy beach activities',
          'Water sports',
          'Evening leisure',
        ],
        hotel: 'Pattaya Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Pattaya%2C+Thailand',
      },
      {
        day: 5,
        city: 'Pattaya → Phuket',
        title: 'Fly to Phuket',
        activities: [
          'Travel towards Phuket',
          'Hotel check-in',
          'Explore Patong Beach',
          'Enjoy sunset',
        ],
        transport: 'Pattaya → Phuket',
        hotel: 'Phuket Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Phuket%2C+Thailand',
      },
      {
        day: 6,
        city: 'Phuket',
        title: 'Phuket Island Tour',
        activities: [
          'Explore Phi Phi Islands',
          'Beach activities',
          'Explore local markets',
          'Evening leisure',
        ],
        hotel: 'Phuket Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Phuket%2C+Thailand',
      },
      {
        day: 7,
        city: 'Phuket → Mumbai',
        title: 'Return Journey',
        activities: [
          'Hotel checkout',
          'Travel to Phuket Airport',
          'International flight to Mumbai',
          'Trip completed',
        ],
        transport: 'Phuket → Mumbai',
      },
    ],
  },

  Vietnam: {
    name: 'Vietnam',
    route:
      'Mumbai → Ho Chi Minh City → Da Nang → Hanoi → Mumbai',
    budget: '₹60,000 – ₹70,000',
    duration: '7 Days / 6 Nights',
    transport: 'International Flight + Domestic Flights',
    itinerary: [
      {
        day: 1,
        city: 'Mumbai → Ho Chi Minh City',
        title: 'Arrival in Vietnam',
        activities: [
          'International flight from Mumbai',
          'Hotel check-in',
          'Explore Ho Chi Minh City',
          'Evening local food experience',
        ],
        transport: 'Mumbai → Ho Chi Minh City',
        hotel: 'Ho Chi Minh City Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Ho+Chi+Minh+City%2C+Vietnam',
      },
      {
        day: 2,
        city: 'Ho Chi Minh City',
        title: 'City & Culture Tour',
        activities: [
          'Visit War Remnants Museum',
          'Visit Independence Palace',
          'Visit Notre-Dame Cathedral area',
          'Explore Ben Thanh Market',
        ],
        hotel: 'Ho Chi Minh City Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Ho+Chi+Minh+City%2C+Vietnam',
      },
      {
        day: 3,
        city: 'Ho Chi Minh City → Da Nang',
        title: 'Fly to Da Nang',
        activities: [
          'Domestic flight to Da Nang',
          'Hotel check-in',
          'Visit My Khe Beach',
          'Explore Da Nang city',
        ],
        transport: 'Ho Chi Minh City → Da Nang',
        hotel: 'Da Nang Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Da+Nang%2C+Vietnam',
      },
      {
        day: 4,
        city: 'Da Nang',
        title: 'Ba Na Hills & Golden Bridge',
        activities: [
          'Visit Ba Na Hills',
          'Walk across Golden Bridge',
          'Explore French Village',
          'Evening at Da Nang beach',
        ],
        hotel: 'Da Nang Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Da+Nang%2C+Vietnam',
      },
      {
        day: 5,
        city: 'Da Nang → Hanoi',
        title: 'Discover Hanoi',
        activities: [
          'Domestic flight to Hanoi',
          'Hotel check-in',
          'Explore Old Quarter',
          'Visit Hoan Kiem Lake',
        ],
        transport: 'Da Nang → Hanoi',
        hotel: 'Hanoi Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Hanoi%2C+Vietnam',
      },
      {
        day: 6,
        city: 'Hanoi',
        title: 'Hanoi Culture & Food',
        activities: [
          'Visit Temple of Literature',
          'Explore Old Quarter',
          'Visit Ho Chi Minh Mausoleum area',
          'Enjoy Vietnamese local food',
        ],
        hotel: 'Hanoi Hotels',
        hotelUrl:
          'https://www.booking.com/searchresults.html?ss=Hanoi%2C+Vietnam',
      },
      {
        day: 7,
        city: 'Hanoi → Mumbai',
        title: 'Return Journey',
        activities: [
          'Breakfast and hotel checkout',
          'Transfer to airport',
          'International flight to Mumbai',
          'Trip completed',
        ],
        transport: 'Hanoi → Mumbai',
      },
    ],
  },
};

export default function Plans() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const prefilledDestination =
    searchParams.get('destination') || '';

  const plan =
    destinationPlans[prefilledDestination];

  const [trips, setTrips] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [requestLoading, setRequestLoading] =
    useState<string | null>(null);

  const [isAdding, setIsAdding] =
    useState(!!prefilledDestination);

  const [message, setMessage] = useState('');

  const [deleteId, setDeleteId] =
    useState<string | null>(null);

  const [newTrip, setNewTrip] = useState({
    destination: prefilledDestination,
    start_date: '',
    end_date: '',
    description: '',
    buddy_limit: '1',
  });

  useEffect(() => {
    if (prefilledDestination) {
      setNewTrip({
        destination: prefilledDestination,
        start_date: '',
        end_date: '',
        description: '',
        buddy_limit: '1',
      });

      setIsAdding(true);
    }
  }, [prefilledDestination]);

  /*
   * FETCH MY TRIPS + PENDING JOIN REQUESTS
   */
  const fetchTrips = async () => {
    if (!user) {
      setTrips([]);
      setJoinRequests([]);
      return;
    }

    try {
      const {
        data,
        error,
      } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', {
          ascending: true,
        });

      if (error) throw error;

      setTrips(data || []);

      if (!data || data.length === 0) {
        setJoinRequests([]);
        return;
      }

      const tripIds = data.map(
        (trip) => trip.id
      );

      const {
        data: requests,
        error: requestError,
      } = await supabase
        .from('trip_members')
        .select(
          'id, trip_id, user_id, status, created_at'
        )
        .in('trip_id', tripIds)
        .eq('status', 'pending')
        .order('created_at', {
          ascending: false,
        });

      if (requestError) throw requestError;

      if (!requests || requests.length === 0) {
        setJoinRequests([]);
        return;
      }

      const userIds = [
        ...new Set(
          requests.map(
            (request) => request.user_id
          )
        ),
      ];

      const {
        data: profiles,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          'id, full_name, avatar_url, profile_photo_url'
        )
        .in('id', userIds);

      if (profileError) throw profileError;

      const profileMap: Record<string, any> = {};

      (profiles || []).forEach(
        (profile) => {
          profileMap[profile.id] = profile;
        }
      );

      setJoinRequests(
        requests.map((request) => ({
          ...request,
          trip: data.find(
            (trip) =>
              trip.id === request.trip_id
          ),
          profile:
            profileMap[request.user_id] ||
            null,
        }))
      );
    } catch (error) {
      console.error(
        'Failed to fetch trips:',
        error
      );
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [user]);

  /*
   * ADD / PUBLISH TRIP
   */
  const handleAddTrip = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!user) {
      setMessage('Please login first.');
      return;
    }

    setMessage('');

    if (!newTrip.destination.trim()) {
      setMessage(
        'Please enter a destination.'
      );
      return;
    }

    if (
      !newTrip.start_date ||
      !newTrip.end_date
    ) {
      setMessage(
        'Please select travel dates.'
      );
      return;
    }

    if (
      new Date(newTrip.end_date) <
      new Date(newTrip.start_date)
    ) {
      setMessage(
        'End date cannot be before start date.'
      );
      return;
    }

    const buddyLimit =
      Number(newTrip.buddy_limit);

    if (
      !buddyLimit ||
      buddyLimit < 1 ||
      buddyLimit > 4
    ) {
      setMessage(
        'Please select between 1 and 4 travel buddies.'
      );
      return;
    }

    /*
     * IMPORTANT:
     * buddy_limit = number of buddies
     * max_members = total people including owner
     *
     * 1 buddy  -> 2 total
     * 2 buddies -> 3 total
     * 3 buddies -> 4 total
     * 4 buddies -> 5 total
     */
    const maxMembers =
      buddyLimit + 1;

    try {
      /*
       * STEP 1:
       * CREATE TRIP
       */
      const {
        data: createdTrip,
        error: tripError,
      } = await supabase
        .from('trips')
        .insert([
          {
            user_id: user.id,

            destination:
              newTrip.destination.trim(),

            start_date:
              newTrip.start_date,

            end_date:
              newTrip.end_date,

            description:
              newTrip.description.trim(),

            buddy_limit:
              buddyLimit,

            max_members:
              maxMembers,
          },
        ])
        .select()
        .single();

      if (tripError) {
        throw tripError;
      }

      if (!createdTrip) {
        throw new Error(
          'Trip was created but could not be loaded.'
        );
      }

      /*
       * STEP 2:
       * ADD OWNER AS ACCEPTED MEMBER
       *
       * This makes BrowseTrips show:
       * 1 / 2
       * 1 / 3
       * 1 / 4
       * 1 / 5
       */
      const {
        error: memberError,
      } = await supabase
        .from('trip_members')
        .upsert(
          {
            trip_id:
              createdTrip.id,

            user_id:
              user.id,

            status:
              'accepted',
          },
          {
            onConflict:
              'trip_id,user_id',

            ignoreDuplicates:
              true,
          }
        );

      if (memberError) {
        console.error(
          'Failed to add trip owner as member:',
          memberError
        );

        /*
         * Trip itself is already created.
         * So don't delete it or report
         * complete publishing failure.
         */
        setMessage(
          'Trip published, but capacity setup needs attention.'
        );
      } else {
        setMessage(
          'Trip published successfully!'
        );
      }

      /*
       * STEP 3:
       * RESET FORM
       */
      setNewTrip({
        destination: '',
        start_date: '',
        end_date: '',
        description: '',
        buddy_limit: '1',
      });

      /*
       * STEP 4:
       * CLOSE FORM
       */
      setIsAdding(false);

      /*
       * STEP 5:
       * REFRESH MY TRIPS
       */
      await fetchTrips();

      setTimeout(
        () => setMessage(''),
        3000
      );
    } catch (error: any) {
      console.error(
        'Failed to add trip:',
        error
      );

      setMessage(
        error?.message ||
          'Failed to publish trip'
      );
    }
  };

  /*
   * ACCEPT JOIN REQUEST
   */
  const handleAcceptRequest = async (
    request: any
  ) => {
    if (!user) return;

    setRequestLoading(request.id);

    try {
      /*
       * Get latest trip capacity
       */
      const {
        data: latestTrip,
        error: tripError,
      } = await supabase
        .from('trips')
        .select(
          'id, max_members, buddy_limit, destination, user_id'
        )
        .eq('id', request.trip_id)
        .single();

      if (tripError) throw tripError;

      if (
        latestTrip.user_id !== user.id
      ) {
        throw new Error(
          'You are not the owner of this trip.'
        );
      }

      /*
       * Count accepted members
       */
      const {
        count,
        error: countError,
      } = await supabase
        .from('trip_members')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq(
          'trip_id',
          request.trip_id
        )
        .eq(
          'status',
          'accepted'
        );

      if (countError) {
        throw countError;
      }

      const buddyLimit =
        Number(
          latestTrip.buddy_limit
        ) || 1;

      const maxMembers =
        Number(
          latestTrip.max_members
        ) || buddyLimit + 1;

      const currentMembers =
        count || 0;

      /*
       * Don't allow accepting if full
       */
      if (
        currentMembers >=
        maxMembers
      ) {
        setMessage(
          'This trip is already full. Cannot accept another request.'
        );

        await fetchTrips();
        return;
      }

      /*
       * Accept request
       */
      const {
        error: updateError,
      } = await supabase
        .from('trip_members')
        .update({
          status:
            'accepted',
        })
        .eq(
          'id',
          request.id
        )
        .eq(
          'trip_id',
          request.trip_id
        )
        .eq(
          'status',
          'pending'
        );

      if (updateError) {
        throw updateError;
      }

      setMessage(
        `${request.profile?.full_name || 'Traveler'} has been accepted!`
      );

      await fetchTrips();

      setTimeout(
        () => setMessage(''),
        3000
      );
    } catch (error: any) {
      console.error(
        'Failed to accept request:',
        error
      );

      setMessage(
        error?.message ||
          'Could not accept request.'
      );
    } finally {
      setRequestLoading(null);
    }
  };

  /*
   * REJECT JOIN REQUEST
   */
  const handleRejectRequest = async (
    request: any
  ) => {
    if (!user) return;

    setRequestLoading(request.id);

    try {
      const {
        error,
      } = await supabase
        .from('trip_members')
        .update({
          status:
            'rejected',
        })
        .eq(
          'id',
          request.id
        )
        .eq(
          'trip_id',
          request.trip_id
        )
        .eq(
          'status',
          'pending'
        );

      if (error) {
        throw error;
      }

      setMessage(
        'Join request rejected.'
      );

      await fetchTrips();

      setTimeout(
        () => setMessage(''),
        3000
      );
    } catch (error: any) {
      console.error(
        'Failed to reject request:',
        error
      );

      setMessage(
        error?.message ||
          'Could not reject request.'
      );
    } finally {
      setRequestLoading(null);
    }
  };

  /*
   * DELETE TRIP
   */
  const handleDelete = async (
    id: string
  ) => {
    try {
      const {
        error,
      } = await supabase
        .from('trips')
        .delete()
        .eq(
          'id',
          id
        );

      if (error) {
        throw error;
      }

      setMessage(
        'Trip deleted successfully'
      );

      setDeleteId(null);

      await fetchTrips();

      setTimeout(
        () => setMessage(''),
        3000
      );
    } catch (error: any) {
      console.error(
        error
      );

      setMessage(
        error?.message ||
          'Could not delete trip'
      );

      setDeleteId(null);
    }
  };

  /*
   * GET ITINERARY DAY DATE
   */
  const getDayDate = (
    dayNumber: number
  ) => {
    if (!newTrip.start_date) {
      return '';
    }

    const date = new Date(
      newTrip.start_date
    );

    date.setDate(
      date.getDate() +
        dayNumber -
        1
    );

    return date.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  return (
    <div className="space-y-6">

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">

            <h3 className="text-xl font-bold mb-2">
              Delete Trip?
            </h3>

            <p className="text-stone-600 mb-6">
              Are you sure you want to remove this trip?
            </p>

            <div className="flex gap-3">

              <button
                onClick={() =>
                  setDeleteId(null)
                }
                className="flex-1 px-4 py-2 bg-stone-100 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  handleDelete(deleteId)
                }
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Delete
              </button>

            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center">

        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Your Travel Plans
          </h1>

          <p className="text-stone-500 mt-1">
            Create your trip and find travel buddies.
          </p>
        </div>

        <button
          onClick={() =>
            setIsAdding(!isAdding)
          }
          className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700"
        >
          {isAdding
            ? 'Cancel'
            : 'Add New Trip'}
        </button>

      </div>

      {/* MESSAGE */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg ${
            message.includes(
              'successfully'
            ) ||
            message.includes(
              'accepted'
            )
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      {/* JOIN REQUESTS */}
      {joinRequests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">

          <div className="p-6 border-b border-stone-200">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  Join Requests
                </h2>

                <p className="text-sm text-stone-500">
                  Travelers who want to join your trips.
                </p>
              </div>

              <span className="ml-auto px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                {joinRequests.length}
              </span>

            </div>
          </div>

          <div className="divide-y divide-stone-200">

            {joinRequests.map(
              (request) => {

                const requesterName =
                  request.profile?.full_name ||
                  'Traveler';

                const requesterPhoto =
                  request.profile?.avatar_url ||
                  request.profile
                    ?.profile_photo_url;

                const trip =
                  request.trip;

                return (
                  <div
                    key={request.id}
                    className="p-5"
                  >

                    <div className="flex flex-col md:flex-row md:items-center gap-4">

                      {/* REQUESTER */}
                      <div className="flex items-center gap-3 flex-1">

                        {requesterPhoto ? (
                          <img
                            src={
                              requesterPhoto
                            }
                            alt={
                              requesterName
                            }
                            className="w-12 h-12 rounded-full object-cover border border-stone-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-emerald-600" />
                          </div>
                        )}

                        <div>

                          <p className="font-semibold text-stone-900">
                            {requesterName}
                          </p>

                          <p className="text-sm text-stone-500">
                            wants to join your trip
                          </p>

                          {trip && (
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-stone-500">

                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {
                                  trip.destination
                                }
                              </span>

                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(
                                  trip.start_date
                                ).toLocaleDateString(
                                  'en-IN'
                                )}
                              </span>

                            </div>
                          )}

                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex gap-2">

                        <button
                          onClick={() =>
                            handleRejectRequest(
                              request
                            )
                          }
                          disabled={
                            requestLoading ===
                            request.id
                          }
                          className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 disabled:opacity-50 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>

                        <button
                          onClick={() =>
                            handleAcceptRequest(
                              request
                            )
                          }
                          disabled={
                            requestLoading ===
                            request.id
                          }
                          className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />

                          {requestLoading ===
                          request.id
                            ? 'Processing...'
                            : 'Accept'}
                        </button>

                      </div>

                    </div>
                  </div>
                );
              }
            )}

          </div>
        </div>
      )}

      {/* RECOMMENDED DESTINATION PLAN */}
      {plan && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">

          <div className="bg-emerald-600 text-white p-6">

            <div className="flex items-center gap-2 text-emerald-100 text-sm mb-2">
              <MapPin className="w-4 h-4" />
              Recommended Travel Plan
            </div>

            <h2 className="text-3xl font-bold">
              {plan.name}
            </h2>

            <div className="flex flex-wrap gap-4 mt-4 text-sm">

              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                {plan.route}
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {plan.duration}
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-stone-50">

            <div className="bg-white rounded-xl p-5 border border-stone-200">

              <div className="flex items-center gap-2 text-stone-500 mb-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                Approx. Budget / Person
              </div>

              <p className="text-2xl font-bold text-emerald-600">
                {plan.budget}
              </p>

              <p className="text-xs text-stone-500 mt-2">
                Approximate recommendation including transport,
                accommodation, food and sightseeing.
              </p>

            </div>

            <div className="bg-white rounded-xl p-5 border border-stone-200">

              <div className="flex items-center gap-2 text-stone-500 mb-2">
                <Plane className="w-5 h-5 text-emerald-600" />
                Recommended Transport
              </div>

              <p className="font-semibold text-stone-900">
                {plan.transport}
              </p>

            </div>

          </div>

          <div className="p-6">

            <h3 className="text-2xl font-bold text-stone-900 mb-6">
              Day-wise Itinerary
            </h3>

            <div className="space-y-5">

              {plan.itinerary.map(
                (item) => (

                  <div
                    key={item.day}
                    className="border border-stone-200 rounded-2xl p-5 hover:shadow-md transition"
                  >

                    <div className="flex flex-col md:flex-row md:justify-between gap-4">

                      <div className="flex gap-4">

                        <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          {item.day}
                        </div>

                        <div>

                          <p className="text-sm font-medium text-emerald-600">
                            DAY {item.day}

                            {getDayDate(
                              item.day
                            ) &&
                              ` • ${getDayDate(
                                item.day
                              )}`}
                          </p>

                          <h4 className="text-xl font-bold text-stone-900">
                            {item.title}
                          </h4>

                          <p className="text-stone-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-4 h-4" />
                            {item.city}
                          </p>

                        </div>
                      </div>

                      {item.transport && (
                        <div className="text-sm bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg h-fit">
                          🚆 {item.transport}
                        </div>
                      )}

                    </div>

                    <div className="mt-4 ml-16">

                      <ul className="space-y-2">

                        {item.activities.map(
                          (
                            activity,
                            index
                          ) => (

                            <li
                              key={index}
                              className="text-stone-600 flex gap-2"
                            >
                              <span className="text-emerald-600">
                                •
                              </span>

                              {activity}
                            </li>

                          )
                        )}

                      </ul>

                      {item.hotel && (
                        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 rounded-xl p-4">

                          <div className="flex items-center gap-3">

                            <Hotel className="w-5 h-5 text-emerald-600" />

                            <div>

                              <p className="text-sm text-stone-500">
                                Suggested Stay
                              </p>

                              <p className="font-semibold text-stone-900">
                                {item.hotel}
                              </p>

                            </div>

                          </div>

                          {item.hotelUrl && (
                            <a
                              href={
                                item.hotelUrl
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                              Book Hotel
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}

                        </div>
                      )}

                    </div>

                  </div>
                )
              )}

            </div>
          </div>

        </div>
      )}

      {/* CREATE TRIP */}
      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">

          <h2 className="text-xl font-bold mb-2">
            Create Your Trip
          </h2>

          <p className="text-stone-500 mb-6">
            Publish your future trip and choose how many
            travel buddies you want to travel with.
          </p>

          <form
            onSubmit={handleAddTrip}
            className="space-y-5"
          >

            {/* DESTINATION */}
            <div>

              <label className="block text-sm font-medium mb-1">
                Destination
              </label>

              <input
                required
                type="text"
                value={
                  newTrip.destination
                }
                onChange={(e) =>
                  setNewTrip({
                    ...newTrip,
                    destination:
                      e.target.value,
                  })
                }
                className="w-full rounded-md border border-stone-300 px-3 py-2.5"
                readOnly={!!plan}
              />

            </div>

            {/* DATES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium mb-1">
                  Start Date
                </label>

                <input
                  required
                  type="date"
                  value={
                    newTrip.start_date
                  }
                  min={
                    new Date()
                      .toISOString()
                      .split('T')[0]
                  }
                  onChange={(e) =>
                    setNewTrip({
                      ...newTrip,
                      start_date:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-md border border-stone-300 px-3 py-2.5"
                />

              </div>

              <div>

                <label className="block text-sm font-medium mb-1">
                  End Date
                </label>

                <input
                  required
                  type="date"
                  value={
                    newTrip.end_date
                  }
                  min={
                    newTrip.start_date ||
                    new Date()
                      .toISOString()
                      .split('T')[0]
                  }
                  onChange={(e) =>
                    setNewTrip({
                      ...newTrip,
                      end_date:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-md border border-stone-300 px-3 py-2.5"
                />

              </div>

            </div>

            {/* BUDDY LIMIT */}
            <div>

              <label className="block text-sm font-medium mb-2">
                How many travel buddies are you looking for?
              </label>

              <p className="text-sm text-stone-500 mb-3">
                Select how many people you want to join
                you on this trip.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                {[1, 2, 3, 4].map(
                  (count) => {

                    const selected =
                      newTrip.buddy_limit ===
                      String(count);

                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() =>
                          setNewTrip({
                            ...newTrip,
                            buddy_limit:
                              String(
                                count
                              ),
                          })
                        }
                        className={`py-3 rounded-xl border font-semibold transition ${
                          selected
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-stone-700 border-stone-300 hover:border-emerald-400 hover:bg-emerald-50'
                        }`}
                      >

                        <Users className="w-5 h-5 mx-auto mb-1" />

                        <span className="text-lg">
                          {count}
                        </span>

                        <span className="block text-xs font-normal mt-1">
                          {count === 1
                            ? 'Buddy'
                            : 'Buddies'}
                        </span>

                      </button>
                    );
                  }
                )}

              </div>

              {/* CAPACITY PREVIEW */}
              <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4">

                <div className="flex items-center gap-2 text-emerald-700 font-semibold">

                  <Users className="w-5 h-5" />

                  Trip Capacity

                </div>

                <p className="text-sm text-emerald-700 mt-1">

                  You +{' '}
                  {newTrip.buddy_limit}{' '}

                  {Number(
                    newTrip.buddy_limit
                  ) === 1
                    ? 'buddy'
                    : 'buddies'}

                  {' '}= maximum{' '}

                  {Number(
                    newTrip.buddy_limit
                  ) + 1}{' '}

                  people

                </p>

              </div>

            </div>

            {/* DESCRIPTION */}
            <div>

              <label className="block text-sm font-medium mb-1">
                Your Trip Description
              </label>

              <textarea
                required
                rows={4}
                value={
                  newTrip.description
                }
                onChange={(e) =>
                  setNewTrip({
                    ...newTrip,
                    description:
                      e.target.value,
                  })
                }
                className="w-full rounded-md border border-stone-300 px-3 py-2.5"
                placeholder="Tell potential travel buddies about your trip..."
              />

            </div>

            {/* PUBLISH */}
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
            >
              Publish Trip
            </button>

          </form>

        </div>
      )}

      {/* MY PUBLISHED TRIPS */}
      <div>

        <h2 className="text-xl font-bold text-stone-900 mb-4">
          My Published Trips
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {trips.map(
            (trip) => {

              const buddyLimit =
                Number(
                  trip.buddy_limit
                ) || 1;

              const maxMembers =
                Number(
                  trip.max_members
                ) ||
                buddyLimit + 1;

              return (
                <div
                  key={trip.id}
                  className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden"
                >

                  <div className="p-5">

                    <div className="flex justify-between items-start mb-3">

                      <h3 className="text-lg font-bold flex items-center gap-2">

                        <MapPin className="w-5 h-5 text-emerald-500" />

                        {trip.destination}

                      </h3>

                      <button
                        onClick={() =>
                          setDeleteId(
                            trip.id
                          )
                        }
                        className="text-stone-400 hover:text-red-500"
                        title="Delete trip"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                    </div>

                    {/* DATE */}
                    <div className="flex items-center gap-2 text-sm text-stone-600 mb-3">

                      <Calendar className="w-4 h-4" />

                      {new Date(
                        trip.start_date
                      ).toLocaleDateString(
                        'en-IN'
                      )}

                      {' - '}

                      {new Date(
                        trip.end_date
                      ).toLocaleDateString(
                        'en-IN'
                      )}

                    </div>

                    {/* CAPACITY */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-3">

                      <div className="flex items-center gap-2 text-emerald-700 font-medium">

                        <Users className="w-4 h-4" />

                        Capacity: 1 / {maxMembers}

                      </div>

                      <p className="text-xs text-stone-500 mt-1">

                        Looking for {buddyLimit}{' '}

                        {buddyLimit === 1
                          ? 'buddy'
                          : 'buddies'}

                      </p>

                    </div>

                    {/* DESCRIPTION */}
                    {trip.description && (
                      <p className="text-sm text-stone-600 line-clamp-3">
                        {trip.description}
                      </p>
                    )}

                  </div>

                  <div className="bg-stone-50 px-5 py-3 border-t border-stone-200">

                    <Link
                      to="/buddies"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-stone-300 text-stone-700 font-medium rounded-md hover:bg-stone-50"
                    >

                      <Users className="w-4 h-4" />

                      Find Buddies

                    </Link>

                  </div>

                </div>
              );
            }
          )}

        </div>

        {/* EMPTY STATE */}
        {trips.length === 0 &&
          !isAdding && (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-stone-300">

              <p className="text-stone-500">
                You don't have any trips planned yet.
              </p>

            </div>
          )}

      </div>

    </div>
  );
}