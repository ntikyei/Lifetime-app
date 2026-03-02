export const architectureMarkdown = `
# Lifetime Dating App Architecture

## 1. App Architecture (Frontend + Backend)

### Frontend (Mobile Apps)
*   **Framework:** React Native (Expo) or Flutter. *Recommendation: React Native (Expo)* for faster iteration and access to a massive ecosystem of web-compatible libraries.
*   **State Management:** Zustand or Redux Toolkit.
*   **Data Fetching:** React Query (TanStack Query) for caching and optimistic updates.
*   **Navigation:** React Navigation (Expo Router).
*   **UI Library:** Tailwind CSS (NativeWind) or custom styled-components.

### Backend (API & Services)
*   **Framework:** Node.js with Express or NestJS. *Recommendation: Node.js + Express* for simplicity and speed, or Supabase for a managed backend-as-a-service.
*   **Database:** PostgreSQL (Relational, excellent for geospatial queries with PostGIS).
*   **Authentication:** Firebase Auth or Supabase Auth (handles Apple/Google/Email/Phone seamlessly).
*   **Storage:** AWS S3 or Supabase Storage (for user photos and media).
*   **Real-time (Messaging):** WebSockets (Socket.io) or Firebase Realtime Database / Supabase Realtime.
*   **Payments:** Stripe (for web/Android where permitted) and RevenueCat (for managing Apple/Google in-app purchases).

### Infrastructure
*   **Hosting:** Render, Heroku, or AWS (ECS/EKS).
*   **CDN:** Cloudflare or AWS CloudFront for fast photo delivery.

---

## 2. Database Schema (PostgreSQL)

Using PostgreSQL with the PostGIS extension for location-based matching.

**Users Table (\`users\`)**
*   \`id\` (UUID, Primary Key)
*   \`auth_id\` (String, Unique) - Links to Firebase/Supabase Auth
*   \`email\` (String, Unique)
*   \`phone\` (String, Unique, Nullable)
*   \`name\` (String)
*   \`dob\` (Date)
*   \`gender\` (Enum: MALE, FEMALE, NON_BINARY, etc.)
*   \`location\` (Geography Point - PostGIS)
*   \`has_paid\` (Boolean, Default: false)
*   \`created_at\` (Timestamp)
*   \`updated_at\` (Timestamp)

**User Profiles Table (\`user_profiles\`)**
*   \`user_id\` (UUID, Foreign Key -> users.id)
*   \`bio\` (Text)
*   \`height\` (Integer - cm)
*   \`job_title\` (String)
*   \`company\` (String)
*   \`education\` (String)
*   \`religion\` (String, Nullable)
*   \`ethnicity\` (String, Nullable)
*   \`lifestyle_choices\` (JSONB - e.g., smoking, drinking)

**User Photos Table (\`user_photos\`)**
*   \`id\` (UUID, Primary Key)
*   \`user_id\` (UUID, Foreign Key -> users.id)
*   \`url\` (String)
*   \`order\` (Integer)
*   \`is_verified\` (Boolean)

**User Prompts Table (\`user_prompts\`)**
*   \`id\` (UUID, Primary Key)
*   \`user_id\` (UUID, Foreign Key -> users.id)
*   \`prompt_question_id\` (Integer)
*   \`answer\` (Text)
*   \`order\` (Integer)

**Preferences Table (\`user_preferences\`)**
*   \`user_id\` (UUID, Foreign Key -> users.id)
*   \`min_age\` (Integer)
*   \`max_age\` (Integer)
*   \`max_distance_km\` (Integer)
*   \`interested_in\` (Array of Enums)
*   \`dealbreakers\` (JSONB - strict filters)

**Interactions Table (\`interactions\`)** // Swipes/Likes
*   \`id\` (UUID, Primary Key)
*   \`actor_id\` (UUID, Foreign Key -> users.id)
*   \`target_id\` (UUID, Foreign Key -> users.id)
*   \`type\` (Enum: LIKE, PASS)
*   \`liked_content_type\` (Enum: PHOTO, PROMPT)
*   \`liked_content_id\` (UUID)
*   \`comment\` (Text, Nullable)
*   \`created_at\` (Timestamp)

**Matches Table (\`matches\`)**
*   \`id\` (UUID, Primary Key)
*   \`user1_id\` (UUID, Foreign Key -> users.id)
*   \`user2_id\` (UUID, Foreign Key -> users.id)
*   \`created_at\` (Timestamp)
*   \`unmatched_at\` (Timestamp, Nullable)

**Messages Table (\`messages\`)**
*   \`id\` (UUID, Primary Key)
*   \`match_id\` (UUID, Foreign Key -> matches.id)
*   \`sender_id\` (UUID, Foreign Key -> users.id)
*   \`type\` (Enum: TEXT)
*   \`content\` (Text)
*   \`reply_to_id\` (UUID, Foreign Key -> messages.id, Nullable)
*   \`status\` (Enum: SENT, DELIVERED, READ)
*   \`created_at\` (Timestamp)

**Message Reactions Table (\`message_reactions\`)**
*   \`id\` (UUID, Primary Key)
*   \`message_id\` (UUID, Foreign Key -> messages.id)
*   \`user_id\` (UUID, Foreign Key -> users.id)
*   \`emoji\` (String)
*   \`created_at\` (Timestamp)

**User Settings Table (\`user_settings\`)**
*   \`user_id\` (UUID, Primary Key, Foreign Key -> users.id)
*   \`discovery_paused\` (Boolean, Default: false)
*   \`hide_distance\` (Boolean, Default: false)
*   \`read_receipts\` (Boolean, Default: true)
*   \`typing_indicators\` (Boolean, Default: true)
*   \`notifications_matches\` (Boolean, Default: true)
*   \`notifications_messages\` (Boolean, Default: true)
*   \`notifications_likes\` (Boolean, Default: true)

**User Preferences Table (\`user_preferences\`)**
*   \`user_id\` (UUID, Primary Key, Foreign Key -> users.id)
*   \`min_age\` (Integer, Default: 18)
*   \`max_age\` (Integer, Default: 100)
*   \`genders\` (Array of Strings, Default: empty for 'Everyone')
*   \`max_distance_km\` (Integer, Default: 0 for 'Anywhere')
*   \`race\` (Array of Strings, Nullable)
*   \`religion\` (Array of Strings, Nullable)
*   \`ethnicity\` (Array of Strings, Nullable)

---

## 3. API Endpoints (RESTful)

**Authentication & Onboarding**
*   \`POST /api/auth/register\` - Create user record after Firebase/Supabase auth.
*   \`POST /api/auth/login\` - Authenticate and return JWT/Session.
*   \`PUT /api/users/profile\` - Update profile details, bio, prompts.
*   \`POST /api/users/photos\` - Upload a photo (returns CDN URL).
*   \`PUT /api/users/preferences\` - Update discovery preferences.
*   \`PUT /api/users/settings\` - Update app settings.

**Discovery & Matching**
*   \`GET /api/discovery/feed\` - Fetch a batch of potential matches based on \`user_preferences\`. Excludes profiles where \`discovery_paused\` is true.
*   \`POST /api/interactions/like\` - Like a user.
*   \`POST /api/interactions/pass\` - Pass on a user.
*   \`GET /api/matches\` - Get list of active matches.
*   \`POST /api/matches/:id/unmatch\` - Unmatch a user.

**Messaging (REST & WebSockets)**
*   \`GET /api/matches/:id/messages\` - Get paginated messages for a match.
*   \`WS /socket\` - WebSocket connection for real-time events:
    *   \`message:send\` -> \`message:receive\`
    *   \`typing:start\` -> \`typing:update\` (Respects \`typing_indicators\` setting)
    *   \`reaction:add\` -> \`reaction:update\`
    *   \`message:read\` -> \`receipt:update\` (Respects \`read_receipts\` setting)

**Payments**
*   \`POST /api/payments/create-intent\` - Create Stripe PaymentIntent for £5.
*   \`POST /api/payments/verify-iap\` - Verify Apple/Google receipt via RevenueCat.
*   \`POST /api/payments/webhook\` - Stripe/RevenueCat webhook to update \`has_paid\` status.

---

## 4. Messaging Architecture & UX

### Real-Time Architecture
*   **WebSockets (Socket.io):** Used for low-latency delivery of messages, typing indicators, and read receipts.
*   **Redis Pub/Sub:** Allows WebSocket servers to scale horizontally. When User A sends a message to User B, Node.js publishes the event to Redis, and the specific WebSocket server holding User B's connection pushes it to their device.
*   **Offline Queueing:** If a user sends a message while offline, React Query / Zustand queues the mutation. Upon reconnection, the queue flushes. If the recipient is offline, the message is stored in PostgreSQL and delivered via Push Notification.

### Voice Notes
*   **Recording & Compression:** Recorded on-device using the Opus codec (highly efficient for speech).
*   **Upload Flow:** 
    1. Client requests a pre-signed S3 URL.
    2. Client uploads the \`.opus\` or \`.m4a\` file directly to S3 (bypassing the Node.js server to save bandwidth).
    3. Client sends the WebSocket \`message:send\` event with the S3 URL, duration, and waveform data (calculated on-device).
*   **Playback:** Streamed directly from a CDN (CloudFront) for instant playback. UI supports 1x, 1.5x, and 2x speeds.

### UX Constraints & Philosophy
*   **No "Online" Status or "Last Seen":** Removes the anxiety of being watched or ignored.
*   **Soft Typing Indicators:** Instead of a frantic pulsing bubble, the typing indicator is a subtle text line (e.g., "Sarah is typing...") that fades in gently.
*   **Subtle Read Receipts:** No double blue ticks. A simple, low-contrast checkmark or "Read" text appears only on the *last* message sent, preventing over-analysis of older messages.
*   **Intentional Replies & Reactions:** Long-press to reply or react. This adds friction to prevent spammy reactions and encourages thoughtful, threaded conversations.
*   **First Message Anxiety:** If a match sits empty for days, the UI does not show a "Matches expire in 24h!" countdown. It remains calm.

---

## 5. Matching Algorithm Logic

Since this is a one-time payment app, the algorithm should prioritize **quality and active users** over keeping users hooked for subscription renewals.

1.  **Geospatial Filtering:** Use PostGIS \`ST_DWithin\` to find users within the \`max_distance_km\` preference.
2.  **Hard Filters (Dealbreakers):** Filter out users outside the \`min_age\` and \`max_age\`, and those who don't match the \`interested_in\` gender preferences.
3.  **Exclusion:** Exclude users the current user has already liked, passed, or blocked.
4.  **Scoring/Ranking (The "Secret Sauce"):**
    *   *Activity Score:* Boost users who have been active in the last 24-48 hours.
    *   *Profile Completeness:* Boost users with 3+ photos and filled-out prompts.
    *   *Inbound Likes:* If User B has already liked User A, put User B near the top of User A's feed to facilitate instant matches.
    *   *Elo Rating (Optional):* A basic desirability score to show highly sought-after profiles occasionally, but randomize enough to give everyone visibility.
5.  **Batching:** Return 10-20 profiles per API call to minimize load and keep the feed feeling fresh.

---

## 6. Monetization Stress-Test & Alternatives

The £5 lifetime model is highly disruptive but carries risks (server costs outscaling user acquisition). To mitigate this without resorting to subscriptions, we implement **Ethical Micro-transactions**:

**Variant 1: Profile Spotlight (The "Coffee" Model)**
*   **Concept:** Instead of a monthly "Gold" tier, users can pay £2 for a one-time visibility boost.
*   **UI Execution:** Found in the Profile tab. The copy is honest: *"Be seen by 50 active users today."* It feels like buying a coffee before going out, rather than signing a contract.
*   **Why it works:** It monetizes *intent*. Users only pay when they actually have the time and energy to date that weekend.

**Variant 2: City Unlocks**
*   **Concept:** The initial £5 unlocks your home city. If you travel or move, you can unlock a new city permanently for £3.
*   **UI Execution:** Found in the Profile tab under Upgrades. *"Traveling? Unlock a new city permanently."*
*   **Why it works:** It aligns cost with value. Server costs increase as users query new geospatial data, so the user pays for that specific expansion.

**Refund Resistance (Radical Transparency)**
*   Instead of hiding the refund button behind a labyrinth of support emails, we place a **"Request a Refund"** button directly in the Profile settings.
*   **Copy:** *"Within 14 days? Automatic refund, no questions asked."*
*   **Psychology:** Knowing they can easily get their money back drastically reduces buyer's remorse and anxiety during the initial £5 purchase. It builds immense trust.

---

## 7. MVP Feature List

**Must-Haves for Launch (MVP):**
*   Auth (Phone SMS or Apple/Google).
*   Profile creation (Upload up to 6 photos, answer 3 prompts, basic stats).
*   Discovery Feed (View one profile at a time, scroll through photos/prompts).
*   Interactions (Like a specific photo/prompt, or Pass).
*   Inbound Likes screen (See who liked you).
*   Mutual Matching logic.
*   Real-time Chat (Text, Voice Notes, Reactions, Replies).
*   One-time £5 Payment Gateway (Apple/Google IAP via RevenueCat).
*   Safety: Block and Report user functionality.

**Post-MVP (V2):**
*   Advanced filters (Religion, Family plans, etc.).
*   AI photo moderation (AWS Rekognition) to block inappropriate content automatically.
*   Push notifications for new matches and messages.

---

## 8. Scalability Considerations

*   **Database Indexing:** Geospatial queries are expensive. Ensure GiST indexes are applied to the \`location\` column in PostGIS. Index \`actor_id\` and \`target_id\` in the interactions table.
*   **Caching:** Cache user profiles in Redis. When User A requests a feed, fetch IDs from Postgres, then hydrate the profile data from Redis to reduce database load.
*   **Connection Pooling:** Use PgBouncer to manage database connections, as serverless functions or many Node instances can easily exhaust Postgres connection limits.
*   **Media Delivery:** User photos must be compressed on upload (e.g., WebP format, max 1080x1080) and served via a global CDN (Cloudflare/CloudFront) to ensure fast loading and low bandwidth costs.
*   **Stateless Backend:** Ensure the Node.js API is stateless so it can be horizontally scaled behind a load balancer as traffic grows.
`;

