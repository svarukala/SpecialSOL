CREATE TABLE deleted_profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  signed_up_at timestamptz,
  deleted_at timestamptz DEFAULT now(),
  child_count int NOT NULL DEFAULT 0,
  session_count int NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.handle_parent_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO deleted_profiles (id, email, signed_up_at, child_count, session_count)
  VALUES (
    OLD.id,
    OLD.email,
    OLD.created_at,
    (SELECT COUNT(*) FROM children WHERE parent_id = OLD.id),
    (SELECT COUNT(*) FROM practice_sessions ps
       JOIN children c ON c.id = ps.child_id
       WHERE c.parent_id = OLD.id)
  );
  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER on_parent_deleted
  BEFORE DELETE ON parents
  FOR EACH ROW EXECUTE FUNCTION public.handle_parent_deleted();
