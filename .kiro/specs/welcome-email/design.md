# Design Document

## Overview

This design covers six related features that together complete OtakuCircle's email and Settings story:

1. **Welcome Email** — branded email sent on every new account creation (email+password and Google paths)
2. **Email Preferences** — per-user toggles stored in the User model and exposed in the Settings UI
3. **Compact Settings UI** — tighter layout across the entire Settings page
4. **OTP-Verified Email Change** — two-step flow replacing the current unverified email update
5. **OTP-Verified Account Deletion** — three-step modal flow replacing the current click-to-delete
6. **Security Confirmation Emails** — automatic notifications when password or email is changed

All email delivery uses the existing `sendEmail` / `buildEmailHtml` helpers in `authController.js`. No new npm packages are added.

---

## Architecture

### Files That Change

```
server/
  models/
    User.js                        ← add emailPreferences subdocument
    OTP.js                         ← add new type values: 'email_change', 'account_delete'
  controllers/
    authController.js              ← add sendWelcomeEmail(), call it in registerVerify + googleAuth
    userController.js              ← add sendOtpEmail import, update changeEmail + deleteUser,
                                     add sendEmailChangeOtp, sendDeleteOtp, updateEmailPreferences
    socialController.js            ← check emailPreferences before sending recommendation/friend emails
  routes/ (server.js inline routes)
    server.js                      ← register 3 new user endpoints

client/
  src/pages/
    Settings.jsx                   ← compact layout + EmailPreferences section + 2-step email
                                     change + 3-step deletion modal
```

### No New Dependencies

All email helpers (`sendEmail`, `buildEmailHtml`, `oAuth2Client`) live in `authController.js`. `userController.js` will import them from there. The OTP model is already in place; only two new `type` enum values are added.

### Shared Email Utilities Module

To avoid circular imports between `authController.js` and `userController.js`, the shared email helpers (`sendEmail`, `buildEmailHtml`, `oAuth2Client`) are extracted to a new file:

```
server/utils/emailUtils.js    ← sendEmail, buildEmailHtml, oAuth2Client
```

Both controllers import from this module. `authController.js` is updated to import from `emailUtils.js` rather than defining helpers inline.

---

## Components and Interfaces

### Backend: New Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PUT` | `/api/users/email-preferences` | `protect` | Update email notification preferences |
| `POST` | `/api/users/email/send-otp` | `protect` | Send OTP to new email address for email change |
| `POST` | `/api/users/delete/send-otp` | `protect` | Send OTP to current email for account deletion |

### Backend: Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| `PUT` | `/api/users/email` | Now requires `otp` field; verifies before updating |
| `DELETE` | `/api/users/profile` | Now requires `otp` in request body; verifies before deleting |
| `PUT` | `/api/users/password` | After success, sends security confirmation email (non-blocking) |
| `POST` | `/api/auth/register-verify` | After user creation, calls `sendWelcomeEmail` (non-blocking) |
| `POST` | `/api/auth/google` | On new-user branch, calls `sendWelcomeEmail` (non-blocking) |
| `POST` | `/api/social/recommend` | Checks `emailPreferences.friendRecommendation` before emailing |
| `POST` | `/api/social/recommend-movie` | Checks `emailPreferences.friendRecommendation` before emailing |
| `POST` | `/api/friends/request` | Checks `emailPreferences.friendRequest` on recipient before emailing |
| `POST` | `/api/friends/accept` | Checks `emailPreferences.friendRequestAccepted` on sender before emailing |

### Frontend: Settings Page Sections

```
Settings.jsx
├── Account Settings card (compact)
│   ├── Username row (edit-in-place)
│   ├── Email row (2-step edit: send-otp → enter-otp → update)
│   └── Password row (edit-in-place, + post-change security email)
├── Email Preferences card (new)
│   ├── Social Notifications
│   │   ├── Toggle: Friend sends a recommendation
│   │   ├── Toggle: Friend request received
│   │   └── Toggle: Friend request accepted
│   ├── Platform Updates
│   │   └── Toggle: OtakuCircle announcements
│   └── Security Emails (locked)
│       ├── Always-on indicator: Password changed
│       └── Always-on indicator: Email address changed
└── Danger Zone card (3-step deletion modal)
```

