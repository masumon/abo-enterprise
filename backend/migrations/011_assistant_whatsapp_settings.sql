-- Assistant WhatsApp integration settings
-- Run after 010_assistant_module.sql

INSERT INTO settings (key, value, data_type, description, is_editable)
VALUES
  ('feature_assistant_whatsapp', 'true', 'boolean', 'Show WhatsApp chat option inside AI assistant widget', true),
  ('assistant_welcome_en', 'How can I help you today? Ask in English or Bangla — I''m here 24/7.', 'string', 'Assistant welcome message (English)', true),
  ('assistant_welcome_bn', 'আজ কীভাবে সাহায্য করতে পারি? ইংরেজি বা বাংলায় জিজ্ঞাসা করুন — আমি ২৪/৭ আছি।', 'string', 'Assistant welcome message (Bangla)', true)
ON CONFLICT (key) DO NOTHING;
