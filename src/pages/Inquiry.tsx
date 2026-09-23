import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, CheckCircle, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSearchParams } from 'react-router-dom';

export default function Inquiry() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('trip_id');
  
  const [trip, setTrip] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: profile?.username || '',
    email: user?.email || '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tripId) {
      const fetchTrip = async () => {
        const { data } = await supabase.from('trips').select('*').eq('id', tripId).single();
        if (data) {
          setTrip(data);
          setFormData(prev => ({ ...prev, subject: `Inquiry about trip to ${data.destination}` }));
        }
      };
      fetchTrip();
    }
  }, [tripId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const { error: submitError } = await supabase.from('inquiries').insert([
        {
          user_id: user?.id || null,
          trip_id: tripId || null,
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message
        }
      ]);

      if (submitError) throw submitError;

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center p-8 bg-white rounded-2xl shadow-sm border border-stone-200">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-4">Inquiry Received!</h2>
        <p className="text-stone-600 mb-8">
          Thank you for reaching out. Our team will review your inquiry and get back to you at <strong>{formData.email}</strong> as soon as possible.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors"
        >
          Send Another Inquiry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-stone-900">
          {trip ? `Inquire about trip to ${trip.destination}` : 'Contact Support'}
        </h1>
        <p className="text-stone-600 mt-2">
          {trip 
            ? `Send a message to the organizer of the trip to ${trip.destination}.`
            : 'Have a question or need help with your travel plans? Send us an inquiry.'}
        </p>
      </div>

      {trip && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900">{trip.destination}</h3>
            <p className="text-sm text-stone-600">
              {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-stone-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
              placeholder="How can we help?"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-stone-700 mb-1">
              Message
            </label>
            <textarea
              id="message"
              required
              rows={6}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500"
              placeholder="Describe your inquiry in detail..."
            ></textarea>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                'Sending...'
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Inquiry
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
