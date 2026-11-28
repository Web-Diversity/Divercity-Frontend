const columns = 'id,author_id,author_name,category,title,body,place,meetup_date,meetup_time,capacity,latitude,longitude,created_at';

function toMeetup(row, participantCount, joined) {
  return {
    id: row.id,
    type: 'meetup',
    shared: true,
    authorId: row.author_id,
    author: row.author_name,
    category: row.category,
    title: row.title,
    body: row.body,
    place: row.place,
    date: row.meetup_date,
    time: row.meetup_time.slice(0, 5),
    capacity: row.capacity,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    participantCount: Number(participantCount),
    joined,
    likes: [],
    saved: [],
    comments: [],
  };
}

export function meetupCount(post) {
  return post.shared ? post.participantCount : post.participants.length;
}

export async function loadMeetups(client, signedIn) {
  const {data: rows, error} = await client.from('posts').select(columns)
    .eq('type', 'meetup').order('created_at', {ascending: false});
  if (error) throw error;
  if (!rows.length) return [];

  const [engagement, memberships] = await Promise.all([
    client.rpc('get_post_engagement', {p_post_ids: rows.map(row => row.id)}),
    signedIn ? client.from('meetup_participants').select('post_id') : {data: []},
  ]);
  if (engagement.error) throw engagement.error;
  if (memberships.error) throw memberships.error;

  const counts = new Map(engagement.data.map(row => [row.post_id, row.participant_count]));
  const joined = new Set(memberships.data.map(row => row.post_id));
  return rows.map(row => toMeetup(row, counts.get(row.id) ?? 0, joined.has(row.id)));
}

export async function saveMeetup(client, meetup, previous = null) {
  const payload = {
    type: 'meetup',
    category: meetup.category,
    title: meetup.title,
    body: meetup.body,
    place: meetup.place,
    meetup_date: meetup.date,
    meetup_time: meetup.time,
    capacity: meetup.capacity,
    latitude: meetup.latitude ?? null,
    longitude: meetup.longitude ?? null,
  };
  const query = previous
    ? client.from('posts').update(payload).eq('id', previous.id).eq('type', 'meetup')
    : client.from('posts').insert(payload);
  const {data, error} = await query.select(columns).single();
  if (error) throw error;
  // The database adds the author as the first participant on insert.
  return toMeetup(data, previous?.participantCount ?? 1, previous?.joined ?? true);
}

export async function removeMeetup(client, id) {
  const {data, error} = await client.from('posts').delete()
    .eq('id', id).eq('type', 'meetup').select('id');
  if (error) throw error;
  if (data.length !== 1) throw new Error('모임을 삭제할 수 없어요.');
}

export async function setMeetupParticipation(client, id, joined) {
  const {data, error} = await client.rpc(joined ? 'leave_meetup' : 'join_meetup', {p_post_id: id});
  if (error) throw error;
  return data === true;
}
