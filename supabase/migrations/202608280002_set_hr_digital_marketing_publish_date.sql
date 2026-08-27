do $$
begin
  update public.posts
  set published_at = timestamptz '2022-06-15 12:00:00+00'
  where slug = '5-similarities-between-the-hr-and-digital-marketing-world';

  if not found then
    raise exception 'Post not found: 5-similarities-between-the-hr-and-digital-marketing-world';
  end if;
end
$$;
