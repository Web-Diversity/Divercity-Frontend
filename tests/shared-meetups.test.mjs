import assert from 'node:assert/strict';
import test from 'node:test';
import {loadMeetups, saveMeetup, removeMeetup, setMeetupParticipation} from '../online/static-site/js/meetup-store.js';

const row = {
  id: 'meetup-1', author_id: 'owner', author_name: '다이버', category: '스터디',
  title: '웹 스터디', body: '과제 같이 해요', place: '숭실대학교',
  meetup_date: '2099-11-28', meetup_time: '14:00:00', capacity: 5,
  latitude: 37.4965, longitude: 126.9571, created_at: '2026-11-28T00:00:00Z',
};

test('a public map loads the saved campus coordinates and aggregate participation count', async () => {
  const db = {
    from(table) {
      assert.equal(table, 'posts');
      return {select: () => ({
        eq: (column, value) => {
          assert.deepEqual([column, value], ['type', 'meetup']);
          return {order: async () => ({data: [row]})};
        },
      })};
    },
    async rpc(name, args) {
      assert.equal(name, 'get_post_engagement');
      assert.deepEqual(args, {p_post_ids: [row.id]});
      return {data: [{post_id: row.id, participant_count: 4}]};
    },
  };
  const [meetup] = await loadMeetups(db, false);
  assert.deepEqual([meetup.longitude, meetup.latitude], [126.9571, 37.4965]);
  assert.equal(meetup.participantCount, 4);
  assert.equal(meetup.time, '14:00');
  assert.equal(meetup.joined, false);
});

test('a signed-in viewer sees their own meetup membership without exposing other users', async () => {
  const db = {
    from(table) {
      if (table === 'posts') return {select: () => ({eq: () => ({order: async () => ({data: [row]})})})};
      assert.equal(table, 'meetup_participants');
      return {select: async columns => {
        assert.equal(columns, 'post_id');
        return {data: [{post_id: row.id}]};
      }};
    },
    rpc: async () => ({data: [{post_id: row.id, participant_count: 4}]}),
  };
  const [meetup] = await loadMeetups(db, true);
  assert.equal(meetup.joined, true);
  assert.equal(meetup.participantCount, 4);
});

test('creating a meetup sends the chosen location and uses the database-assigned ID', async () => {
  let payload;
  const db = {from: () => ({insert: values => {
    payload = values;
    return {select: () => ({single: async () => ({data: row})})};
  }})};
  const post = await saveMeetup(db, {
    ...row, date: row.meetup_date, time: '14:00', authorId: 'ignored', id: 'local-id',
  });
  assert.deepEqual(payload, {
    type: 'meetup', category: '스터디', title: '웹 스터디', body: '과제 같이 해요',
    place: '숭실대학교', meetup_date: '2099-11-28', meetup_time: '14:00',
    capacity: 5, latitude: 37.4965, longitude: 126.9571,
  });
  assert.equal(post.id, row.id);
  assert.equal(post.authorId, row.author_id);
  assert.equal(post.participantCount, 1);
  assert.equal(post.joined, true);
});

test('RLS-denied deletes do not count as success, and attendance changes use RPCs', async () => {
  const calls = [];
  const db = {
    from: () => ({delete: () => ({eq: (column, id) => {
      calls.push([column, id]);
      return {eq: () => ({select: async () => ({data: []})})};
    }})}),
    rpc: async (name, args) => {
      calls.push([name, args]);
      return {data: null};
    },
  };
  await assert.rejects(removeMeetup(db, row.id), /삭제/);
  await setMeetupParticipation(db, row.id, false);
  await setMeetupParticipation(db, row.id, true);
  assert.deepEqual(calls, [
    ['id', row.id],
    ['join_meetup', {p_post_id: row.id}],
    ['leave_meetup', {p_post_id: row.id}],
  ]);
});
