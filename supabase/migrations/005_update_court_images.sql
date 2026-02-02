-- Update court images with proper Unsplash URLs matching surface types

-- Hard Courts
UPDATE public.courts
SET images = '[
  "https://images.unsplash.com/photo-1622163642999-9584742c66b8?w=1200&h=800&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534158914592-062992fbe900?w=1200&h=800&fit=crop&q=80",
  "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&h=800&fit=crop&q=80"
]'::jsonb
WHERE id = '1' AND surface = 'Hard';

UPDATE public.courts
SET images = '[
  "https://images.unsplash.com/photo-1622279457486-62dcc4a431f7?w=1200&h=800&fit=crop&q=80",
  "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&h=800&fit=crop&q=80"
]'::jsonb
WHERE id = '2' AND surface = 'Hard';

UPDATE public.courts
SET images = '[
  "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&h=800&fit=crop&q=80",
  "https://images.unsplash.com/photo-1622163642999-9584742c66b8?w=1200&h=800&fit=crop&q=80"
]'::jsonb
WHERE id = '3' AND surface = 'Hard';

UPDATE public.courts
SET images = '[
  "https://images.unsplash.com/photo-1534158914592-062992fbe900?w=1200&h=800&fit=crop&q=80",
  "https://images.unsplash.com/photo-1622279457486-62dcc4a431f7?w=1200&h=800&fit=crop&q=80",
  "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&h=800&fit=crop&q=80"
]'::jsonb
WHERE id = '5' AND surface = 'Hard';

-- Clay Court
UPDATE public.courts
SET images = '[
  "https://images.unsplash.com/photo-1601925260368-ae2f83d48767?w=1200&h=800&fit=crop&q=80",
  "https://images.unsplash.com/photo-1601925260368-ae2f83d48767?ixlib=rb-4.0.3&w=1200&h=800&fit=crop&q=80",
  "https://images.unsplash.com/photo-1601925260368-ae2f83d48767?auto=format&w=1200&h=800&fit=crop&q=80"
]'::jsonb
WHERE id = '4' AND surface = 'Clay';

