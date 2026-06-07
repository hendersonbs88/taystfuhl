# Taystfuhl MVP Design

Date: 2026-06-07

## Purpose

Taystfuhl turns cooking videos into usable recipes.

The first product is not a video-hosting clone. It is a viral/trending recipe decoder: a user pastes a cooking-video URL, Taystfuhl extracts the practical recipe, flags uncertain details, attributes the creator, embeds or links the original video when permitted, and generates a downloadable recipe PDF.

## Approved Direction

Browser companion selections recorded:

- Viral/trending recipes first.
- No unlicensed video rehosting.

## Product Positioning

Primary promise:

> Paste a cooking video. Get the real recipe.

Primary audience:

- People who see viral cooking videos but cannot easily recover ingredients, quantities, cooking times, or steps.
- Initial content categories grow from trending demand: high protein, air fryer, dinner, desserts, meal prep, budget meals, and quick meals.

Taystfuhl should become the layer between chaotic short-form cooking content and usable kitchen instructions.

## MVP User Flow

1. User pastes a video URL from TikTok, Instagram, YouTube, or another supported public source.
2. Intake Agent validates the URL, platform, and whether the source can be embedded or referenced.
3. Media Agent gathers available metadata, captions/transcript, creator name, thumbnail, duration, description, and key frames where permitted.
4. Recipe Agent extracts or infers:
   - Recipe title.
   - Ingredients.
   - Estimated quantities.
   - Preparation steps.
   - Cook times and temperatures.
   - Servings.
   - Needed tools.
   - Missing or uncertain details.
5. Nutrition Agent optionally estimates calories/macros when enough ingredient data exists.
6. QA Agent assigns confidence scores and routes low-confidence recipes to admin review.
7. Publishing Agent creates a recipe page with attribution, source embed/link, structured recipe data, and PDF download.
8. User downloads recipe PDF or saves/shares the page.

## Launch Guardrails

### Content Rights

- Do not rehost unlicensed third-party videos.
- Use official embeds where supported.
- Use source links where embeds are unavailable or blocked.
- Show creator attribution and source platform.
- Maintain a takedown/contact path.
- Store only metadata, extracted recipe text, thumbnails where permitted, and generated recipe assets.

### Platform Policy

- Avoid building a site that only aggregates embedded videos for ad revenue.
- The core value must be recipe extraction, structured instructions, PDF download, organization, search, and quality flags.
- Prefer official APIs, public embeds, user-submitted URLs, and creator-approved ingestion.
- Scraping should be limited, polite, rate-limited, and replaceable with official API integrations when available.

### Food Safety

- Generated instructions should include safety checks where relevant:
  - Internal temperatures for meat.
  - Warnings for raw eggs, seafood, and poultry.
  - Allergy labels where ingredients imply common allergens.
- Do not claim medical or diet results.
- Nutrition is an estimate unless verified from exact quantities.

## MVP Scope

### In Scope

- URL submission page.
- Platform/source normalization.
- Recipe extraction pipeline.
- Recipe confidence scoring.
- Admin review queue.
- Public recipe pages.
- Downloadable PDF recipe cards.
- Basic categories and tags.
- Search/browse for published recipes.
- Creator/source attribution.
- Structured data for recipe SEO.
- Basic analytics for submissions, publish rate, downloads, and failed extractions.

### Out of Scope for v1

- Unlicensed video rehosting.
- Fully autonomous public publishing without QA thresholds.
- Creator monetization portal.
- Mobile app.
- Paid subscriptions.
- Grocery delivery checkout.
- Accounts required for first use.
- Exact nutrition guarantees.
- Large-scale scraping of private or login-walled content.

## Agent Architecture

### Intake Agent

Responsibilities:

- Accept submitted URLs.
- Normalize source platform.
- Validate URL format and accessibility.
- Check duplicate submissions.
- Create extraction job.
- Decide whether source can be embedded, linked, or rejected.

Inputs:

- Raw URL.
- Optional user email or session ID.

Outputs:

