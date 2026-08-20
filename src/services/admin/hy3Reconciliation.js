const clean = (value) => String(value ?? '').trim();
const key = (provider, sourceOrganization, externalCode) => [provider, sourceOrganization, externalCode].map(clean).join('|');
const normalized = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const mappingKind = (kind) => kind === 'organization' || kind === 'athlete' ? kind : null;
const mappingTarget = (mapping) => mapping?.mapping_kind === 'organization' ? mapping.organization_id : mapping?.athlete_id;

const error = (scope, sourceAlias, code, message) => ({ scope, sourceAlias, code, message });
const eventDefinition = (event) => event?.event_definition || event?.definition || event?.eventDefinition || event || {};
const eventLabel = (event) => normalized(eventDefinition(event).name || eventDefinition(event).label || event.displayName || event.name);
const eventMatches = (source, event) => {
  const definition = eventDefinition(event);
  const sameLabel = eventLabel(source) && eventLabel(source) === eventLabel(event);
  const sameCode = normalized(source.sourceAlias) === normalized(definition.code);
  const sameShape = Number(definition.distance_metres || definition.distanceMetres) === Number(source.distanceMetres)
    && normalized(definition.stroke) === normalized(source.stroke)
    && normalized(event.competitive_sex || definition.sex) === normalized(source.sex)
    && normalized(event.round || definition.round) === normalized(source.round);
  return sameLabel || sameCode || sameShape;
};

export function sourceMappingRows(preview, mappings = [], provider = 'hy-tek', sourceOrganization = preview?.meetName) {
  const organization = clean(sourceOrganization) || 'HY3';
  const byKey = new Map(mappings.map((mapping) => [key(mapping.provider, mapping.source_organization, mapping.external_code), mapping]));
  return [
    ...(preview?.teams || []).map((team) => ({ kind: 'organization', sourceAlias: team.sourceAlias })),
    ...(preview?.athletes || []).map((athlete) => ({ kind: 'athlete', sourceAlias: athlete.sourceAlias })),
  ].map(({ kind, sourceAlias }) => {
    const candidate = byKey.get(key(provider, organization, sourceAlias));
    const stored = candidate?.mapping_kind === kind ? candidate : null;
    return {
      id: stored?.id || '', provider, sourceOrganization: organization, externalCode: sourceAlias,
      mappingKind: kind, resolutionStatus: stored?.resolution_status || 'pending', targetId: mappingTarget(stored) || '',
    };
  }).sort((left, right) => `${left.mappingKind}:${left.externalCode}`.localeCompare(`${right.mappingKind}:${right.externalCode}`));
}

function resolveEvent(source, references, eventMappings) {
  const explicit = eventMappings?.[source.sourceAlias];
  if (explicit) {
    const selected = references.find((event) => event.id === explicit);
    return selected ? { event: selected } : { problem: error('event', source.sourceAlias, 'event-reference-missing', 'The selected competition event no longer exists.') };
  }
  const matches = references.filter((event) => eventMatches(source, event));
  if (matches.length === 1) return { event: matches[0] };
  if (matches.length > 1) return { problem: error('event', source.sourceAlias, 'event-ambiguous', 'The source event matches more than one competition event.') };
  return { problem: error('event', source.sourceAlias, 'event-unresolved', 'The source event is not present in the selected competition program.') };
}