---

## Data Models

### User Model — `emailPreferences` Field

Add to `server/models/User.js`:

```js
emailPreferences: {
    friendRecommendation:    { type: Boolean, default: true },
    friendRequest:           { type: Boolean, default: true },
    friendRequestAccepted:   { type: Boolean, default: true },
    platformUpdates:         { type: Boolean, default: true }
    // passwordChanged and emailChanged are security emails — always sent, never stored
}
```

Existing users without this field will get `undefined` on the subdocument, so every preference check uses `user.emailPreferences?.friendRecommendation !== false` (truthy default) to remain backward-compatible.

### OTP Model — New Type Values

Add `'email_change'` and `'account_delete'` to the existing `type` enum:

```js
type: {
    type: String,
    enum: ['register', 'reset', 'link', 'email_change', 'account_delete'],
    required: true
}
```

For `email_change` OTPs, the `pendingPasswordHash` field is repurposed to store `pendingEmail` (the new address to switch to). This avoids a schema migration — the field already exists and is nullable.

---

## Email Content Design

### Welcome Email

The welcome email is composed via `buildEmailHtml()`. Since `buildEmailHtml` takes `headlineText`, `bodyText`, and `ctaHtml`, the feature highlights and CTA button are all passed in `ctaHtml`.

**Subject:** `Welcome to OtakuCircle, {username}! 🎌` (truncated to 30 chars, RFC 2047 encoded)

**Headline:** `Welcome to OtakuCircle, {username}! 🎉` (≤80 chars)

**Body text (bodyText param):** `Your account is ready. OtakuCircle is your home for tracking anime and movies, discovering what to watch next, and sharing your taste with friends.`

**ctaHtml param** — feature highlights + CTA button:

```html
<div style="text-align:left;margin:0 0 24px;">
  <div style="display:flex;align-items:flex-start;margin-bottom:14px;">
    <span style="font-size:18px;margin-right:10px;line-height:1.4;">📺</span>
    <div>
      <strong style="color:#f4f4f5;font-size:14px;">Track everything you watch</strong>
      <p style="color:#a1a1aa;font-size:13px;margin:2px 0 0;">Log watch status, progress, and scores for anime and movies.</p>
    </div>
  </div>
  <div style="display:flex;align-items:flex-start;margin-bottom:14px;">
    <span style="font-size:18px;margin-right:10px;line-height:1.4;">✨</span>
    <div>
      <strong style="color:#f4f4f5;font-size:14px;">AI-powered recommendations</strong>
      <p style="color:#a1a1aa;font-size:13px;margin:2px 0 0;">Get personalized picks based on your taste and watch history.</p>
    </div>
  </div>
  <div style="display:flex;align-items:flex-start;margin-bottom:24px;">
    <span style="font-size:18px;margin-right:10px;line-height:1.4;">👥</span>
    <div>
      <strong style="color:#f4f4f5;font-size:14px;">Connect with friends</strong>
      <p style="color:#a1a1aa;font-size:13px;margin:2px 0 0;">Follow friends, see what they're watching, and share recommendations.</p>
    </div>
  </div>
</div>
<a href="{frontendUrl}" class="btn">Explore OtakuCircle →</a>
```

### Security Confirmation Email — Password Changed

**Subject:** `Your OtakuCircle password was changed`

**Headline:** `Password changed successfully`

**Body:** `Your account password was just updated. If this was you, no action is needed. If you didn't make this change, secure your account immediately by using "Forgot Password".`

**CTA:** Link to forgot-password page labeled "Secure My Account →"

### Security Confirmation Email — Email Changed

**Subject:** `Your OtakuCircle email address was updated`

**Headline:** `Email address changed`

**Body:** `The email address on your account has been changed to {newEmail}. If you made this change, you're all set. If you didn't, contact support immediately.`

**CTA:** No button (informational only — `ctaHtml` contains only a note paragraph)

### Social Notification Emails

Social emails (friend request, recommendation) are sent only when the recipient's relevant preference is `true`. They follow the same `buildEmailHtml` pattern with a short body and a CTA to the platform.

