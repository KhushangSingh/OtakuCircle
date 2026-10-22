# Implementation Plan: Welcome Email, Email Preferences & Settings Overhaul

## Overview

This plan implements six interrelated features across the server and client: a shared email utilities module, welcome email on registration, email preferences storage and API, OTP-verified email change and account deletion, security confirmation emails, and a compact Settings page redesign with the new Email Preferences UI. Tasks are ordered to build shared infrastructure first, then backend features, then frontend.

## Tasks

- [x] 1. Extract shared email utilities module
  - [x] 1.1 Create `server/utils/emailUtils.js` with exported `sendEmail`, `buildEmailHtml`, and `oAuth2Client`
    - Move `oAuth2Client` initialization, `sendEmail`, and `buildEmailHtml` verbatim from `authController.js` into the new file
    - Export all three from `emailUtils.js`
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 1.2 Update `authController.js` to import from `emailUtils.js`
    - Replace the inline definitions of `oAuth2Client`, `sendEmail`, and `buildEmailHtml` with `require('../utils/emailUtils')`
    - Verify all existing auth flows (`sendRegisterOtp`, `sendPasswordLinkEmail`, `sendOtpEmail`) still call `sendEmail` and `buildEmailHtml` via the imported references
    - _Requirements: 7.1, 7.2_

- [x] 2. Update data models
  - [x] 2.1 Add `emailPreferences` subdocument to `server/models/User.js`
    - Add four boolean fields (`friendRecommendation`, `friendRequest`, `friendRequestAccepted`, `platformUpdates`) each defaulting to `true`
    - _Requirements: 9.1_
  - [x] 2.2 Add `email_change` and `account_delete` to OTP type enum in `server/models/OTP.js`
    - Extend the `type` enum to `['register', 'reset', 'link', 'email_change', 'account_delete']`
    - _Requirements: 13.2, 14.2_

- [x] 3. Implement welcome email
  - [x] 3.1 Add `sendWelcomeEmail(user)` function to `server/controllers/authController.js`
    - Import `sendEmail` and `buildEmailHtml` from `emailUtils.js`
    - Truncate username to 30 chars for the subject; fall back to `"Otaku"` when username is empty
    - Encode subject using `=?utf-8?B?...?=` RFC 2047 Base64 format
    - Compose `ctaHtml` with the three feature-highlight blocks (📺 track, ✨ AI recs, 👥 connect) and the "Explore OtakuCircle →" CTA button pointing to `FRONTEND_URL` (fallback: `https://otakucircle.vercel.app`)
    - Call `buildEmailHtml(headlineText, bodyText, ctaHtml)` — do not modify `buildEmailHtml` itself
    - Wrap the `sendEmail` call in `try/catch`; log but do not re-throw on failure
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.4_
  - [ ]* 3.2 Write property tests for `sendWelcomeEmail` (Properties 1–6)
    - Install `fast-check` as a dev dependency in `server/`
    - **Property 1: Email failure never blocks registration** — mock `sendEmail` to reject; assert `registerVerify` still returns 201
    - **Property 2: Welcome email uses the correct recipient address** — for any valid email, assert first arg to `sendEmail` equals `user.email`
    - **Property 3: Personalized greeting contains the registered username** — for any username ≤30 chars, assert rendered HTML contains `Welcome, {username}!`
    - **Property 4: Subject truncates username at 30 characters** — for any username, assert subject contains `min(len, 30)` chars of username
    - **Property 5: RFC 2047 encoding is a decodable round-trip** — for any subject string, Base64-decode the `=?utf-8?B?...?=` payload and assert it equals the original
    - **Property 6: CTA href reflects any FRONTEND_URL value** — for any non-empty `FRONTEND_URL`, assert the rendered `href` equals that value
    - Tag each test: `// Feature: welcome-email, Property N: ...`
    - _Requirements: 1.3, 2.1, 2.3, 3.1, 3.3, 5.3_
  - [x] 3.3 Call `sendWelcomeEmail` in `registerVerify` after user creation (non-blocking)
    - Fire-and-forget: `sendWelcomeEmail(user).catch(err => console.error('[welcome-email] registerVerify send failed:', err))`
    - _Requirements: 1.1, 8.1_
  - [x] 3.4 Call `sendWelcomeEmail` in `googleAuth` for new-user branch only (non-blocking)
    - Place the call inside the `else` block that creates a new user; do not call it in the existing-user branch or the `authProvider` upgrade branch
    - _Requirements: 1.2, 1.4, 8.2, 8.3_

