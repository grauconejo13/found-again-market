-- Run this once in the Supabase SQL Editor to replace the original seed catalog
-- with the real photographed Found Again demo items. Existing seller-created
-- listings are not changed.

update public.products
set
  title = 'Shark-Print Lanyard & Coin Purse',
  category = 'Accessories',
  condition = 'Very good',
  price_cents = 1200,
  description = 'A playful shark-print lanyard with a matching coin purse and patch.',
  tag = 'Playful carry',
  accent = 'sky'
where title = 'The Secret Garden';

update public.products
set
  title = 'Dad Jokes Novelty Pin',
  category = 'Accessories',
  condition = 'Good',
  price_cents = 500,
  description = 'A bright little conversation piece for a jacket, bag, or pin board.',
  tag = 'Pocket-sized grin',
  accent = 'butter'
where title = 'Ceramic Daisy Mug';

update public.products
set
  title = 'Striped Knit Cuff',
  category = 'Accessories',
  condition = 'Very good',
  price_cents = 1000,
  description = 'A textured knit cuff with a colorful stripe pattern and soft feel.',
  tag = 'Handmade texture',
  accent = 'lilac'
where title = 'Woven Market Tote';

update public.products
set
  title = 'Woven Leather Crossbody Bag',
  category = 'Accessories',
  condition = 'Good',
  price_cents = 2400,
  description = 'A colorful woven leather crossbody with an adjustable strap and zipper pockets.',
  tag = 'Everyday carry',
  accent = 'clay'
where title = 'The Art of Simple Food';

update public.products
set
  title = 'Hand-Painted Floral Teacup Set',
  category = 'Home',
  condition = 'Excellent',
  price_cents = 1800,
  description = 'A painted floral teacup and matching saucer in cheerful reds, yellow, and aqua.',
  tag = 'Morning ritual',
  accent = 'butter'
where title = 'Brass Leaf Frame';
