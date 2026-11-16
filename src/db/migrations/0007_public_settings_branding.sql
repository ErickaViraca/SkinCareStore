-- La página pública también usa el logo y los colores de la tienda (§4.17).
-- CREATE OR REPLACE VIEW solo permite agregar columnas al final; los permisos se conservan.
CREATE OR REPLACE VIEW public_settings AS
SELECT
  store_name, phones, addresses, whatsapp_url, instagram_url, facebook_url, tiktok_url,
  logo_url, color_background, color_nav, color_primary, color_secondary, color_accent, color_danger, color_text
FROM settings;