- [x] 4. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement email preferences API
  - [x] 5.1 Add `updateEmailPreferences` controller function to `server/controllers/userController.js`
    - Import `{ sendEmail, buildEmailHtml }` from `../utils/emailUtils`
    - Accept `PUT /api/users/email-preferences` (protected)
    - Whitelist recognized keys: `friendRecommendation`, `friendRequest`, `friendRequestAccepted`, `platformUpdates`; discard all others
    - Return 400 `{ message: 'No valid preference fields provided' }` if no recognized key present
    - Update only the whitelisted keys on `user.emailPreferences` via `$set`; return the full updated `emailPreferences` object
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [ ]* 5.2 Write property test for email preferences update (Property 8)
    - **Property 8: Email-preferences update persists only recognized fields** — for any object mixing recognized and arbitrary keys, assert only the four recognized fields are written to the DB
    - Tag: `// Feature: welcome-email, Property 8: ...`
    - _Requirements: 10.3_

- [x] 6. Add email preference gating to social notifications
  - [x] 6.1 Gate `recommendAnime` in `socialController.js` behind `emailPreferences.friendRecommendation`
    - After saving the recommendation, check `friend.emailPreferences?.friendRecommendation !== false` before calling `sendEmail`
    - Import `sendEmail` and `buildEmailHtml` from `../utils/emailUtils`
    - _Requirements: 9.3_
  - [x] 6.2 Gate `recommendMovie` in `socialController.js` behind `emailPreferences.friendRecommendation`
    - Same pattern as 6.1
    - _Requirements: 9.3_
  - [x] 6.3 Gate `sendFriendRequest` in `socialController.js` behind recipient's `emailPreferences.friendRequest`
    - Check `recipient.emailPreferences?.friendRequest !== false` before sending email notification
    - _Requirements: 9.4_
  - [x] 6.4 Gate `acceptFriendRequest` in `socialController.js` behind sender's `emailPreferences.friendRequestAccepted`
    - Fetch the original sender's user document and check `sender.emailPreferences?.friendRequestAccepted !== false` before sending the acceptance email
    - _Requirements: 9.5_
  - [ ]* 6.5 Write property test for email preference gating (Property 7)
    - **Property 7: Email preference gating is respected for all social notification types** — for any boolean preference value, assert `sendEmail` is called iff the preference is `true`
    - Tag: `// Feature: welcome-email, Property 7: ...`
    - _Requirements: 9.3, 9.4, 9.5_

- [x] 7. Implement OTP-verified email change (backend)
  - [x] 7.1 Add `sendEmailChangeOtp` handler to `userController.js`
    - `POST /api/users/email/send-otp` (protected)
    - Validate `newEmail` format; return 400 if invalid
    - Check `currentPassword` against bcrypt hash; return 401 if wrong
    - Check `newEmail` not already registered; return 400 if taken
    - Delete existing `email_change` OTPs for this user; create new OTP with `type: 'email_change'`, store `newEmail` in `pendingPasswordHash` field
    - Send 6-digit OTP email to `newEmail` via `sendEmail`; return 200 on success
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - [x] 7.2 Update `changeEmail` in `userController.js` to require and verify OTP
    - Accept `{ newEmail, currentPassword, otp }` in request body
    - Find OTP record `{ email: user.email, type: 'email_change', otp }` and verify `pendingPasswordHash === newEmail`
    - Return 400 on invalid/expired OTP
    - On success: store `oldEmail`, update `user.email = newEmail`, delete OTP record, send security confirmation email to `oldEmail` (non-blocking), return 200
    - Race-condition guard: re-check `newEmail` uniqueness before finalizing the update
    - _Requirements: 13.5, 13.6, 13.7, 15.2, 15.3_
  - [ ]* 7.3 Write property test for OTP validation (Property 9 — email_change path)
    - **Property 9: Invalid OTP always rejects the sensitive operation** — for any OTP string that doesn't match the stored OTP, assert `PUT /api/users/email` returns 400 and user email is unchanged
    - Tag: `// Feature: welcome-email, Property 9: ...`
    - _Requirements: 13.7_

