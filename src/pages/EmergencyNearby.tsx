import React, { useState } from 'react';
import {
  ArrowLeft,
  Ambulance,
  ShieldAlert,
  Hospital,
  Pill,
  ShoppingCart,
  Bus,
  Train,
  Fuel,
  CreditCard,
  Wrench,
  Toilet,
  Hotel,
  Utensils,
  MapPin,
  Phone,
  Navigation,
  Loader2,
  LocateFixed,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance: number;
  address?: string;
  phone?: string;
  opening_hours?: string;
}

interface Category {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  tags: string[];
}

const categories: Category[] = [
  {
    id: 'hospital',
    title: 'Hospitals',
    icon: <Hospital size={25} />,
    color: 'bg-red-50 text-red-600',
    tags: ['amenity=hospital'],
  },
  {
    id: 'pharmacy',
    title: 'Pharmacies',
    icon: <Pill size={25} />,
    color: 'bg-emerald-50 text-emerald-600',
    tags: ['amenity=pharmacy'],
  },
  {
    id: 'police',
    title: 'Police Stations',
    icon: <ShieldAlert size={25} />,
    color: 'bg-blue-50 text-blue-600',
    tags: ['amenity=police'],
  },
  {
    id: 'ambulance',
    title: 'Ambulance',
    icon: <Ambulance size={25} />,
    color: 'bg-red-50 text-red-600',
    tags: ['emergency=ambulance'],
  },
  {
    id: 'grocery',
    title: 'Grocery Stores',
    icon: <ShoppingCart size={25} />,
    color: 'bg-orange-50 text-orange-600',
    tags: ['shop=supermarket', 'shop=convenience'],
  },
  {
    id: 'bus',
    title: 'Bus Stops',
    icon: <Bus size={25} />,
    color: 'bg-purple-50 text-purple-600',
    tags: ['highway=bus_stop'],
  },
  {
    id: 'railway',
    title: 'Railway Stations',
    icon: <Train size={25} />,
    color: 'bg-indigo-50 text-indigo-600',
    tags: ['railway=station'],
  },
  {
    id: 'fuel',
    title: 'Petrol Pumps',
    icon: <Fuel size={25} />,
    color: 'bg-yellow-50 text-yellow-700',
    tags: ['amenity=fuel'],
  },
  {
    id: 'atm',
    title: 'ATMs',
    icon: <CreditCard size={25} />,
    color: 'bg-cyan-50 text-cyan-600',
    tags: ['amenity=atm'],
  },
  {
    id: 'mechanic',
    title: 'Mechanics',
    icon: <Wrench size={25} />,
    color: 'bg-stone-100 text-stone-700',
    tags: ['shop=car_repair'],
  },
  {
    id: 'toilet',
    title: 'Public Toilets',
    icon: <Toilet size={25} />,
    color: 'bg-sky-50 text-sky-600',
    tags: ['amenity=toilets'],
  },
  {
    id: 'hotel',
    title: 'Hotels',
    icon: <Hotel size={25} />,
    color: 'bg-pink-50 text-pink-600',
    tags: ['tourism=hotel'],
  },
  {
    id: 'restaurant',
    title: 'Restaurants',
    icon: <Utensils size={25} />,
    color: 'bg-amber-50 text-amber-600',
    tags: ['amenity=restaurant'],
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

export default function EmergencyNearby() {
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState('');

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const getLocation = () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  const searchNearby = async (category: Category) => {
    setSelectedCategory(category);
    setPlaces([]);
    setError('');
    setLoading(true);
    setLocationLoading(true);

    try {
      const position = await getLocation();

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      setUserLocation({ lat, lon });
      setLocationLoading(false);

      const tagQueries = category.tags
        .map((tag) => {
          const [key, value] = tag.split('=');

          return `
            node["${key}"="${value}"](around:10000,${lat},${lon});
            way["${key}"="${value}"](around:10000,${lat},${lon});
            relation["${key}"="${value}"](around:10000,${lat},${lon});
          `;
        })
        .join('\n');

      const query = `
        [out:json][timeout:25];
        (
          ${tagQueries}
        );
        out center tags;
      `;

      const response = await fetch(
        'https://overpass-api.de/api/interpreter',
        {
          method: 'POST',
          body: query,
        }
      );

      if (!response.ok) {
        throw new Error('Nearby places could not be loaded.');
      }

      const data = await response.json();

      const result: Place[] = data.elements
        .map((item: any) => {
          const placeLat = item.lat ?? item.center?.lat;
          const placeLon = item.lon ?? item.center?.lon;

          if (!placeLat || !placeLon) return null;

          const distance = calculateDistance(
            lat,
            lon,
            placeLat,
            placeLon
          );

          return {
            id: `${item.type}-${item.id}`,
            name:
              item.tags?.name ||
              item.tags?.['name:en'] ||
              'Unnamed Place',
            lat: placeLat,
            lon: placeLon,
            distance,
            address:
              item.tags?.['addr:street'] ||
              item.tags?.['addr:city'] ||
              '',
            phone:
              item.tags?.phone ||
              item.tags?.['contact:phone'] ||
              '',
            opening_hours:
              item.tags?.opening_hours || '',
          };
        })
        .filter(Boolean)
        .sort(
          (a: Place, b: Place) =>
            a.distance - b.distance
        )
        .slice(0, 30);

      setPlaces(result);
    } catch (err: any) {
      setLocationLoading(false);

      if (err?.code === 1) {
        setError(
          'Location permission denied. Please allow location access for TravelMate.'
        );
      } else if (err?.code === 2) {
        setError(
          'Your location could not be detected. Please try again.'
        );
      } else if (err?.code === 3) {
        setError(
          'Location request timed out. Please try again.'
        );
      } else {
        setError(
          err?.message ||
            'Something went wrong while finding nearby places.'
        );
      }
    } finally {
      setLoading(false);
      setLocationLoading(false);
    }
  };

  const openDirections = (place: Place) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;

    window.open(url, '_blank');
  };

  const callPlace = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const shareLocation = async () => {
    if (!userLocation) return;

    const mapsUrl = `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lon}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My TravelMate Location',
          text: 'This is my current location.',
          url: mapsUrl,
        });
      } else {
        await navigator.clipboard.writeText(mapsUrl);
        alert('Location link copied!');
      }
    } catch {
      // User cancelled sharing
    }
  };

  const callEmergency = () => {
    window.location.href = 'tel:112';
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl p-2 hover:bg-stone-100"
          >
            <ArrowLeft size={22} />
          </button>

          <div>
            <h1 className="font-serif text-2xl font-semibold">
              Emergency & Nearby
            </h1>
            <p className="text-sm text-stone-500">
              Find important places around you
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        {/* Emergency Banner */}
        <section className="mb-8 rounded-3xl bg-emerald-900 p-6 text-white shadow-sm">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle size={22} />
                <span className="font-semibold">
                  Emergency Help
                </span>
              </div>

              <h2 className="text-2xl font-semibold">
                Need immediate assistance?
              </h2>

              <p className="mt-1 text-sm text-emerald-100">
                Quickly call emergency services or share your
                current location.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={callEmergency}
                className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-red-600 hover:bg-stone-100"
              >
                <Phone size={18} />
                Call 112
              </button>

              <button
                onClick={shareLocation}
                disabled={!userLocation}
                className="flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MapPin size={18} />
                Share Location
              </button>
            </div>
          </div>
        </section>

        {!selectedCategory && (
          <>
            <div className="mb-5">
              <h2 className="font-serif text-2xl font-semibold">
                What are you looking for?
              </h2>

              <p className="mt-1 text-sm text-stone-500">
                Select a category to find nearby places.
              </p>
            </div>

            {/* Categories */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => searchNearby(category)}
                  className="group rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${category.color}`}
                  >
                    {category.icon}
                  </div>

                  <h3 className="font-semibold">
                    {category.title}
                  </h3>

                  <p className="mt-1 text-xs text-stone-500">
                    Find nearby
                  </p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Results */}
        {selectedCategory && (
          <section>
            <button
              onClick={() => {
                setSelectedCategory(null);
                setPlaces([]);
                setError('');
              }}
              className="mb-5 flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              <ArrowLeft size={17} />
              Back to categories
            </button>

            <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${selectedCategory.color}`}
                  >
                    {selectedCategory.icon}
                  </div>

                  <div>
                    <h2 className="font-serif text-2xl font-semibold">
                      Nearby {selectedCategory.title}
                    </h2>

                    <p className="text-sm text-stone-500">
                      Places closest to your current location
                    </p>
                  </div>
                </div>
              </div>

              {userLocation && (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <LocateFixed size={17} />
                  Location detected
                </div>
              )}
            </div>

            {locationLoading && (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white">
                <Loader2
                  size={32}
                  className="animate-spin text-emerald-700"
                />

                <p className="mt-4 font-medium">
                  Detecting your location...
                </p>

                <p className="mt-1 text-sm text-stone-500">
                  Please allow location access
                </p>
              </div>
            )}

            {loading && !locationLoading && (
              <div className="flex min-h-[250px] flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white">
                <Loader2
                  size={32}
                  className="animate-spin text-emerald-700"
                />

                <p className="mt-4 font-medium">
                  Finding nearby places...
                </p>
              </div>
            )}

            {error && !loading && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 shrink-0" size={20} />

                  <div>
                    <p className="font-semibold">
                      Location Error
                    </p>

                    <p className="mt-1 text-sm">
                      {error}
                    </p>

                    <button
                      onClick={() =>
                        searchNearby(selectedCategory)
                      }
                      className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!loading &&
              !error &&
              places.length === 0 &&
              userLocation && (
                <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center">
                  <MapPin
                    size={42}
                    className="mx-auto text-stone-400"
                  />

                  <h3 className="mt-4 text-lg font-semibold">
                    No nearby places found
                  </h3>

                  <p className="mt-1 text-sm text-stone-500">
                    Try another category or search again.
                  </p>
                </div>
              )}

            {!loading && places.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {places.map((place) => (
                  <div
                    key={place.id}
                    className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${selectedCategory.color}`}
                      >
                        {selectedCategory.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">
                          {place.name}
                        </h3>

                        <div className="mt-1 flex items-center gap-1 text-sm text-emerald-700">
                          <MapPin size={15} />
                          {place.distance < 1
                            ? `${Math.round(
                                place.distance * 1000
                              )} m away`
                            : `${place.distance.toFixed(
                                1
                              )} km away`}
                        </div>

                        {place.address && (
                          <p className="mt-2 text-sm text-stone-500">
                            {place.address}
                          </p>
                        )}

                        {place.opening_hours && (
                          <p className="mt-1 text-xs text-stone-500">
                            🕒 {place.opening_hours}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              openDirections(place)
                            }
                            className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                          >
                            <Navigation size={16} />
                            Directions
                          </button>

                          {place.phone && (
                            <button
                              onClick={() =>
                                callPlace(place.phone!)
                              }
                              className="flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold hover:bg-stone-50"
                            >
                              <Phone size={16} />
                              Call
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}