---

## Settings Page — Compact Layout Specification

### Sizing Changes

| Element | Current | New |
|---------|---------|-----|
| Card padding | `p-6 md:p-12` | `p-4 md:p-6` |
| Input padding | `py-4 px-5` | `py-2.5 px-3` |
| Display row padding | `p-6` | `py-3 px-4` |
| Field value text | `text-lg` | `text-sm` |
| Section label text | `text-xs uppercase tracking-widest` | unchanged |
| Section icons | `size={32}` | `size={20}` |
| Button padding | `px-6 py-3` (save) | `px-4 py-2` |
| Card border radius | `rounded-[32px]` | `rounded-2xl` |
| Space between sections | `space-y-8 md:space-y-12` | `space-y-6` |

### Email Change — 2-Step UI Flow

```
Step 1 (editingField === 'email' && emailStep === 1):
  ┌──────────────────────────────────────┐
  │ New email address          [input]   │
  │ Current password           [input]   │
  │ [Send Verification Code]  [Cancel]   │
  └──────────────────────────────────────┘

Step 2 (editingField === 'email' && emailStep === 2):
  ┌──────────────────────────────────────┐
  │ 📧 Code sent to new@email.com        │
  │ Enter 6-digit code         [input]   │
  │ [Confirm Change]          [Cancel]   │
  └──────────────────────────────────────┘
```

State variables added: `emailStep` (1 | 2), replace current `emailData` shape with `{ new, currentPassword, otp }`.

### Account Deletion — 3-Step Modal Flow

```
Step 1 — Confirm intent:
  "Are you sure? This cannot be undone."
  [Send Verification Code]  [Cancel]

Step 2 — OTP sent:
  "A verification code was sent to your email."
  [OTP input field]
  [Confirm Delete]  [Cancel]

Step 3 — Processing (brief loading state, then redirect)
```

State variable: `deleteStep` (1 | 2 | 3).

### Email Preferences Section

```jsx
// New section below Password, above Danger Zone
<EmailPreferencesSection
  preferences={user.emailPreferences}
  onToggle={handlePrefToggle}
/>
```

Toggle component uses a native `<input type="checkbox" role="switch">` styled as a pill toggle (Tailwind: `w-10 h-5 rounded-full bg-zinc-700 checked:bg-indigo-500 transition-colors`). Locked toggles are rendered with `disabled` and `opacity-50`.

---

## API Endpoint Specifications

### `PUT /api/users/email-preferences`

**Auth:** `protect` (JWT)

**Request body:**
```json
{
  "friendRecommendation": true,
  "friendRequest": false,
  "friendRequestAccepted": true,
  "platformUpdates": false
}
```
All fields optional. Unknown fields are ignored. At least one recognized field required (else 400).

**Response 200:**
```json
{
  "emailPreferences": {
    "friendRecommendation": true,
    "friendRequest": false,
    "friendRequestAccepted": true,
    "platformUpdates": false
  }
}
```

**Response 400:** `{ "message": "No valid preference fields provided" }`

---

### `POST /api/users/email/send-otp`

**Auth:** `protect`

**Request body:**
```json
{ "newEmail": "new@example.com", "currentPassword": "hunter2" }
```

**Validation:**
1. `currentPassword` must match user's current bcrypt hash
2. `newEmail` must not already exist in the User collection
3. `newEmail` must be a valid email format

**On success:**
- Delete existing `email_change` OTPs for this user
- Create `OTP { email: user.email, otp: <6-digit>, type: 'email_change', pendingPasswordHash: newEmail }`
- Send 6-digit OTP email to `newEmail`
- Return `200 { message: "Verification code sent to new@example.com" }`

**Error responses:**
- `401` — wrong current password
- `400` — email already in use
- `400` — invalid email format

---

### `PUT /api/users/email` (updated)

**Auth:** `protect`

**Request body:**
```json
{ "newEmail": "new@example.com", "currentPassword": "hunter2", "otp": "123456" }
```

**Validation:**
1. Find OTP record: `{ email: user.email, type: 'email_change', otp: <provided> }`
2. Confirm `pendingPasswordHash` (repurposed field) equals `newEmail`
3. Confirm OTP not expired (handled by MongoDB TTL)

