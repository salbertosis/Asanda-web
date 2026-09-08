# Featured athlete achievements

Featured athlete achievements are published as competition groups with one or more event results. They do not depend on editorial evidence.

## Editorial contract

- Administrators create a group with type, title, competition, location, date, and at least one canonical individual event result.
- Supported types are `national_podium`, `international_podium`, `international_participation`, and `state_record`.
- Podiums accept first, second, or third place. International participation accepts Top 8 or Outstanding Participation.
- State Record children reference a currently published official record; public facts resolve live rather than being copied into the group.
- An athlete may have at most six groups. Public output preserves database order and exposes at most six eligible cards.
- Publication requires a published athlete plus active `public_profile` and `results_publication` consent. Evidence approval is not a dependency.
- Public output excludes drafts, invalid children, newly empty groups, evidence fields, internal identifiers, consent records, contact data, birth data, representatives, notes, and administrative history.

The profile renders one semantic card per eligible competition and one list item per result. When no eligible group remains, it shows the Spanish empty state `No hay logros competitivos publicados.`

Evidence tables and shared evidence workflows remain unchanged for other domains. Production migration and deployment require separate authorization.
