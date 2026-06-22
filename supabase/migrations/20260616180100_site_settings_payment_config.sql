-- JSON value rows for payment_info, payment_fee_rates (key-value style site_settings)

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS value jsonb;

INSERT INTO public.site_settings (key, brand_name, value)
VALUES (
  'payment_info',
  'Payment Info',
  '{"name":"บริษัท ดับบลิวพี เทรดดิ้ง อินเตอร์กรุ๊ป จำกัด","tax_id":"010556405549615","biller_id":"010556405549615","promptpay":"010556405549615","accounts":[{"bank":"ธนาคารกสิกรไทย","account":"167-1-35178-5","type":"ออมทรัพย์"},{"bank":"ธนาคารไทยพาณิชย์","account":"171-4-18448-5","type":"ออมทรัพย์"}],"bank":"ธนาคารกสิกรไทย","account":"167-1-35178-5"}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO public.site_settings (key, brand_name, value)
VALUES (
  'payment_fee_rates',
  'Payment Fee Rates',
  '{"promptpay_direct":0,"wallet":0,"transfer":0,"cod_flat":0,"c2c2p_card":0.0365,"c2c2p_wallet":0.015,"c2c2p_installment":0.05}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