**On success:**
- Store `oldEmail` for the security notification
- Update `user.email = newEmail`
- Delete OTP record
- Send security confirmation email to `oldEmail` (non-blocking)
- Return `200 { message: "Email updated successfully" }`

**Error responses:**
- `400` — invalid or expired OTP
- `400` — email already in use (race condition guard)

---

### `POST /api/users/delete/send-otp`

**Auth:** `protect`

**Request body:** none required

**On success:**
- Delete existing `account_delete` OTPs for this user's email
- Create `OTP { email: user.email, otp: <6-digit>, type: 'account_delete' }`
- Send OTP email to user's current email
- Return `200 { message: "Verification code sent to your email" }`

---

### `DELETE /api/users/profile` (updated)

**Auth:** `protect`

**Request body:**
```json
{ "otp": "654321" }
```

**Validation:**
- Find OTP record: `{ email: user.email, type: 'account_delete', otp: <provided> }`

**On success:**
- Delete the user document
- Delete OTP record
- Return `200 { message: "Account deleted successfully" }`

**Error responses:**
- `400` — invalid or expired OTP

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Email failure never blocks registration

*For any* error thrown by `sendEmail` (network error, auth error, quota error, timeout, or any other exception), calling `registerVerify` with valid registration data SHALL still return a 201 response with a valid JWT token.

**Validates: Requirements 1.3, 7.4**

---

### Property 2: Welcome email uses the correct recipient address

*For any* valid email address stored in the User document, the first argument passed to `sendEmail` when sending the welcome email SHALL exactly equal that email address.

**Validates: Requirements 2.3**

---

### Property 3: Personalized greeting contains the registered username

*For any* non-empty username string up to 30 characters, the rendered welcome email body SHALL contain the substring `Welcome, {username}!` where `{username}` is the exact username value.

**Validates: Requirements 2.1**

---

### Property 4: Subject line truncates username at 30 characters

*For any* username string, the welcome email subject line SHALL contain a username prefix of exactly `min(len(username), 30)` characters — never more than 30 and never a different truncation length.

**Validates: Requirements 3.1**

---

### Property 5: RFC 2047 subject encoding is a decodable round-trip

*For any* subject string, encoding it with the `=?utf-8?B?...?=` format and then Base64-decoding the payload SHALL produce the original subject string.

**Validates: Requirements 3.3**

---

### Property 6: CTA href reflects any FRONTEND_URL value

*For any* non-empty string set as the `FRONTEND_URL` environment variable, the `href` attribute of the Primary CTA button in the welcome email SHALL equal that exact string.

**Validates: Requirements 5.3**

---

### Property 7: Email preference gating is respected for all social notification types

*For any* boolean value of a user's email preference field (`friendRecommendation`, `friendRequest`, or `friendRequestAccepted`), the corresponding social action (recommend anime/movie, send friend request, accept friend request) SHALL call `sendEmail` if and only if the preference field is `true`.

**Validates: Requirements 9.3, 9.4, 9.5**

---

### Property 8: Email-preferences update persists only recognized fields

*For any* request body object that is a mix of recognized preference fields and arbitrary extra keys, `PUT /api/users/email-preferences` SHALL only write the recognized fields (`friendRecommendation`, `friendRequest`, `friendRequestAccepted`, `platformUpdates`) to the User document and SHALL discard all unrecognized keys.

**Validates: Requirements 10.3**

---

### Property 9: Invalid OTP always rejects the sensitive operation

*For any* OTP string that does not exactly match the stored OTP for a given user and operation type (`email_change` or `account_delete`), the corresponding endpoint (`PUT /api/users/email` or `DELETE /api/users/profile`) SHALL return a 400 response and SHALL NOT modify the user's account.

**Validates: Requirements 13.7, 14.5**

---

### Property 10: Non-blocking email failures for security notifications

*For any* error thrown by `sendEmail` during a security confirmation email send (after password change or email change), the primary operation SHALL still return a 200 success response to the client.

**Validates: Requirements 15.3**

---

