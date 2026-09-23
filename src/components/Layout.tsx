import React, { useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Compass,
  Map,
  Users,
  Heart,
  User,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Globe,
  Ban,
  History,
  Siren,
} from 'lucide-react';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout />;
}

function DashboardLayout() {
  const { logout, profile } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    {
      name: 'Home',
      href: '/home',
      icon: Compass,
    },
    {
      name: 'Browse Trips',
      href: '/browse-trips',
      icon: Globe,
    },
    {
      name: 'Destinations',
      href: '/destinations',
      icon: Map,
    },
    {
      name: 'Plans',
      href: '/plans',
      icon: Map,
    },
    {
      name: 'Buddy Finder',
      href: '/buddies',
      icon: Users,
    },

    // GROUP TRAVEL
    {
      name: 'Group Travel',
      href: '/groups',
      icon: Users,
    },

    // HISTORY
    {
      name: 'History',
      href: '/history',
      icon: History,
    },

    {
      name: 'Matches',
      href: '/matches',
      icon: Heart,
    },

    // EMERGENCY & NEARBY
    {
      name: 'Emergency & Nearby',
      href: '/emergency-nearby',
      icon: Siren,
    },

    // CHAT
    {
      name: 'Chat',
      href: '/chat',
      icon: MessageSquare,
    },

    {
      name: 'Profile',
      href: '/profile',
      icon: User,
    },

    {
      name: 'Feedback',
      href: '/feedback',
      icon: MessageSquare,
    },

    {
      name: 'Blocked Users',
      href: '/blocked-users',
      icon: Ban,
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex">

      {/* ================= SIDEBAR ================= */}
      <div className="hidden md:flex w-72 flex-col fixed inset-y-0 bg-white border-r border-stone-100 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">

        {/* Logo */}
        <div className="flex items-center px-8 h-24 border-b border-stone-50">
          <Link
            to="/home"
            className="flex items-center gap-3 text-emerald-600 font-bold text-2xl group"
          >
            <Compass className="w-8 h-8 group-hover:rotate-45 transition-transform duration-500" />

            <span className="tracking-tighter font-serif italic">
              Travelmate
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-8 px-4">
          <nav className="space-y-1.5">

            {navigation.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href === '/chat' &&
                  location.pathname.startsWith('/chat/'));

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-stone-400 group-hover:text-emerald-500'
                    }`}
                  />

                  {item.name}
                </Link>
              );
            })}

          </nav>
        </div>

        {/* ================= PROFILE + LOGOUT ================= */}
        <div className="p-6 border-t border-stone-50 bg-stone-50/30">

          <Link
            to="/profile"
            className="flex items-center gap-4 mb-6 p-3 rounded-2xl hover:bg-white hover:shadow-sm transition-all group border border-transparent hover:border-stone-100"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold overflow-hidden">

              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                profile?.full_name?.[0]?.toUpperCase() ||
                profile?.username?.[0]?.toUpperCase() ||
                '?'
              )}

            </div>

            <div>
              <div className="text-sm font-bold text-stone-900">
                {profile?.full_name ||
                  profile?.username ||
                  'Traveler'}
              </div>

              <div className="text-[10px] uppercase text-stone-400">
                View Profile
              </div>
            </div>
          </Link>

          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-sm font-bold text-stone-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>

        </div>
      </div>

      {/* ================= MOBILE HEADER ================= */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-50 flex items-center justify-between px-4">

        <Link
          to="/home"
          className="text-emerald-600 font-bold text-xl flex items-center gap-2"
        >
          <Compass className="w-6 h-6" />
          Travelmate
        </Link>

        <button
          onClick={() =>
            setIsMobileMenuOpen(!isMobileMenuOpen)
          }
          className="p-2"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>

      </div>

      {/* ================= MOBILE MENU ================= */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-white z-40 p-4 overflow-y-auto">

          <nav className="space-y-3">

            {navigation.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href === '/chat' &&
                  location.pathname.startsWith('/chat/'));

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() =>
                    setIsMobileMenuOpen(false)
                  }
                  className={`flex items-center gap-3 p-3 rounded-lg font-semibold ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}

          </nav>

        </div>
      )}

      {/* ================= MAIN CONTENT ================= */}
      <div className="flex-1 md:ml-72 pt-16 md:pt-0">

        <main className="p-6 md:p-12 max-w-7xl mx-auto">
          <Outlet />
        </main>

      </div>

    </div>
  );
}