- [x] 8. Implement OTP-verified account deletion (backend)
  - [x] 8.1 Add `sendDeleteOtp` handler to `userController.js`
    - `POST /api/users/delete/send-otp` (protected)
    - Delete existing `account_delete` OTPs for this user; create new OTP with `type: 'account_delete'`
    - Send OTP to `user.email` via `sendEmail`; return 200 on success
    - _Requirements: 14.1, 14.2_
  - [x] 8.2 Update `deleteUser` in `userController.js` to require and verify OTP
    - Accept `{ otp }` in request body
    - Find OTP record `{ email: user.email, type: 'account_delete', otp }`; return 400 if not found
    - On success: delete user document, delete OTP record, return 200
    - _Requirements: 14.3, 14.4, 14.5_
  - [ ]* 8.3 Write property test for OTP validation (Property 9 — account_delete path)
    - **Property 9: Invalid OTP always rejects the sensitive operation** — for any non-matching OTP, assert `DELETE /api/users/profile` returns 400 and user still exists in DB
    - Tag: `// Feature: welcome-email, Property 9: ...`
    - _Requirements: 14.5_

- [x] 9. Implement security confirmation emails
  - [x] 9.1 Send password-changed security email in `changePassword` (`userController.js`)
    - After `user.save()`, fire-and-forget `sendEmail` with the "Password changed successfully" subject/body using `buildEmailHtml`; catch and log errors
    - _Requirements: 15.1, 15.3, 15.4_
  - [ ]* 9.2 Write property test for non-blocking security email failures (Property 10)
    - **Property 10: Non-blocking email failures for security notifications** — mock `sendEmail` to reject; assert `PUT /api/users/password` still returns 200
    - Tag: `// Feature: welcome-email, Property 10: ...`
    - _Requirements: 15.3_

- [x] 10. Register new endpoints in `server/server.js`
  - [x] 10.1 Add three new user routes and update existing ones
    - `PUT  /api/users/email-preferences` → `updateEmailPreferences` (protected)
    - `POST /api/users/email/send-otp`    → `sendEmailChangeOtp` (protected)
    - `POST /api/users/delete/send-otp`   → `sendDeleteOtp` (protected)
    - Update existing `PUT /api/users/email` and `DELETE /api/users/profile` routes to use updated handlers
    - Export `updateEmailPreferences`, `sendEmailChangeOtp`, `sendDeleteOtp` from `userController.js`
    - _Requirements: 10.1, 13.1, 14.1_

- [x] 11. Checkpoint — Ensure all backend tests pass, ask the user if questions arise.