## Error Handling

### Email Send Failures

All email sends in user-facing flows (welcome, security confirmations, OTP delivery, social notifications) are wrapped in `try/catch`. On failure:
- Log the error to the server console with context (e.g., `[welcome-email] send failed for user ${userId}: ${err.message}`)
- Do **not** re-throw — the calling operation continues normally
- Exception: OTP delivery failures for email-change and delete-verify **do** return an error response, since the OTP is the product of those endpoints

### OTP Expiry

OTP documents have a 10-minute TTL via MongoDB's TTL index on `createdAt`. Expired OTPs are simply not found by the lookup query, which returns a 400 with `"Invalid or expired code"`. No explicit expiry check needed in application code.

### Race Conditions

- **Email change**: Before finalizing `PUT /api/users/email`, re-check that `newEmail` isn't already taken (another user may have registered it between the send-otp and confirm steps)
- **Account delete**: No meaningful race condition — the `protect` middleware ensures the user exists at request time

### Backward Compatibility — emailPreferences Default

Existing User documents don't have `emailPreferences`. All preference reads use optional chaining with a truthy default: `user.emailPreferences?.friendRecommendation !== false`. This means existing users receive all notification emails (same behavior as before this feature).

---

## Testing Strategy

### Unit Tests

Use Jest (add as a dev dependency if not already present) with mocking for MongoDB and `sendEmail`.

Key areas for unit tests:
- `buildWelcomeEmailContent(username, frontendUrl)` — snapshot the output HTML for a known username
- Subject truncation logic — edge cases at exactly 30 chars, 31 chars, 0 chars, null
- RFC 2047 encoding / decoding round-trip
- `emailPreferences` gating helper — given preference object and type, returns correct boolean
- OTP field whitelist logic in `updateEmailPreferences`

### Property-Based Tests

Use **fast-check** (JavaScript property-based testing library) added as a dev dependency.

Each property test runs a minimum of **100 iterations**.

Tag format for each test: `// Feature: welcome-email, Property {N}: {property_text}`

```
// Feature: welcome-email, Property 1: Email failure never blocks registration
// Feature: welcome-email, Property 2: Welcome email uses the correct recipient address
// Feature: welcome-email, Property 3: Personalized greeting contains the registered username
// Feature: welcome-email, Property 4: Subject line truncates username at 30 characters
// Feature: welcome-email, Property 5: RFC 2047 subject encoding is a decodable round-trip
// Feature: welcome-email, Property 6: CTA href reflects any FRONTEND_URL value
// Feature: welcome-email, Property 7: Email preference gating is respected for all social notification types
// Feature: welcome-email, Property 8: Email-preferences update persists only recognized fields
// Feature: welcome-email, Property 9: Invalid OTP always rejects the sensitive operation
// Feature: welcome-email, Property 10: Non-blocking email failures for security notifications
```

**Property 1 test sketch:**
```js
fc.assert(fc.asyncProperty(
  fc.oneof(fc.constant(new Error('network')), fc.constant(new Error('auth'))),
  async (error) => {
    mockSendEmail.mockRejectedValue(error);
    const res = await request(app).post('/api/auth/register-verify').send(validPayload);
    expect(res.status).toBe(201);
  }
), { numRuns: 100 });
```

**Property 9 test sketch:**
```js
fc.assert(fc.asyncProperty(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== storedOtp),
  async (wrongOtp) => {
    const res = await request(app)
      .delete('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ otp: wrongOtp });
    expect(res.status).toBe(400);
    const user = await User.findById(userId);
    expect(user).not.toBeNull(); // account not deleted
  }
), { numRuns: 100 });
```

### Integration Tests

- Full `registerVerify` flow → assert `sendEmail` called once with correct address
- Full `googleAuth` new-user flow → assert `sendEmail` called
- Full `googleAuth` existing-user flow → assert `sendEmail` NOT called
- `PUT /api/users/email` happy path: send-otp → confirm with correct OTP → verify email updated, old-email security email sent
- `DELETE /api/users/profile` happy path: send-otp → delete with correct OTP → user gone
- `PUT /api/users/password` → verify security email sent to user's address
