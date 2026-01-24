-- Backfill profiles from existing auth.users
-- This is necessary because tracked_issues references profiles(id)
-- If a user signed up before the trigger was working, they won't have a profile
-- and saving issues will fail.

INSERT INTO public.profiles (id, username, full_name, avatar_url, github_username)
SELECT 
  id, 
  raw_user_meta_data->>'user_name',
  raw_user_meta_data->>'full_name', 
  raw_user_meta_data->>'avatar_url', 
  raw_user_meta_data->>'user_name'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Also ensure the trigger is definitely enabled for future users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Re-create the handler function to be safe
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, github_username, username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'user_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
