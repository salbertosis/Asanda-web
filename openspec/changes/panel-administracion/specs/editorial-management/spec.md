# Delta for editorial-management

## ADDED Requirements

### Requirement: News lifecycle

Administrators and editors MUST create, preview, update, publish, schedule, archive, and list news. Public clients MUST read only due published articles.

#### Scenario: Editor publishes news
- GIVEN a valid title, unique slug, summary, body, category, and publication time
- WHEN an editor publishes the article
- THEN it appears in descending publication order when due

#### Scenario: Draft remains private
- GIVEN a draft article
- WHEN an anonymous client queries news
- THEN the draft is not returned

### Requirement: Safe article body

Article content MUST use a constrained text format and MUST NOT render unsanitized HTML.

#### Scenario: Unsafe markup is submitted
- GIVEN article content containing executable markup
- WHEN it is previewed or rendered
- THEN executable content is rejected or displayed as inert text

### Requirement: Signed image upload

Authorized staff MUST upload public news and athlete images through a short-lived server signature. Secrets MUST NOT reach the browser.

#### Scenario: Authorized upload
- GIVEN an active content editor
- WHEN a valid image is selected
- THEN the system validates it, uploads to Cloudinary, and stores its `media_assets` reference

#### Scenario: Invalid upload
- GIVEN an oversized or unsupported file
- WHEN upload is attempted
- THEN no media row is published and a clear error is shown

### Requirement: Curated featured athletes

Authorized staff MUST select up to six published athletes with unique order and optional start/end times. Public clients MUST show only currently active selections.

#### Scenario: Feature window expires
- GIVEN a featured athlete whose end time has passed
- WHEN the homepage loads
- THEN that athlete is omitted without deleting the athlete record
