const postColumns = 'id,type,category,title,body,author_id,author_name,created_at';
const commentColumns = 'id,body,author_id,author_name,created_at';

function toComment(row) {
  return {
    id: row.id,
    body: row.body,
    authorId: row.author_id,
    author: row.author_name,
    createdAt: row.created_at,
  };
}

function toPost(row, extras = {}) {
  return {
    id: row.id,
    type: row.type,
    shared: true,
    category: row.category,
    title: row.title,
    body: row.body,
    authorId: row.author_id,
    author: row.author_name,
    createdAt: row.created_at,
    likes: [],
    saved: [],
    likeCount: 0,
    comments: (row.comments ?? []).map(toComment)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    ...extras,
  };
}

export async function loadBoard(client, userId) {
  const {data: rows, error} = await client.from('posts')
    .select(postColumns + ',comments(' + commentColumns + ')')
    .eq('type', 'free').order('created_at', {ascending: false});
  if (error) throw error;
  if (!rows.length) return [];

  const [engagement, likes, saved] = await Promise.all([
    client.rpc('get_post_engagement', {p_post_ids: rows.map(row => row.id)}),
    userId ? client.from('post_likes').select('post_id') : {data: []},
    userId ? client.from('saved_posts').select('post_id') : {data: []},
  ]);
  for (const result of [engagement, likes, saved]) {
    if (result.error) throw result.error;
  }

  const likeCounts = new Map(engagement.data.map(row => [row.post_id, Number(row.like_count)]));
  const likedPosts = new Set(likes.data.map(row => row.post_id));
  const savedPosts = new Set(saved.data.map(row => row.post_id));
  return rows.map(row => toPost(row, {
    likeCount: likeCounts.get(row.id) ?? 0,
    likes: likedPosts.has(row.id) ? [userId] : [],
    saved: savedPosts.has(row.id) ? [userId] : [],
  }));
}

export async function saveBoardPost(client, post, previous = null) {
  const payload = {type: 'free', category: post.category, title: post.title, body: post.body};
  const query = previous
    ? client.from('posts').update(payload).eq('id', previous.id).eq('type', 'free')
    : client.from('posts').insert(payload);
  const {data, error} = await query.select(postColumns).single();
  if (error) throw error;
  return toPost(data, previous ? {
    comments: previous.comments,
    likes: previous.likes,
    saved: previous.saved,
    likeCount: previous.likeCount,
  } : {});
}

export async function removeBoardPost(client, id) {
  const {data, error} = await client.from('posts').delete()
    .eq('id', id).eq('type', 'free').select('id');
  if (error) throw error;
  if (data.length !== 1) throw new Error('게시글을 삭제할 수 없어요.');
}

export async function addBoardComment(client, postId, body) {
  const text = String(body ?? '').trim();
  if (!text || text.length > 500) throw new Error('댓글을 1~500자로 입력해주세요.');
  const {data, error} = await client.from('comments').insert({post_id: postId, body: text})
    .select(commentColumns).single();
  if (error) throw error;
  return toComment(data);
}

export async function setBoardReaction(client, postId, kind, selected) {
  const table = kind === 'likes' ? 'post_likes' : 'saved_posts';
  const query = selected
    ? client.from(table).insert({post_id: postId})
    : client.from(table).delete().eq('post_id', postId).select('post_id');
  const {data, error} = await query;
  if (selected && error?.code === '23505') return false;
  if (error) throw error;
  return selected || data.length > 0;
}
