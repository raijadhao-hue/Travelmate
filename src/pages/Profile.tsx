import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Save,
  Calendar,
  MapPin,
  Heart,
  User,
  Camera,
  Trash2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [preferences, setPreferences] = useState<string[]>([]);

  // IDENTITY VERIFICATION
  const [isVerified, setIsVerified] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState('');

  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [savedTrips, setSavedTrips] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const availablePreferences = [
    'Adventure',
    'Relaxation',
    'Culture',
    'Food',
    'Nature',
    'City',
    'Budget',
    'Luxury',
    'Backpacking',
  ];

  // =====================================================
  // CHECK IF TRIP IS COMPLETED
  // =====================================================

  const isTripCompleted = (trip: any) => {
    if (!trip?.end_date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(`${trip.end_date}T00:00:00`);
    endDate.setHours(0, 0, 0, 0);

    return endDate < today;
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (dateString: string) => {
    if (!dateString) return '';

    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // =====================================================
  // CHECK IDENTITY VERIFICATION
  // =====================================================

  const checkVerification = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('identity_verifications')
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'verified')
        .limit(1);

      if (error) {
        console.error('Verification check error:', error);
        setIsVerified(false);
        return;
      }

      setIsVerified(!!data && data.length > 0);
    } catch (error) {
      console.error('Verification check failed:', error);
      setIsVerified(false);
    }
  };

  // =====================================================
  // FETCH TRIPS
  // =====================================================

  const fetchUserTrips = async () => {
    if (!user) return;

    try {
      const { data: myData, error: myError } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (myError) {
        console.error('My trips error:', myError);
      } else {
        setMyTrips(myData || []);
      }

      const { data: savedData, error: savedError } = await supabase
        .from('saved_trips')
        .select(`
          trip_id,
          trips:trip_id (
            *
          )
        `)
        .eq('user_id', user.id);

      if (savedError) {
        console.error('Saved trips error:', savedError);
      } else {
        setSavedTrips(
          savedData?.map((s: any) => s.trips).filter(Boolean) || []
        );
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setBio(profile.bio || '');
      setEmail(profile.email || '');

      setAge(
        profile.age !== null && profile.age !== undefined
          ? String(profile.age)
          : ''
      );

      setGender(profile.gender || '');

      setPreferences(
        Array.isArray(profile.preferences)
          ? profile.preferences
          : []
      );
    }

    if (user) {
      fetchUserTrips();
      checkVerification(user.id);
    }
  }, [profile, user]);

  // =====================================================
  // UPLOAD PHOTO
  // =====================================================

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!user) return;

    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Image size should be less than 5 MB.');
      return;
    }

    try {
      setUploadingPhoto(true);
      setMessage('');

      const fileExt =
        file.name.split('.').pop()?.toLowerCase() || 'jpg';

      const filePath =
        `${user.id}/profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } =
        supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

      const publicUrl =
        publicUrlData.publicUrl;

      const { error: updateError } =
        await supabase
          .from('profiles')
          .update({
            avatar_url: publicUrl,
          })
          .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);

      await refreshProfile();

      setMessage(
        'Profile photo updated successfully!'
      );
    } catch (error: any) {
      console.error('Photo upload failed:', error);

      setMessage(
        error?.message ||
        'Failed to upload profile photo.'
      );
    } finally {
      setUploadingPhoto(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => {
        setMessage('');
      }, 4000);
    }
  };

  // =====================================================
  // REMOVE PHOTO
  // =====================================================

  const handleRemovePhoto = async () => {
    if (!user || !avatarUrl) return;

    const confirmDelete = window.confirm(
      'Are you sure you want to remove your profile photo?'
    );

    if (!confirmDelete) return;

    try {
      setUploadingPhoto(true);
      setMessage('');

      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setAvatarUrl('');

      await refreshProfile();

      setMessage('Profile photo removed.');
    } catch (error: any) {
      console.error('Remove photo error:', error);

      setMessage(
        error?.message ||
        'Failed to remove profile photo.'
      );
    } finally {
      setUploadingPhoto(false);

      setTimeout(() => {
        setMessage('');
      }, 3000);
    }
  };

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setMessage('');

    try {
      const numericAge =
        age.trim() === ''
          ? null
          : Number(age);

      if (
        numericAge !== null &&
        (numericAge < 13 || numericAge > 100)
      ) {
        setMessage('Age must be between 13 and 100.');
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl || null,
          bio: bio,
          email: email,
          age: numericAge,
          gender: gender || null,
          preferences: preferences,
        })
        .eq('id', user.id);

      if (error) {
        console.error(error);
        setMessage('Profile update failed');
      } else {
        await refreshProfile();

        setMessage(
          'Profile updated successfully!'
        );
      }
    } catch (error: any) {
      console.error(error);

      setMessage(
        error.message ||
        'Something went wrong'
      );
    } finally {
      setIsSaving(false);

      setTimeout(() => {
        setMessage('');
      }, 3000);
    }
  };

  // =====================================================
  // TOGGLE PREFERENCES
  // =====================================================

  const togglePreference = (pref: string) => {
    if (preferences.includes(pref)) {
      setPreferences(
        preferences.filter((p) => p !== pref)
      );
    } else {
      setPreferences([
        ...preferences,
        pref,
      ]);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl font-semibold">
        Loading Profile...
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-stone-50 p-8">

      <div className="max-w-5xl mx-auto">

        {/* PROFILE HEADER */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8 border border-stone-200">

          <div className="flex flex-col md:flex-row items-center gap-6">

            {/* PHOTO */}
            <div className="relative">

              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-28 h-28 rounded-full object-cover border-4 border-emerald-600 shadow-md"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-emerald-600">
                  <User
                    size={40}
                    className="text-emerald-700"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center border-4 border-white hover:bg-emerald-700 transition disabled:opacity-60"
              >
                <Camera size={18} />
              </button>

            </div>

            {/* USER INFO */}
            <div className="flex-1 text-center md:text-left">

              {/* NAME + VERIFIED BADGE */}
              <div className="flex items-center justify-center md:justify-start gap-2">

                <h1 className="text-3xl font-bold text-stone-900">
                  {fullName || 'User'}
                </h1>

                {isVerified && (
                  <span
                    title="Identity Verified"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white"
                  >
                    <ShieldCheck
                      size={16}
                      strokeWidth={3}
                    />
                  </span>
                )}

              </div>

              {/* VERIFIED TEXT */}
              {isVerified && (
                <p className="text-xs font-semibold text-emerald-600 mt-1">
                  Identity Verified
                </p>
              )}

              <p className="text-stone-500 mt-1">
                {email || 'No email added'}
              </p>

              {/* AGE + GENDER */}
              {(age || gender) && (
                <div className="flex justify-center md:justify-start items-center gap-2 text-sm text-stone-500 mt-2">

                  {age && (
                    <span>
                      {age} years
                    </span>
                  )}

                  {age && gender && (
                    <span>•</span>
                  )}

                  {gender && (
                    <span>
                      {gender}
                    </span>
                  )}

                </div>
              )}

              <p className="text-stone-700 mt-4">
                {bio || 'No bio added yet'}
              </p>

              {/* IDENTITY VERIFICATION */}
              <div className="mt-5 flex justify-center md:justify-start">

                <Link
                  to="/identity-verification"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                >
                  <ShieldCheck size={18} />

                  {isVerified
                    ? 'Identity Verified'
                    : 'Verify Identity'}
                </Link>

              </div>

            </div>

          </div>

        </div>

        {/* EDIT PROFILE */}
        <div className="bg-white rounded-3xl shadow-lg p-8 border border-stone-200 mb-8">

          <h2 className="text-2xl font-bold mb-6 text-stone-900">
            Edit Profile
          </h2>

          <div className="space-y-5">

            {/* FULL NAME */}
            <div>
              <label className="block mb-2 font-medium">
                Full Name
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                className="w-full border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter your name"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="block mb-2 font-medium">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="w-full border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter email"
              />
            </div>

            {/* AGE */}
            <div>
              <label className="block mb-2 font-medium">
                Age
              </label>

              <input
                type="number"
                min="13"
                max="100"
                value={age}
                onChange={(e) =>
                  setAge(e.target.value)
                }
                className="w-full border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter your age"
              />
            </div>

            {/* GENDER */}
            <div>
              <label className="block mb-2 font-medium">
                Gender
              </label>

              <select
                value={gender}
                onChange={(e) =>
                  setGender(e.target.value)
                }
                className="w-full border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">
                  Select Gender
                </option>

                <option value="Female">
                  Female
                </option>

                <option value="Male">
                  Male
                </option>

                <option value="Non-binary">
                  Non-binary
                </option>

                <option value="Prefer not to say">
                  Prefer not to say
                </option>
              </select>
            </div>

            {/* PROFILE PHOTO */}
            <div>

              <label className="block mb-2 font-medium">
                Profile Photo
              </label>

              <div className="flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={uploadingPhoto}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-60"
                >
                  <Camera size={18} />

                  {uploadingPhoto
                    ? 'Uploading...'
                    : avatarUrl
                    ? 'Change Photo'
                    : 'Choose Photo'}
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition"
                  >
                    <Trash2 size={18} />
                    Remove Photo
                  </button>
                )}

              </div>

              <p className="text-xs text-stone-400 mt-2">
                JPG, PNG or WEBP • Maximum 5 MB
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />

            </div>

            {/* BIO */}
            <div>
              <label className="block mb-2 font-medium">
                Bio
              </label>

              <textarea
                value={bio}
                onChange={(e) =>
                  setBio(e.target.value)
                }
                rows={4}
                className="w-full border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Write something about yourself..."
              />
            </div>

            {/* PREFERENCES */}
            <div>

              <label className="block mb-3 font-medium">
                Travel Preferences
              </label>

              <div className="flex flex-wrap gap-3">

                {availablePreferences.map((pref) => (

                  <button
                    key={pref}
                    type="button"
                    onClick={() =>
                      togglePreference(pref)
                    }
                    className={`px-4 py-2 rounded-full border transition-all duration-200 ${
                      preferences.includes(pref)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-stone-700 border-stone-300 hover:border-emerald-500'
                    }`}
                  >
                    {pref}
                  </button>

                ))}

              </div>

            </div>

            {/* SAVE */}
            <button
              onClick={handleSave}
              disabled={
                isSaving ||
                uploadingPhoto
              }
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl transition disabled:opacity-60"
            >
              <Save size={18} />

              {isSaving
                ? 'Saving...'
                : 'Save Changes'}
            </button>

            {message && (
              <p className="text-emerald-600 font-medium">
                {message}
              </p>
            )}

          </div>

        </div>

        {/* MY TRIPS */}
        <div className="bg-white rounded-3xl shadow-lg p-8 border border-stone-200 mb-8">

          <div className="flex items-center gap-3 mb-6">

            <Calendar className="text-emerald-600" />

            <h2 className="text-2xl font-bold">
              My Trips
            </h2>

          </div>

          {myTrips.length === 0 ? (

            <p className="text-stone-500">
              No trips created yet.
            </p>

          ) : (

            <div className="grid md:grid-cols-2 gap-5">

              {myTrips.map((trip) => {

                const completed = isTripCompleted(trip);

                return (
                  <div
                    key={trip.id}
                    className={`border rounded-2xl p-5 transition ${
                      completed
                        ? 'border-stone-200 bg-stone-50'
                        : 'border-stone-200 hover:shadow-md'
                    }`}
                  >

                    {/* DESTINATION + STATUS */}
                    <div className="flex items-start justify-between gap-3 mb-3">

                      <div className="flex items-center gap-2">

                        <MapPin
                          className="text-emerald-600"
                          size={18}
                        />

                        <h3 className="font-bold text-lg">
                          {trip.destination}
                        </h3>

                      </div>

                      {completed ? (

                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold whitespace-nowrap">

                          <CheckCircle2 size={14} />

                          Trip Completed

                        </span>

                      ) : (

                        <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold whitespace-nowrap">
                          Upcoming Trip
                        </span>

                      )}

                    </div>

                    {/* TRIP DATES */}
                    {(trip.start_date || trip.end_date) && (

                      <div className="flex items-center gap-2 text-sm text-stone-500 mb-3">

                        <Calendar size={15} />

                        <span>
                          {formatDate(trip.start_date)}
                          {trip.end_date &&
                            ` – ${formatDate(trip.end_date)}`}
                        </span>

                      </div>

                    )}

                    {/* DESCRIPTION */}
                    <p className="text-stone-600 mb-4">
                      {trip.description ||
                        'No description'}
                    </p>

                    {/* COMPLETED MESSAGE */}
                    {completed && (
                      <p className="text-sm text-emerald-700 font-medium mb-3">
                        ✓ This trip has been completed.
                      </p>
                    )}

                    {/* VIEW TRIP */}
                    <Link
                      to={`/trip/${trip.id}`}
                      className="text-emerald-600 font-medium hover:underline"
                    >
                      View Trip
                    </Link>

                  </div>
                );

              })}

            </div>

          )}

        </div>

        {/* SAVED TRIPS */}
        <div className="bg-white rounded-3xl shadow-lg p-8 border border-stone-200">

          <div className="flex items-center gap-3 mb-6">

            <Heart className="text-red-500" />

            <h2 className="text-2xl font-bold">
              Saved Trips
            </h2>

          </div>

          {savedTrips.length === 0 ? (

            <p className="text-stone-500">
              No saved trips yet.
            </p>

          ) : (

            <div className="grid md:grid-cols-2 gap-5">

              {savedTrips.map((trip: any) => (

                <div
                  key={trip.id}
                  className="border border-stone-200 rounded-2xl p-5 hover:shadow-md transition"
                >

                  <div className="flex items-center gap-2 mb-2">

                    <MapPin
                      className="text-emerald-600"
                      size={18}
                    />

                    <h3 className="font-bold text-lg">
                      {trip.destination}
                    </h3>

                  </div>

                  <p className="text-stone-600 mb-3">
                    {trip.description ||
                      'No description'}
                  </p>

                  <Link
                    to={`/trip/${trip.id}`}
                    className="text-emerald-600 font-medium hover:underline"
                  >
                    View Trip
                  </Link>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </div>
  );
}