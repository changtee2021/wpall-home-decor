-- Order payment fee breakdown (channel surcharge pass-through)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_fee numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS gateway_ref text,
  ADD COLUMN IF NOT EXISTS gateway_transaction_id text;

COMMENT ON COLUMN public.orders.payment_fee IS 'Surcharge for payment channel (passed to customer when applicable)';
COMMENT ON COLUMN public.orders.base_total IS 'Subtotal after discount + shipping + VAT, before payment_fee';

-- Backfill base_total from existing rows
UPDATE public.orders
SET base_total = grand_total - COALESCE(payment_fee, 0)
WHERE base_total IS NULL;