- `video_source` record.
- `extraction_job` record.

### Media Agent

Responsibilities:

- Fetch permitted metadata.
- Retrieve captions/transcripts when available.
- Extract public description text.
- Capture representative key frames only where allowed.
- Store source title, creator, canonical URL, platform ID, thumbnail reference, duration, and embed status.

Inputs:

- `video_source`.

Outputs:

- `media_artifacts`.
- `transcript_segments`.
- `visual_observations`.

### Recipe Agent

Responsibilities:

- Convert media artifacts into structured recipe draft.
- Infer missing quantities conservatively.
- Separate observed facts from guesses.
- Generate plain-language steps.
- Identify uncertain ingredients, temperatures, and timing.

Inputs:

- Transcript segments.
- Description text.
- Visual observations.
- Source metadata.

Outputs:

- `recipe_draft`.
- Ingredient list.
- Instruction list.
- Confidence notes.

### Nutrition Agent

Responsibilities:

- Estimate calories/macros when ingredient quantities are sufficient.
- Mark nutrition as estimated.
- Skip nutrition when confidence is too low.

Inputs:

- Recipe draft.

Outputs:

- `nutrition_estimate`.
- Nutrition confidence score.

### QA Agent

Responsibilities:

- Score extraction quality.
- Flag risky or incomplete recipes.
- Identify hallucinated details.
- Route recipe to auto-publish, admin review, or rejection.

Recommended v1 thresholds:

- Auto-publish only if source is embeddable/linkable, ingredient confidence is high, instruction confidence is high, and no food-safety risk is unresolved.
- Admin review if any critical quantity, temperature, ingredient, or timing is inferred with low confidence.
- Reject if source cannot be referenced safely, transcript/visual data is too weak, or recipe cannot be reconstructed.

### Publishing Agent

Responsibilities:

- Generate recipe page.
- Generate PDF.
- Add recipe structured data.
- Add category/tag pages.
- Attribute source creator.
- Mark source video as embedded or linked.

Outputs:

- Public recipe URL.
- PDF asset.
- Search index entry.

## Data Model

### `video_sources`

- `id`
- `platform`
- `canonical_url`
- `platform_video_id`
- `creator_name`
- `creator_url`
- `title`
- `description`
- `thumbnail_url`
- `duration_seconds`
- `embed_allowed`
- `source_status`
- `submitted_at`

### `extraction_jobs`

- `id`
- `video_source_id`
- `status`
- `current_agent`
- `error_code`
- `error_message`
- `created_at`
- `updated_at`

### `media_artifacts`

- `id`
- `video_source_id`
- `artifact_type`
- `storage_ref`
- `policy_basis`
- `created_at`

### `recipes`

- `id`
- `video_source_id`
- `slug`
- `title`
- `summary`
- `servings`
- `prep_time_minutes`
- `cook_time_minutes`
- `total_time_minutes`
- `confidence_score`
- `publish_status`
- `published_at`

### `recipe_ingredients`

- `id`
- `recipe_id`
- `name`
- `quantity`
- `unit`
- `preparation_note`
- `confidence_score`
- `is_inferred`

### `recipe_steps`

- `id`
- `recipe_id`
- `position`
- `instruction`
- `time_minutes`
- `temperature`
- `confidence_score`
- `is_inferred`

### `recipe_tags`

- `recipe_id`
- `tag`

### `nutrition_estimates`

- `recipe_id`
- `calories`
- `protein_g`
- `carbs_g`
- `fat_g`
- `confidence_score`
- `notes`

### `qa_reviews`

- `id`
- `recipe_id`
- `status`
- `reviewer`
- `flags`
- `notes`
- `created_at`
- `resolved_at`

## Page Types

### Home / Submit Page

Core elements:

- Brand: Taystfuhl.
- Primary input: paste cooking video URL.
- CTA: Decode Recipe.
- Recent decoded recipes.
- Trending categories.
- Trust copy: attributed source, no video theft, confidence flags.

### Recipe Page

Core elements:

- Recipe title.
- Original source embed or source link.
- Creator attribution.
- Ingredients.
- Steps.
- Confidence / missing-info notes.
- Download PDF button.
- Category tags.
- Nutrition estimate when available.
- Related decoded recipes.

### Category Page

Core elements:

- Tag title, such as High Protein or Air Fryer.
- Published recipe cards.
- Source platform filters.
- Sort by trending, newest, most downloaded.

### Admin Queue

Core elements:

- Pending extraction jobs.
- Recipe draft preview.
- Source video/link.
- Confidence flags.
- Edit ingredients/steps.
- Approve, reject, or request re-extraction.

## Automation Strategy

### Phase 1: Submission-Led Automation

- Users and admin submit URLs.
- Pipeline extracts recipe drafts.
- Admin reviews public pages until confidence is proven.

### Phase 2: Discovery Queue

- Discovery Agent monitors approved public sources:
  - YouTube search/API for cooking videos.
  - TikTok embeds/display paths where available.
  - Public trend pages and creator RSS-like sources where allowed.
  - Manual seed lists of creators and hashtags.
- New candidates enter admin queue, not public site directly.

### Phase 3: Creator Network

- Creators can claim pages.
- Creators can submit videos.
- Taystfuhl offers better recipe PDFs, SEO pages, grocery lists, and attribution.
- Licensed videos can be rehosted only after explicit permission.

## Technical Architecture Recommendation

Recommended stack for first build:

- Next.js app for site, recipe pages, admin UI, and API routes.
- PostgreSQL with Prisma for structured recipe data.
- Object storage for generated PDFs and permitted artifacts.
- Background job queue for extraction pipeline.
- OpenAI multimodal model for transcript/frame-to-recipe extraction.
- PDF renderer for downloadable recipe cards.
- Auth only for admin in v1.
- Analytics events for submit, extraction success/failure, publish, PDF download, and source platform.

The implementation should keep extraction agents behind explicit interfaces so platform-specific fetchers and AI models can be swapped without rewriting recipe pages.

## Error Handling

- Invalid URL: show supported-source guidance.
- Unsupported platform: allow user to submit for manual review.
- Source unavailable: mark job failed and ask for another URL.
- Embed unavailable: fall back to source link if policy allows.
- Low extraction confidence: show draft privately or route to admin.
- PDF generation failure: keep recipe page available and retry PDF job.
- AI safety uncertainty: require admin review.

## Success Metrics

MVP is working if:

- Users can paste supported cooking-video URLs.
- At least 80 percent of valid submitted videos produce a structured recipe draft.
- Admin can approve, edit, and publish decoded recipes.
- Published pages include attribution and source embed/link.
- Users can download a recipe PDF.
- Each published recipe has confidence notes when details are inferred.
- Trending categories generate browseable pages.

Business signal metrics:

- URL submissions per day.
- Extraction success rate.
- Admin time per approved recipe.
- PDF download rate.
- Organic visits to recipe pages.
- Repeat visits or saved recipes.

## Implementation Defaults

These defaults should be used for the first implementation plan unless the user changes direction:

- Supported v1 platforms: YouTube and TikTok first. Instagram starts as source-link-only unless reliable approved access is available.
- Nutrition estimates: v1.1 unless extraction confidence is high and implementation cost is low.
- Anonymous users: can submit URLs and see job status, but public index pages require admin approval or high-confidence auto-approval.
- Hosting target: Vercel for Next.js app unless an existing hosting account for taystfuhl is already configured elsewhere.
- Database: PostgreSQL.
- Admin auth: simple protected admin area in v1.

## Sources Checked

- YouTube Help warns against sites that do nothing more than aggregate embedded YouTube videos for ad revenue.
- TikTok Developers lists Embed Videos as a developer product.
- TikTok Display API supports displaying creator profile information and videos through API-backed integrations.

## Approval State

This design reflects the selected companion choices:

- Viral/trending recipe decoder.
- No unlicensed video rehosting.

Next step after user review is to create an implementation plan.
