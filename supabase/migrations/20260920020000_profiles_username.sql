ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT;

WITH normalized AS (
	SELECT
		id,
		lower(regexp_replace(coalesce(nick, 'usuario'), '[^a-zA-Z0-9_]+', '_', 'g')) AS base_username
	FROM public.profiles
	WHERE username IS NULL OR username = ''
), numbered AS (
	SELECT
		id,
		base_username,
		row_number() OVER (PARTITION BY base_username ORDER BY id) AS duplicate_number
	FROM normalized
)
UPDATE public.profiles AS profile
SET username = CASE
	WHEN numbered.duplicate_number = 1 THEN numbered.base_username
	ELSE numbered.base_username || '_' || numbered.duplicate_number
END
FROM numbered
WHERE profile.id = numbered.id;

ALTER TABLE public.profiles
ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
ON public.profiles (lower(username));
