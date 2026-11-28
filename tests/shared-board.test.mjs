import assert from 'node:assert/strict';
import test from 'node:test';
import {loadBoard, saveBoardPost, addBoardComment} from '../online/static-site/js/board-store.js';

const row = {
  id: 'post-1', type: 'free', category: '일상', title: '공유 글', body: '본문',
  author_id: 'account-1', author_name: '다이버', created_at: '2026-11-28T09:00:00Z',
  comments: [{id: 'comment-1', author_id: 'account-2', author_name: '새내기',
    body: '다른 브라우저의 댓글', created_at: '2026-11-28T09:01:00Z'}],
};

test('public board loads the database post, its public comments and total likes', async () => {
  const client = {
    from(table) {
      assert.equal(table, 'posts');
      return {select: () => ({
        eq(column, value) {
          assert.deepEqual([column, value], ['type', 'free']);
          return {order: async () => ({data: [row]})};
        },
      })};
    },
    async rpc(name, args) {
      assert.equal(name, 'get_post_engagement');
      assert.deepEqual(args, {p_post_ids: ['post-1']});
      return {data: [{post_id: row.id, like_count: 3}]};
    },
  };
  const [post] = await loadBoard(client, null);
  assert.equal(post.title, '공유 글');
  assert.equal(post.authorId, 'account-1');
  assert.equal(post.comments[0].body, '다른 브라우저의 댓글');
  assert.equal(post.likeCount, 3);
  assert.deepEqual(post.likes, []);
});

test('board writes send content and leave ownership to the database', async () => {
  const calls = [];
  const client = {from: table => ({
    insert(payload) {
      calls.push({table, payload});
      return {select: () => ({single: async () => ({data: table === 'posts' ? row : row.comments[0]})})};
    },
  })};
  const post = await saveBoardPost(client, {type: 'free', category: '일상', title: '공유 글', body: '본문',
    id: 'local-1', authorId: 'ignored'});
  const comment = await addBoardComment(client, post.id, '다른 브라우저의 댓글');
  assert.equal(post.id, 'post-1');
  assert.equal(comment.authorId, 'account-2');
  assert.deepEqual(calls, [
    {table: 'posts', payload: {type: 'free', category: '일상', title: '공유 글', body: '본문'}},
    {table: 'comments', payload: {post_id: 'post-1', body: '다른 브라우저의 댓글'}},
  ]);
});
