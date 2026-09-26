
{/* ACTION BUTTONS */}

<div className="mt-5 flex flex-wrap gap-3">

  {/* VIEW TRIP */}

  <Link
    to={`/trip/${trip.id}`}
    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
  >
    <Calendar size={16} />
    View Trip
  </Link>

  {/* VIEW PROFILE */}

  <Link
    to={`/profile/${trip.user_id}`}
    className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
  >
    <User size={16} />
    View Profile
  </Link>

</div>