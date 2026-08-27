do $$
begin
  update public.posts
  set published_at = timestamptz '2022-09-15 12:00:00+00'
  where slug = 'quiet-quitting-defining-success-through-the-latest-workplace-trend';

  if not found then
    raise exception 'Post not found: quiet-quitting-defining-success-through-the-latest-workplace-trend';
  end if;
end
$$;