export function reconcileHy3Preview(preview, references = {}, options = {}) {
  const errors = []; const mappings = sourceMappingRows(preview, references.mappings, options.provider || 'hy-tek', options.sourceOrganization || preview?.meetName);
  const mappingIndex = new Map(mappings.map((mapping) => [key(mapping.provider, mapping.sourceOrganization, mapping.externalCode), mapping]));
  const organizationByAlias = new Map((preview?.teams || []).map((team) => [team.sourceAlias, mappingIndex.get(key(options.provider || 'hy-tek', options.sourceOrganization || preview?.meetName, team.sourceAlias))]));
  const athleteByAlias = new Map((preview?.athletes || []).map((athlete) => [athlete.sourceAlias, mappingIndex.get(key(options.provider || 'hy-tek', options.sourceOrganization || preview?.meetName, athlete.sourceAlias))]));
  const resolved = (map, scope, alias) => {
    if (map?.resolutionStatus === 'resolved' && map.targetId) return map.targetId;
    errors.push(error(scope, alias, 'mapping-unresolved', `The ${scope} source mapping must be resolved before preview approval.`));
    return null;
  };
  const eventRows = references.events || [];
  const eventIds = new Map();
  for (const source of preview?.events || []) {
    const result = resolveEvent(source, eventRows, options.eventMappings);
    if (result.problem) errors.push(result.problem); else eventIds.set(source.sourceAlias, result.event.id);
  }
  const entryByAlias = new Map((preview?.entries || []).map((entry) => [entry.sourceAlias, entry]));
  const sanitizedRows = []; const seenRows = new Set();
  for (const result of preview?.results || []) {
    const entry = entryByAlias.get(result.entryAlias); const athleteId = resolved(athleteByAlias.get(entry?.athleteAlias), 'athlete', entry?.athleteAlias || result.sourceAlias); const eventId = eventIds.get(entry?.eventAlias);
    if (!eventId && entry?.eventAlias) errors.push(error('result', result.sourceAlias, 'event-unresolved', 'The result event is not resolved in the competition program.'));
    if (!entry || !athleteId || !eventId) continue;
    const duplicateKey = `${eventId}|${athleteId}`;
    if (seenRows.has(duplicateKey)) { errors.push(error('result', result.sourceAlias, 'duplicate-result', 'The preview contains more than one result for the same athlete and event.')); continue; }
    seenRows.add(duplicateKey);
    sanitizedRows.push({ sourceAlias: result.sourceAlias, competition_event_id: eventId, athlete_id: athleteId, represented_organization_id: null, entry_status: result.status === 'disqualified' ? 'disqualified' : result.status === 'did_not_start' ? 'did_not_start' : 'confirmed', seed_time_ms: entry.seedTimeSeconds == null ? null : Math.round(entry.seedTimeSeconds * 1000), lane: null, time_ms: result.timeSeconds == null ? null : Math.round(result.timeSeconds * 1000), place: result.place, status: result.status, notes: result.note || null });
  }
  const relays = (preview?.relays || []).flatMap((relay) => {
    const organizationId = resolved(organizationByAlias.get(relay.teamAlias), 'organization', relay.teamAlias); const eventId = eventIds.get(relay.eventAlias);
    if (!eventId) errors.push(error('relay', relay.sourceAlias, 'event-unresolved', 'The relay event is not resolved in the competition program.'));
    return organizationId && eventId ? [{ sourceAlias: relay.sourceAlias, competition_event_id: eventId, represented_organization_id: organizationId, legs: relay.legs, time_ms: relay.timeSeconds == null ? null : Math.round(relay.timeSeconds * 1000), status: relay.status, notes: relay.note || null }] : [];
  });
  if (relays.length > 0) errors.push(error('relay', relays[0].sourceAlias, 'relay-persistence-unsupported', 'La persistencia de relevos aún no está disponible; eliminá todos los relevos antes de importar.'));
  const mappingErrors = mappings.filter((mapping) => mapping.resolutionStatus !== 'resolved').length;
  return { ok: errors.length === 0 && (sanitizedRows.length > 0 || relays.length > 0), mappings, sanitizedRows, relays, errors, summary: { teams: preview?.teams?.length || 0, athletes: preview?.athletes?.length || 0, events: preview?.events?.length || 0, results: sanitizedRows.length, relays: relays.length, unresolvedMappings: mappingErrors, blockedRows: errors.length } };
}

export const mappingPayload = (value) => {
  const kind = mappingKind(value.mappingKind); const targetId = clean(value.targetId);
  if (!kind || !targetId || !clean(value.sourceOrganization) || !clean(value.externalCode)) throw new Error('INVALID_SOURCE_MAPPING');
  return { provider: clean(value.provider) || 'hy-tek', source_organization: clean(value.sourceOrganization), external_code: clean(value.externalCode), mapping_kind: kind, organization_id: kind === 'organization' ? targetId : null, athlete_id: kind === 'athlete' ? targetId : null, resolution_status: 'resolved' };
};
