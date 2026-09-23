-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT,
    email TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (even anonymous users if you want, but here we'll allow authenticated users)
CREATE POLICY "Allow authenticated users to insert feedback" 
ON public.feedback FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow admins to view feedback (for now, let's allow users to see their own feedback)
CREATE POLICY "Users can view their own feedback" 
ON public.feedback FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);
