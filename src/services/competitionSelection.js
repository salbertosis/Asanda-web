const UPCOMING_STATUSES = new Set(['scheduled', 'in_progress', 'postponed']);
const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const getLocalIsoDay = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const selectUpcomingCompetitions = (competitions, today, limit = 3) => {
  if (!ISO_DAY_PATTERN.test(today) || limit <= 0) return [];

  return (competitions ?? [])
    .filter((competition) => (
      UPCOMING_STATUSES.has(competition.status)
      && Boolean(competition.published_at)
      && ISO_DAY_PATTERN.test(competition.starts_on)
      && (!competition.ends_on || ISO_DAY_PATTERN.test(competition.ends_on))
      && (competition.ends_on || competition.starts_on) >= today
    ))
    .sort((left, right) => left.starts_on.localeCompare(right.starts_on))
    .slice(0, limit);
};
