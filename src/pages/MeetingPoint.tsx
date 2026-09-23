
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  MapPin,
  Navigation,
  Train,
  Coffee,
  Hotel,
  Bus,
  Store,
  MapPinned,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

type Place = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  distance: number;
};

const categories = [
  {
    id: 'railway',
    name: 'Railway Station',
    icon: Train,
    query: `
      node["railway"="station"](around:RADIUS,LAT,LON);
      way["railway"="station"](around:RADIUS,LAT,LON);
    `,
  },
  {
    id: 'bus',
    name: 'Bus Stop',
    icon: Bus,
    query: `
      node["highway"="bus_stop"](around:RADIUS,LAT,LON);
    `,
  },
  {
    id: 'cafe',
    name: 'Cafe',
    icon: Coffee,
    query: `
      node["amenity"="cafe"](around:RADIUS,LAT,LON);
      way["amenity"="cafe"](around:RADIUS,LAT,LON);
    `,
  },
  {
    id: 'hotel',
    name: 'Hotel',
    icon: Hotel,
    query: `
      node["tourism"="hotel"](around:RADIUS,LAT,LON);
      way["tourism"="hotel"](around:RADIUS,LAT,LON);
    `,
  },
  {
    id: 'mall',
    name: 'Mall',
    icon: Store,
    query: `
      node["shop"="mall"](around:RADIUS,LAT,LON);
      way["shop"="mall"](around:RADIUS,LAT,LON);
    `,
  },
  {
    id: 'public',
    name: 'Public Place',
    icon: MapPinned,
    query: `
      node["amenity"="community_centre"](around:RADIUS,LAT,LON);
      way["amenity"="community_centre"](around:RADIUS,LAT,LON);
    `,
  },
];

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default function MeetingPoint() {
  const { tripId } = useParams();
  const { user } = useAuth();

  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null
  );

  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [saving, setSaving] = useState(false);

  const [savedMeetingPoint, setSavedMeetingPoint] = useState<any>(null);

  // GET CURRENT LOCATION
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });

        setLoadingLocation(false);
      },
      (error) => {
        console.error(error);
        setLoadingLocation(false);

        alert(
          'Location access is required to find nearby meeting points.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  // LOAD SAVED MEETING POINT
  useEffect(() => {
    if (!tripId || !user) return;

    const fetchSavedMeetingPoint = async () => {
      const { data, error } = await supabase
        .from('trip_meeting_points')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Saved meeting point error:', error);
        return;
      }

      if (data) {
        setSavedMeetingPoint(data);
      }
    };

    fetchSavedMeetingPoint();
  }, [tripId, user]);

  // SEARCH NEARBY PLACES
  const searchPlaces = async (categoryId: string) => {
    if (!location) {
      alert('Your location is not available yet.');
      return;
    }

    const category = categories.find(
      (item) => item.id === categoryId
    );

    if (!category) return;

    setSelectedCategory(categoryId);
    setSelectedPlace(null);
    setLoadingPlaces(true);
    setPlaces([]);

    const radius = 5000;

    const query = `
      [out:json][timeout:25];
      (
        ${category.query
          .replaceAll('RADIUS', radius.toString())
          .replaceAll('LAT', location.lat.toString())
          .replaceAll('LON', location.lon.toString())}
      );
      out center tags;
    `;

    try {
      const response = await fetch(
        'https://overpass-api.de/api/interpreter',
        {
          method: 'POST',
          body: query,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch nearby places');
      }

      const data = await response.json();

      const formattedPlaces: Place[] = data.elements
        .map((element: any) => {
          const lat =
            element.lat ??
            element.center?.lat;

          const lon =
            element.lon ??
            element.center?.lon;

          if (!lat || !lon) return null;

          const tags = element.tags || {};

          const name =
            tags.name ||
            tags['name:en'] ||
            category.name;

          const address = [
            tags['addr:housenumber'],
            tags['addr:street'],
            tags['addr:suburb'],
            tags['addr:city'],
          ]
            .filter(Boolean)
            .join(', ');

          return {
            id: `${element.type}-${element.id}`,
            name,
            address: address || 'Address not available',
            lat,
            lon,
            distance: calculateDistance(
              location.lat,
              location.lon,
              lat,
              lon
            ),
          };
        })
        .filter(Boolean)
        .sort(
          (a: Place, b: Place) =>
            a.distance - b.distance
        )
        .slice(0, 20);

      setPlaces(formattedPlaces);
    } catch (error) {
      console.error(error);
      alert(
        'Unable to find nearby places right now. Please try again.'
      );
    } finally {
      setLoadingPlaces(false);
    }
  };

  // SAVE MEETING POINT
  const saveMeetingPoint = async () => {
    if (!selectedPlace || !tripId || !user) {
      alert('Please select a meeting point first.');
      return;
    }

    setSaving(true);

    try {
      // Remove previous meeting point for this trip
      const { error: deleteError } = await supabase
        .from('trip_meeting_points')
        .delete()
        .eq('trip_id', tripId)
        .eq('created_by', user.id);

      if (deleteError) {
        throw deleteError;
      }

      const { data, error } = await supabase
        .from('trip_meeting_points')
        .insert({
          trip_id: tripId,
          created_by: user.id,
          place_name: selectedPlace.name,
          address: selectedPlace.address,
          latitude: selectedPlace.lat,
          longitude: selectedPlace.lon,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setSavedMeetingPoint(data);

      alert('Meeting point saved and shared with your buddy! 📍');
    } catch (error: any) {
      console.error(error);

      alert(
        error.message ||
          'Failed to save meeting point.'
      );
    } finally {
      setSaving(false);
    }
  };

  const openDirections = (
    lat: number,
    lon: number
  ) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
      '_blank'
    );
  };

  if (loadingLocation) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-stone-700 font-semibold">
          <Loader2 className="animate-spin" />
          Getting your location...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-8">

      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <MapPin className="text-emerald-700" />
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-stone-900">
                Safe Meeting Point
              </h1>

              <p className="text-stone-500 mt-1">
                Choose a public place to meet your travel buddy.
              </p>
            </div>

          </div>

          <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">

            <p className="text-sm text-emerald-800 font-medium">
              🛡️ For safety, choose a busy and public location such as
              a railway station, cafe, mall, hotel or bus stop.
            </p>

          </div>

        </div>

        {/* SAVED MEETING POINT */}
        {savedMeetingPoint && (
          <div className="mb-8 rounded-3xl bg-white border border-emerald-200 p-6 shadow-sm">

            <div className="flex items-center gap-2 mb-4">

              <CheckCircle2 className="text-emerald-600" />

              <h2 className="text-xl font-bold text-stone-900">
                Confirmed Meeting Point
              </h2>

            </div>

            <div className="rounded-2xl bg-emerald-50 p-5">

              <h3 className="font-bold text-lg text-stone-900">
                {savedMeetingPoint.place_name}
              </h3>

              <p className="text-sm text-stone-600 mt-1">
                {savedMeetingPoint.address}
              </p>

              <button
                onClick={() =>
                  openDirections(
                    savedMeetingPoint.latitude,
                    savedMeetingPoint.longitude
                  )
                }
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-white font-semibold hover:bg-emerald-700"
              >
                <Navigation size={17} />
                Get Directions
              </button>

            </div>

          </div>
        )}

        {/* CATEGORIES */}
        <div className="mb-8">

          <h2 className="text-xl font-bold text-stone-900 mb-4">
            Choose a place
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

            {categories.map((category) => {

              const Icon = category.icon;

              const active =
                selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() =>
                    searchPlaces(category.id)
                  }
                  className={`rounded-2xl border p-4 text-center transition ${
                    active
                      ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-emerald-300'
                  }`}
                >

                  <Icon
                    className="mx-auto mb-2"
                    size={25}
                  />

                  <span className="text-sm font-semibold">
                    {category.name}
                  </span>

                </button>
              );
            })}

          </div>

        </div>

        {/* LOADING */}
        {loadingPlaces && (
          <div className="flex justify-center py-12">

            <div className="flex items-center gap-3 text-stone-600 font-semibold">

              <Loader2 className="animate-spin" />

              Finding nearby places...

            </div>

          </div>
        )}

        {/* RESULTS */}
        {!loadingPlaces && places.length > 0 && (

          <div>

            <h2 className="text-xl font-bold text-stone-900 mb-4">
              Nearby places
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              {places.map((place) => (

                <div
                  key={place.id}
                  className={`rounded-3xl border bg-white p-5 transition ${
                    selectedPlace?.id === place.id
                      ? 'border-emerald-500 ring-2 ring-emerald-100'
                      : 'border-stone-200'
                  }`}
                >

                  <div className="flex justify-between gap-4">

                    <div className="min-w-0">

                      <h3 className="font-bold text-lg text-stone-900">
                        {place.name}
                      </h3>

                      <p className="text-sm text-stone-500 mt-1">
                        {place.address}
                      </p>

                      <p className="text-sm text-emerald-700 font-semibold mt-2">
                        {place.distance < 1
                          ? `${Math.round(place.distance * 1000)} m away`
                          : `${place.distance.toFixed(1)} km away`}
                      </p>

                    </div>

                    <MapPin
                      className="text-emerald-600 flex-shrink-0"
                    />

                  </div>

                  <div className="flex gap-2 mt-4">

                    <button
                      onClick={() =>
                        setSelectedPlace(place)
                      }
                      className={`flex-1 rounded-xl px-4 py-2.5 font-semibold ${
                        selectedPlace?.id === place.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                      }`}
                    >
                      {selectedPlace?.id === place.id
                        ? 'Selected ✓'
                        : 'Select'}
                    </button>

                    <button
                      onClick={() =>
                        openDirections(
                          place.lat,
                          place.lon
                        )
                      }
                      className="rounded-xl bg-stone-900 px-4 py-2.5 text-white font-semibold hover:bg-stone-800"
                    >
                      <Navigation size={17} />
                    </button>

                  </div>

                </div>

              ))}

            </div>

          </div>

        )}

        {/* NO RESULTS */}
        {!loadingPlaces &&
          selectedCategory &&
          places.length === 0 && (
            <div className="rounded-3xl bg-white border border-stone-200 p-8 text-center">

              <MapPin className="mx-auto text-stone-400 mb-3" />

              <p className="font-semibold text-stone-700">
                No nearby places found.
              </p>

              <p className="text-sm text-stone-500 mt-1">
                Try another category.
              </p>

            </div>
          )}

        {/* SAVE */}
        {selectedPlace && (

          <div className="mt-8 sticky bottom-4">

            <div className="rounded-3xl bg-stone-900 p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">

              <div>

                <p className="text-xs text-stone-400 uppercase font-semibold">
                  Selected Meeting Point
                </p>

                <p className="text-white font-bold mt-1">
                  {selectedPlace.name}
                </p>

              </div>

              <button
                onClick={saveMeetingPoint}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-white font-bold hover:bg-emerald-400 disabled:opacity-60"
              >

                {saving ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Save & Share Meeting Point
                  </>
                )}

              </button>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

