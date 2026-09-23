import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Image as ImageIcon,
  Send,
  Loader2,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Trip {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
}

export default function TravelPost() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState('');
  const [caption, setCaption] = useState('');

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  // =====================================================
  // FETCH COMPLETED TRIPS
  // =====================================================

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTrips = async () => {
      try {
        setLoading(true);
        setError('');

        const today =
          new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('trips')
          .select(
            'id, destination, start_date, end_date'
          )
          .eq('user_id', user.id)
          .lt('end_date', today)
          .order('end_date', {
            ascending: false,
          });

        if (error) {
          console.error('Trips error:', error);
          setError(
            'Unable to load your completed trips.'
          );
          return;
        }

        setTrips(data || []);
      } catch (err) {
        console.error(err);
        setError(
          'Something went wrong while loading trips.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [user]);

  // =====================================================
  // IMAGE SELECT
  // =====================================================

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      e.target.files || []
    );

    if (files.length === 0) return;

    setError('');

    if (
      imageFiles.length + files.length >
      5
    ) {
      setError(
        'You can add maximum 5 photos.'
      );
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError(
          'Please select only image files.'
        );
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(
          'Each image must be less than 5 MB.'
        );
        return;
      }
    }

    const newPreviews = files.map((file) =>
      URL.createObjectURL(file)
    );

    setImageFiles((prev) => [
      ...prev,
      ...files,
    ]);

    setImagePreviews((prev) => [
      ...prev,
      ...newPreviews,
    ]);

    e.target.value = '';
  };

  // =====================================================
  // REMOVE IMAGE
  // =====================================================

  const removeImage = (index: number) => {
    if (imagePreviews[index]) {
      URL.revokeObjectURL(
        imagePreviews[index]
      );
    }

    setImageFiles((prev) =>
      prev.filter(
        (_, i) => i !== index
      )
    );

    setImagePreviews((prev) =>
      prev.filter(
        (_, i) => i !== index
      )
    );
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  // =====================================================
  // SHARE JOURNEY
  // =====================================================

  const handlePost = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!user) {
      setError('Please login first.');
      return;
    }

    if (!selectedTrip) {
      setError(
        'Please select a completed trip.'
      );
      return;
    }

    if (
      !caption.trim() &&
      imageFiles.length === 0
    ) {
      setError(
        'Please add at least one photo or write something about your trip.'
      );
      return;
    }

    if (caption.length > 1000) {
      setError(
        'Your story must be less than 1000 characters.'
      );
      return;
    }

    try {
      setPosting(true);
      setError('');

      const uploadedUrls: string[] = [];

      // =================================================
      // UPLOAD ALL IMAGES
      // =================================================

      for (const imageFile of imageFiles) {
        const fileExtension =
          imageFile.name.split('.').pop() ||
          'jpg';

        const fileName =
          `${user.id}/${Date.now()}-${Math.random()
            .toString(36)
            .substring(2)}.${fileExtension}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from('travel-posts')
          .upload(
            fileName,
            imageFile,
            {
              cacheControl: '3600',
              upsert: false,
              contentType:
                imageFile.type,
            }
          );

        if (uploadError) {
          console.error(
            'Image upload error:',
            uploadError
          );

          setError(
            `Image upload failed: ${uploadError.message}`
          );

          if (
            uploadedUrls.length > 0
          ) {
            const paths =
              uploadedUrls
                .map((url) => {
                  const parts =
                    url.split(
                      '/travel-posts/'
                    );

                  return (
                    parts[1] || ''
                  );
                })
                .filter(Boolean);

            if (paths.length > 0) {
              await supabase.storage
                .from('travel-posts')
                .remove(paths);
            }
          }

          return;
        }

        const {
          data: publicUrlData,
        } = supabase.storage
          .from('travel-posts')
          .getPublicUrl(fileName);

        uploadedUrls.push(
          publicUrlData.publicUrl
        );
      }

      // =================================================
      // INSERT TRAVEL POST
      // =================================================

      const {
        data: createdPost,
        error: postError,
      } = await supabase
        .from('travel_posts')
        .insert({
          user_id: user.id,
          trip_id: selectedTrip,
          image_url:
            uploadedUrls[0] || null,
          image_urls:
            uploadedUrls,
          caption:
            caption.trim() || null,
        })
        .select('id')
        .single();

      if (postError) {
        console.error(
          'Post error:',
          postError
        );

        if (
          uploadedUrls.length > 0
        ) {
          const paths =
            uploadedUrls
              .map((url) => {
                const parts =
                  url.split(
                    '/travel-posts/'
                  );

                return (
                  parts[1] || ''
                );
              })
              .filter(Boolean);

          if (paths.length > 0) {
            await supabase.storage
              .from('travel-posts')
              .remove(paths);
          }
        }

        setError(
          postError.message
        );
        return;
      }

      // =================================================
      // SUCCESS
      // =================================================

      console.log(
        'Travel post created:',
        createdPost?.id
      );

      alert(
        'Your travel story has been posted! 🌍'
      );

      navigate('/home');

    } catch (err) {
      console.error(
        'Create post error:',
        err
      );

      setError(
        'Something went wrong while creating your post.'
      );
    } finally {
      setPosting(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2
          className="animate-spin text-emerald-600"
          size={32}
        />
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="max-w-2xl mx-auto">

      {/* HEADER */}

      <div className="flex items-center gap-3 mb-6">

        <button
          type="button"
          onClick={() =>
            navigate('/home')
          }
          className="p-2 rounded-xl hover:bg-stone-100 transition"
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Share Your Journey
          </h1>

          <p className="text-sm text-stone-500">
            Share your travel experience
            with the Travelmate community
          </p>
        </div>

      </div>

      {/* FORM */}

      <form
        onSubmit={handlePost}
        className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6"
      >

        {/* ERROR */}

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {/* SELECT TRIP */}

        <div className="mb-6">

          <label className="block text-sm font-bold text-stone-800 mb-2">
            Select Completed Trip
          </label>

          {trips.length > 0 ? (
            <select
              value={selectedTrip}
              onChange={(e) =>
                setSelectedTrip(
                  e.target.value
                )
              }
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >

              <option value="">
                Choose a trip...
              </option>

              {trips.map((trip) => (
                <option
                  key={trip.id}
                  value={trip.id}
                >
                  {trip.destination} —{' '}
                  {formatDate(
                    trip.start_date
                  )}
                </option>
              ))}

            </select>
          ) : (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 text-center">

              <MapPin
                className="mx-auto text-stone-400 mb-2"
                size={28}
              />

              <p className="text-stone-600 font-medium">
                No completed trips found.
              </p>

              <p className="text-sm text-stone-400 mt-1">
                Complete a trip first to
                share your journey.
              </p>

            </div>
          )}

        </div>

        {/* IMAGE UPLOAD */}

        <div className="mb-6">

          <div className="flex items-center justify-between mb-2">

            <label className="block text-sm font-bold text-stone-800">
              Travel Photos
            </label>

            <span className="text-xs text-stone-400">
              {imageFiles.length}/5
            </span>

          </div>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">

              {imagePreviews.map(
                (preview, index) => (
                  <div
                    key={preview}
                    className="relative aspect-square rounded-xl overflow-hidden bg-stone-100"
                  >

                    <img
                      src={preview}
                      alt={`Travel ${
                        index + 1
                      }`}
                      className="w-full h-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeImage(
                          index
                        )
                      }
                      className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition"
                    >
                      <X size={16} />
                    </button>

                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                      {index + 1}
                    </div>

                  </div>
                )
              )}

            </div>
          )}

          {imageFiles.length < 5 && (
            <label className="w-full min-h-40 border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition">

              <ImageIcon
                size={40}
                className="text-stone-300 mb-3"
              />

              <span className="font-semibold text-stone-700">
                {imageFiles.length === 0
                  ? 'Add travel photos'
                  : 'Add more photos'}
              </span>

              <span className="text-xs text-stone-400 mt-1">
                JPG, PNG or WEBP · Max 5 MB
                each · Up to 5 photos
              </span>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={
                  handleImageChange
                }
                className="hidden"
              />

            </label>
          )}

        </div>

        {/* CAPTION */}

        <div className="mb-6">

          <label className="block text-sm font-bold text-stone-800 mb-2">
            Your Story
          </label>

          <textarea
            value={caption}
            onChange={(e) =>
              setCaption(
                e.target.value
              )
            }
            maxLength={1000}
            rows={6}
            placeholder="Tell everyone about your trip... ✈️"
            className="w-full px-4 py-3 rounded-xl border border-stone-200 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <div className="text-right text-xs text-stone-400 mt-1">
            {caption.length}/1000
          </div>

        </div>

        {/* SELECTED TRIP PREVIEW */}

        {selectedTrip && (
          <div className="mb-6 bg-emerald-50 border border-emerald-100 rounded-xl p-4">

            {(() => {
              const trip =
                trips.find(
                  (t) =>
                    t.id ===
                    selectedTrip
                );

              if (!trip) return null;

              return (
                <>
                  <div className="flex items-center gap-2 text-emerald-700 font-bold">
                    <MapPin size={17} />
                    {trip.destination}
                  </div>

                  <p className="text-xs text-emerald-600 mt-1">
                    {formatDate(
                      trip.start_date
                    )}{' '}
                    –{' '}
                    {formatDate(
                      trip.end_date
                    )}
                  </p>
                </>
              );
            })()}

          </div>
        )}

        {/* POST BUTTON */}

        <button
          type="submit"
          disabled={
            posting ||
            trips.length === 0
          }
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition"
        >

          {posting ? (
            <>
              <Loader2
                className="animate-spin"
                size={18}
              />
              Sharing...
            </>
          ) : (
            <>
              <Send size={18} />
              Share Journey
            </>
          )}

        </button>

      </form>

    </div>
  );
}