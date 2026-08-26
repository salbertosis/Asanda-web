import assert from 'node:assert/strict';
import { getLocalIsoDay, selectUpcomingCompetitions } from '../src/services/competitionSelection.js';

const competition = (name, startsOn, status = 'scheduled', endsOn = null, publishedAt = '2026-08-01T12:00:00Z') => ({
  name,
  starts_on: startsOn,
  ends_on: endsOn,
  status,
  published_at: publishedAt,
});

const today = '2026-08-26';
const selected = selectUpcomingCompetitions([
  competition('Draft', '2026-09-01', 'draft'),
  competition('Archived', '2026-09-02', 'archived'),
  competition('Cancelled', '2026-09-03', 'cancelled'),
  competition('Completed', '2026-09-04', 'completed'),
  competition('Unpublished', '2026-09-05', 'scheduled', null, null),
  competition('Past', '2026-08-20', 'scheduled', '2026-08-25'),
  competition('Later', '2026-09-10'),
  competition('Today', today),
  competition('Ongoing', '2026-08-20', 'in_progress', today),
  competition('Postponed', '2026-09-01', 'postponed'),
], today, 3);

assert.deepEqual(selected.map(({ name }) => name), ['Ongoing', 'Today', 'Postponed']);
assert.equal(selectUpcomingCompetitions([competition('Today', today)], today, 0).length, 0);
assert.equal(selectUpcomingCompetitions([competition('Past', '2026-08-25')], today).length, 0);
assert.equal(selectUpcomingCompetitions([competition('Ongoing', '2026-08-01', 'scheduled', today)], today).length, 1);

assert.equal(getLocalIsoDay(new Date(2026, 7, 26, 0, 5)), today);
assert.equal(getLocalIsoDay(new Date(2026, 7, 25, 23, 55)), '2026-08-25');

console.log('competition selection regression passed');