- [x] 12. Compact Settings UI redesign
  - [x] 12.1 Apply compact layout tokens throughout `client/src/pages/Settings.jsx`
    - Card padding: `p-4 md:p-6` (was `p-6 md:p-12`)
    - Input padding: `py-2.5 px-3` (was `py-4 px-5`)
    - Display row padding: `py-3 px-4` (was `p-6`)
    - Field value text: `text-sm` (was `text-lg`); section icons: `size={20}` (was `size={32}`)
    - Button padding: `px-4 py-2` (was `px-6 py-3`)
    - Card border radius: `rounded-2xl` (was `rounded-[32px]`)
    - Space between sections: `space-y-6` (was `space-y-8 md:space-y-12`)
    - Preserve all existing functional sections and toast notification system
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 13. 2-step email change UI in Settings
  - [x] 13.1 Add `emailStep` state (1 | 2) and update `emailData` shape to `{ new, currentPassword, otp }` in `Settings.jsx`
    - _Requirements: 13.8_
  - [x] 13.2 Implement step-1 email change form: collect `newEmail` + `currentPassword`, call `POST /api/users/email/send-otp` on submit
    - Show loading state during request; display success or error toast
    - On success, advance `emailStep` to 2
    - _Requirements: 13.1, 13.8_
  - [x] 13.3 Implement step-2 email change form: show "Code sent to {email}" hint, collect OTP, call `PUT /api/users/email` on confirm
    - On success, update local `user.email` state, reset `editingField` and `emailStep`, show success toast
    - _Requirements: 13.5, 13.6, 13.8_

- [x] 14. 3-step account deletion modal in Settings
  - [x] 14.1 Add `deleteStep` state (1 | 2 | 3) and `deleteOtp` string state to `Settings.jsx`
    - Replace `showDeleteAccountConfirm` boolean with `deleteStep` (0 = closed)
    - _Requirements: 14.6_
  - [x] 14.2 Implement step-1 deletion modal: confirmation prompt with "Send Verification Code" button
    - On click, call `POST /api/users/delete/send-otp`; advance to step 2 on success
    - _Requirements: 14.1, 14.6_
  - [x] 14.3 Implement step-2 deletion modal: OTP input with "Confirm Delete" button calling `DELETE /api/users/profile`
    - On success, clear localStorage and navigate to `/`
    - On error, show error toast and remain on step 2
    - _Requirements: 14.3, 14.4, 14.6_

- [x] 15. Email Preferences section in Settings
  - [x] 15.1 Add `emailPrefs` state initialized from `user.emailPreferences` on page load in `Settings.jsx`
    - _Requirements: 11.6_
  - [x] 15.2 Build the Email Preferences card component inline in `Settings.jsx`
    - Three toggleable switches: "Friend sends a recommendation" (`friendRecommendation`), "Friend request received" (`friendRequest`), "Friend request accepted" (`friendRequestAccepted`)
    - One toggleable switch: "OtakuCircle announcements" (`platformUpdates`)
    - Two locked indicators styled with `disabled` + `opacity-50`: "Password changed" and "Email address changed", each labeled "Always on"
    - Use `<input type="checkbox" role="switch">` styled as pill toggle: `w-10 h-5 rounded-full bg-zinc-700 checked:bg-indigo-500 transition-colors`
    - Place section below the Password row, above the Danger Zone card
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [x] 15.3 Wire each toggle to `PUT /api/users/email-preferences` on change
    - On toggle flip, immediately call the API with the changed preference field; update local `emailPrefs` state optimistically; show success or error toast
    - _Requirements: 11.5_

- [x] 16. Final checkpoint — Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Subtasks 3.2, 5.2, 6.5, 7.3, 8.3, 9.2 require `fast-check` installed as a dev dependency in `server/`
- `pendingPasswordHash` in OTP is repurposed to store `newEmail` for `email_change` type OTPs — no schema migration needed
- All `sendEmail` calls outside OTP delivery are fire-and-forget; only OTP sends return errors to the client
- Backward-compatible `emailPreferences` reads always use `?.fieldName !== false` (truthy default for existing users)
- Security emails (password changed, email changed) are never gated by `emailPreferences`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "5.1", "7.1", "8.1", "9.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "5.2", "6.1", "6.2", "6.3", "6.4", "7.2", "8.2"] },
    { "id": 4, "tasks": ["6.5", "7.3", "8.3", "9.2", "10.1"] },
    { "id": 5, "tasks": ["12.1", "13.1", "14.1", "15.1"] },
    { "id": 6, "tasks": ["13.2", "13.3", "14.2", "14.3", "15.2"] },
    { "id": 7, "tasks": ["15.3"] }
  ]
}
```
