import React, { useState } from 'react';
import { MapPin, Filter, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Destinations() {
  const [filter, setFilter] = useState('All');

  const destinations = [
    {
      id: 1,
      name: 'Rajasthan, India',
      image:
        'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&q=80&w=800',
      category: 'Culture',
      description:
        'Explore royal palaces, forts, lakes and the golden city of Jaisalmer.',
    },
    {
      id: 2,
      name: 'Goa, India',
      image:
        'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=800',
      category: 'Beach',
      description:
        'Enjoy beaches, nightlife, Portuguese heritage and peaceful coastal towns.',
    },
    {
      id: 3,
      name: 'Kerala, India',
      image:
        'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=800',
      category: 'Nature',
      description:
        'Experience backwaters, tea plantations, beaches and beautiful hill stations.',
    },
    {
      id: 4,
      name: 'Himachal, India',
      image:
        'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&q=80&w=800',
      category: 'Adventure',
      description:
        'Discover Himalayan landscapes, mountains, valleys and peaceful hill towns.',
    },
    {
      id: 5,
      name: 'Thailand',
      image:
        'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&q=80&w=800',
      category: 'Beach',
      description:
        'Explore Bangkok, Pattaya and Phuket with beaches, nightlife and culture.',
    },
    {
      id: 6,
      name: 'Vietnam',
      image:
        'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=800',
      category: 'Culture',
      description:
        'Discover vibrant cities, local culture, mountains, food and coastal beauty.',
    },
  ];

  const filteredDestinations =
    filter === 'All'
      ? destinations
      : destinations.filter((d) => d.category === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Explore Destinations
          </h1>

          <p className="text-stone-500 mt-1">
            Choose a destination and create your personalized travel plan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-stone-500" />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Beach">Beach</option>
            <option value="Culture">Culture</option>
            <option value="Adventure">Adventure</option>
            <option value="Nature">Nature</option>
          </select>
        </div>
      </div>

      {/* Destination Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDestinations.map((dest) => (
          <div
            key={dest.id}
            className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden group"
          >
            {/* Image */}
            <div className="relative h-48 overflow-hidden">
              <img
                src={dest.image}
                alt={dest.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />

              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md text-xs font-semibold text-stone-700">
                {dest.category}
              </div>
            </div>

            {/* Card Content */}
            <div className="p-5">
              <h3 className="text-lg font-bold text-stone-900 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                {dest.name}
              </h3>

              <p className="text-sm text-stone-500 mb-5">
                {dest.description}
              </p>

              <Link
                to={`/plans?destination=${encodeURIComponent(dest.name)}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 font-medium rounded-md hover:bg-emerald-100 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Plan Trip
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}