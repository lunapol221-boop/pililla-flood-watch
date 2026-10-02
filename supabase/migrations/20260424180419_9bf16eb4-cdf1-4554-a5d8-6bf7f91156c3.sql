-- Enable realtime updates for flood readings and weather forecasts
ALTER TABLE public.flood_readings REPLICA IDENTITY FULL;
ALTER TABLE public.weather_forecasts REPLICA IDENTITY FULL;
ALTER TABLE public.barangays REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.flood_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weather_forecasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.barangays;