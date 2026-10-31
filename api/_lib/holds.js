import { isSupabaseConfigured, supabase } from './supabase.js';

// Return any items still reserved by this order to the collection. Sold items are never touched.
export async function releaseHold(orderId) {
  if (!isSupabaseConfigured()) return [];
  return supabase(
    `products?paypal_order_id=eq.${orderId}&availability=eq.reserved&select=id`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: { availability: 'available', reserved_until: null, paypal_order_id: null },
    },
  );
}
