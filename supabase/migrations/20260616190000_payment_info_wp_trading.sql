-- WP Trading Intergroup — real PromptPay Biller ID + bank accounts

UPDATE public.site_settings
SET
  value = '{
    "name": "บริษัท ดับบลิวพี เทรดดิ้ง อินเตอร์กรุ๊ป จำกัด",
    "tax_id": "010556405549615",
    "biller_id": "010556405549615",
    "promptpay": "010556405549615",
    "accounts": [
      {"bank": "ธนาคารกสิกรไทย", "account": "167-1-35178-5", "type": "ออมทรัพย์"},
      {"bank": "ธนาคารไทยพาณิชย์", "account": "171-4-18448-5", "type": "ออมทรัพย์"}
    ],
    "bank": "ธนาคารกสิกรไทย",
    "account": "167-1-35178-5"
  }'::jsonb,
  updated_at = now()
WHERE key = 'payment_info';

INSERT INTO public.site_settings (key, brand_name, value)
SELECT
  'payment_info',
  'Payment Info',
  '{
    "name": "บริษัท ดับบลิวพี เทรดดิ้ง อินเตอร์กรุ๊ป จำกัด",
    "tax_id": "010556405549615",
    "biller_id": "010556405549615",
    "promptpay": "010556405549615",
    "accounts": [
      {"bank": "ธนาคารกสิกรไทย", "account": "167-1-35178-5", "type": "ออมทรัพย์"},
      {"bank": "ธนาคารไทยพาณิชย์", "account": "171-4-18448-5", "type": "ออมทรัพย์"}
    ],
    "bank": "ธนาคารกสิกรไทย",
    "account": "167-1-35178-5"
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key = 'payment_info');
