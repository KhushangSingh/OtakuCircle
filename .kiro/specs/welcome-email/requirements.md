# Requirements Document

## Introduction

OtakuCircle is an anime and movie tracking social platform. This spec covers all email-related features for the platform plus a compact Settings UI redesign. The work spans six areas: (1) a branded welcome email sent on registration, (2) an Email Preferences section in Settings with granular notification toggles, (3) a compact redesign of the Settings page layout, (4) OTP-verified email address changes, (5) OTP-verified account deletion, and (6) storage of email preferences on the User model. All email sending uses the existing Gmail REST API infrastructure (`sendEmail` / `buildEmailHtml` helpers in `authController.js`) — no new email dependencies are introduced.

## Glossary

- **Welcome_Email_Service**: Module responsible for composing and dispatching welcome emails to newly registered users.
- **Auth_Controller**: The existing `authController.js` module handling all authentication flows including `registerVerify` and `googleAuth`.
- **User_Controller**: The existing `userController.js` module handling profile, password, email, and deletion endpoints.
- **Gmail_API**: The existing Gmail REST API integration in `authController.js` using `googleapis` and `oAuth2Client`.
- **Registration_Path**: Either the email+password path (`registerVerify`) or the Google Sign-In path (`googleAuth`, first-time user creation only).
- **New_User**: A user whose account has just been created for the first time, regardless of Registration_Path.
- **Primary_CTA**: The single, prominent call-to-action button in the welcome email directing the user to explore the platform.
- **Feature_Highlights**: A concise set of platform capabilities surfaced in the welcome email body.
- **Email_Template**: The branded HTML email produced by the existing `buildEmailHtml(headlineText, bodyText, ctaHtml)` helper.
- **Email_Preferences**: Per-user boolean flags stored in the `emailPreferences` subdocument on the User model controlling which notification emails are sent.
- **Security_Email**: An email sent for account security events (password changed, email changed); always sent regardless of Email_Preferences.
- **OTP**: A 6-digit one-time password stored in the OTP model with a 10-minute TTL.
- **protect**: The existing JWT Bearer token authentication middleware.

## Requirements

### Requirement 1: Trigger Welcome Email on Successful Registration

**User Story:** As a new OtakuCircle user, I want to receive a welcome email immediately after I register, so that I feel confirmed and know what I can do on the platform.

#### Acceptance Criteria

1. WHEN a new user's account is created via the `registerVerify` endpoint, THE Welcome_Email_Service SHALL attempt to send a welcome email to the user's registered email address within 5 seconds before returning the registration response.
2. WHEN a user authenticates via the `googleAuth` endpoint and no user record exists in the database for that Google-linked email address prior to that request, THE Welcome_Email_Service SHALL attempt to send a welcome email to that Google-linked email address within 5 seconds before returning the authentication response.
3. IF the Welcome_Email_Service fails to send the welcome email on either path, THEN THE Auth_Controller SHALL log the failure and return a successful account creation response to the user without blocking account creation.
4. IF a user record already exists in the database for the Google-linked email address at the time of a `googleAuth` request, THEN THE Welcome_Email_Service SHALL NOT send a welcome email.
5. IF the Welcome_Email_Service receives more than one welcome email request for the same email address within the same registration transaction, THEN THE Welcome_Email_Service SHALL send the welcome email exactly once and discard the duplicate request.

### Requirement 2: Personalized Email Content

**User Story:** As a new user, I want the welcome email to address me by name, so that it feels personal rather than generic.

#### Acceptance Criteria

1. THE Welcome_Email_Service SHALL include the user's `username` as the recipient name in the email greeting, rendered as "Welcome, {username}!" where `{username}` is replaced with the exact value stored in the User model at account creation time.
2. WHEN the user's `username` field is empty or unavailable at the time of sending, THE Welcome_Email_Service SHALL substitute the literal string "Otaku" as the greeting name.
3. WHEN a new user account is created, THE Welcome_Email_Service SHALL send the welcome email to the email address stored in the `email` field of the newly created User document.

### Requirement 3: Email Subject and Preview Text

**User Story:** As a new user, I want the email subject to be clear and welcoming, so that I immediately understand what the email is about and open it.

#### Acceptance Criteria

1. THE Welcome_Email_Service SHALL use the subject line `Welcome to OtakuCircle, {username}! 🎌` where `{username}` is replaced with the recipient's registered username (1–30 characters); if the username exceeds 30 characters it SHALL be truncated to 30 characters for the subject line only.
2. WHEN the username field is empty or unavailable, THE Welcome_Email_Service SHALL use the fallback subject line `Welcome to OtakuCircle, Otaku! 🎌`.
3. THE Welcome_Email_Service SHALL encode the subject line using the `=?utf-8?B?...?=` RFC 2047 Base64 format so that it renders correctly in RFC 2047-compliant email clients.

### Requirement 4: Email Body — Value Proposition and Feature Highlights

**User Story:** As a new user, I want the email body to briefly tell me what OtakuCircle offers, so that I am motivated to explore the platform.

#### Acceptance Criteria

1. THE Welcome_Email_Service SHALL include a welcome headline of no more than 80 characters in the email body confirming that the user's account registration is complete.
2. THE Welcome_Email_Service SHALL include a platform description of 10 to 40 words in the email body identifying OtakuCircle as an anime and movie tracking social platform.
3. THE Welcome_Email_Service SHALL include exactly three feature highlight items in the email body covering: (a) tracking anime and movies with watch status and scores, (b) AI-powered personalized recommendations, and (c) connecting with friends and sharing recommendations.
4. THE Welcome_Email_Service SHALL render each feature highlight as a separate block-level element preceded by an icon or bullet marker within the OtakuCircle dark-theme HTML template.

### Requirement 5: Primary Call-to-Action

**User Story:** As a new user, I want a clear next step in the welcome email, so that I know exactly how to get started on the platform.

#### Acceptance Criteria

1. THE Welcome_Email_Service SHALL include exactly one clickable link button in the welcome email serving as the Primary_CTA.
2. THE Welcome_Email_Service SHALL label the Primary_CTA button "Explore OtakuCircle →".
3. WHEN the `FRONTEND_URL` environment variable is set, THE Welcome_Email_Service SHALL set the Primary_CTA button href to the value of `FRONTEND_URL`.
4. IF the `FRONTEND_URL` environment variable is not set or is empty, THEN THE Welcome_Email_Service SHALL set the Primary_CTA button href to `https://otakucircle.vercel.app`.

### Requirement 6: Branding and Visual Consistency

**User Story:** As a user, I want the welcome email to look consistent with other OtakuCircle emails, so that the brand feels cohesive and professional.

#### Acceptance Criteria

1. WHEN the Welcome_Email_Service sends a welcome email, THE Welcome_Email_Service SHALL generate the email HTML by calling the existing `buildEmailHtml(headlineText, bodyText, ctaHtml)` helper function.
2. THE Welcome_Email_Service SHALL NOT introduce new external CSS imports, font-face declarations, or color values in the welcome email HTML beyond those already defined in `buildEmailHtml()`.
3. THE Welcome_Email_Service SHALL pass all welcome-email-specific content (feature highlights, CTA button) via the `ctaHtml` parameter of `buildEmailHtml()` without modifying the `buildEmailHtml()` helper function itself.
4. THE Welcome_Email_Service SHALL produce well-formed HTML that contains no unclosed tags, mismatched elements, or inline style syntax errors.

### Requirement 7: Delivery via Existing Gmail REST API

**User Story:** As a developer, I want the welcome email to use the same Gmail REST API infrastructure as other emails, so that no new email-sending dependencies are introduced.

#### Acceptance Criteria

1. WHEN the Welcome_Email_Service sends a welcome email, THE Welcome_Email_Service SHALL invoke the existing `sendEmail(to, subject, html)` helper function in `authController.js` as the sole email delivery mechanism.
2. THE Welcome_Email_Service SHALL use the `oAuth2Client` instance already configured in `authController.js` for Gmail API authentication.
3. THE Welcome_Email_Service SHALL NOT import or instantiate SMTP transports, third-party transactional email clients (e.g., SendGrid, Mailgun, Postmark), or any npm packages not already present in `package.json` for email delivery.
4. IF `sendEmail()` throws an error or rejects its promise during a welcome email send attempt, THEN THE Auth_Controller SHALL catch the error, log it to the server console, and proceed with returning the account creation success response.

### Requirement 8: No Duplicate Welcome Emails

**User Story:** As a user, I want to receive only one welcome email per account, so that I am not spammed if I sign in via both Google and password.

#### Acceptance Criteria

1. WHEN a new user account is created via the `registerVerify` endpoint for the first time, THE Welcome_Email_Service SHALL send exactly one welcome email to that user's email address.
2. WHEN a new user account is created via the `googleAuth` endpoint for the first time, THE Welcome_Email_Service SHALL send exactly one welcome email to that user's Google-linked email address.
3. WHEN an existing user authenticates via the `googleAuth` endpoint and their `authProvider` is upgraded from `local` to `both`, THE Welcome_Email_Service SHALL NOT send a welcome email.
4. WHEN an existing user's account is linked to a password via the `confirmPasswordLink` endpoint, THE Welcome_Email_Service SHALL NOT send a welcome email.

### Requirement 9: Email Preferences Storage on User Model

**User Story:** As a developer, I want email notification preferences stored per-user on the User model, so that the backend can gate notification emails based on user choice.

#### Acceptance Criteria

1. THE User model SHALL include an `emailPreferences` subdocument with the following boolean fields, all defaulting to `true`: `friendRecommendation`, `friendRequest`, `friendRequestAccepted`, `platformUpdates`.
2. Security-triggered emails (password changed, email changed) SHALL NOT be stored in `emailPreferences` and SHALL always be sent regardless of any user preference.
3. WHEN `recommendAnime` or `recommendMovie` in `socialController.js` sends a recommendation, THE system SHALL check the recipient's `emailPreferences.friendRecommendation` field and only send the notification email if the value is `true`.
4. WHEN `sendFriendRequest` in `socialController.js` sends a friend request, THE system SHALL check the recipient's `emailPreferences.friendRequest` field and only send the notification email if the value is `true`.
5. WHEN `acceptFriendRequest` in `socialController.js` notifies the original sender, THE system SHALL check the sender's `emailPreferences.friendRequestAccepted` field and only send the notification email if the value is `true`.

### Requirement 10: Email Preferences API

**User Story:** As a user, I want to be able to update my email notification preferences via an API endpoint, so that the Settings UI can persist my choices.

#### Acceptance Criteria

1. THE system SHALL expose a `PUT /api/users/email-preferences` endpoint protected by the `protect` middleware.
2. WHEN a valid request is received, THE endpoint SHALL update only the recognized `emailPreferences` fields (`friendRecommendation`, `friendRequest`, `friendRequestAccepted`, `platformUpdates`) on the authenticated user's document and return the updated preferences object.
3. WHEN an unrecognized field is included in the request body, THE endpoint SHALL ignore the unrecognized field and not write it to the database.
4. WHEN the request body is empty or contains no recognized fields, THE endpoint SHALL return a 400 response with a descriptive error message.

### Requirement 11: Email Preferences UI in Settings

**User Story:** As a user, I want a dedicated Email Preferences section in my account settings, so that I can control which notification emails I receive without leaving the platform.

#### Acceptance Criteria

1. THE Settings page SHALL include an "Email Preferences" section rendered below the existing account fields (Username, Email, Password).
2. THE Email Preferences section SHALL display three independently toggleable switches for: "Friend sends a recommendation", "Friend request received", "Friend request accepted".
3. THE Email Preferences section SHALL display one independently toggleable switch for: "OtakuCircle announcements and feature updates" (`platformUpdates`).
4. THE Email Preferences section SHALL display two locked (non-toggleable) indicators for security emails: "Password changed" and "Email address changed", each visually marked as "Always on".
5. WHEN a user toggles any preference switch, THE Settings page SHALL immediately call `PUT /api/users/email-preferences` with the updated value and display a success or error toast notification.
6. WHEN the Settings page loads, THE Email Preferences section SHALL initialize toggle states from the authenticated user's `emailPreferences` values fetched from the server.

### Requirement 12: Compact Settings UI Layout

**User Story:** As a user, I want the Settings page to feel information-dense and modern, so that I can see all my settings without excessive scrolling.

#### Acceptance Criteria

1. THE Settings page SHALL use card padding of `p-4` on mobile and `p-6` on desktop (`md:p-6`) instead of the current `p-6`/`md:p-12`.
2. THE Settings page SHALL use input field padding of `py-2.5 px-3` instead of the current `py-4 px-5`.
3. THE Settings page SHALL use row item padding of `py-3 px-4` instead of the current `p-6` for display rows showing current field values.
4. THE Settings page SHALL use `text-sm` for field value text and `text-xs` for section labels instead of the current `text-lg` for values.
5. THE Settings page SHALL preserve all existing functional sections (Username, Email, Password, Danger Zone) and their edit-in-place behavior.
6. THE Settings page SHALL preserve the existing toast notification system for success and error feedback.

### Requirement 13: OTP-Verified Email Address Change

**User Story:** As a user, I want email address changes to require OTP verification on the new address, so that I cannot accidentally or maliciously change my email to one I don't own.

#### Acceptance Criteria

1. THE system SHALL expose a `POST /api/users/email/send-otp` endpoint protected by the `protect` middleware, which accepts `{ newEmail, currentPassword }` in the request body.
2. WHEN `POST /api/users/email/send-otp` is called with a valid current password and an unregistered `newEmail`, THE system SHALL create an OTP record with `type: 'email_change'`, store the `newEmail` in the OTP record, send a 6-digit OTP to `newEmail`, and return a 200 response.
3. WHEN `POST /api/users/email/send-otp` is called with an incorrect current password, THE system SHALL return a 401 response.
4. WHEN `POST /api/users/email/send-otp` is called and `newEmail` is already registered to another user, THE system SHALL return a 400 response.
5. THE existing `PUT /api/users/email` endpoint SHALL be updated to accept `{ newEmail, currentPassword, otp }` and SHALL verify the OTP before updating the email address.
6. WHEN `PUT /api/users/email` is called with a valid OTP that matches the `newEmail` and is not expired, THE system SHALL update the user's email, delete the OTP record, send a security confirmation email to the OLD email address, and return a 200 response.
7. WHEN `PUT /api/users/email` is called with an invalid or expired OTP, THE system SHALL return a 400 response.
8. THE Settings page email-change form SHALL implement a 2-step UI: step 1 collects `newEmail` and `currentPassword` and calls the send-OTP endpoint; step 2 shows an OTP input and calls the update endpoint.

### Requirement 14: OTP-Verified Account Deletion

**User Story:** As a user, I want account deletion to require email OTP verification, so that accidental clicks or unauthorized access cannot delete my account.

#### Acceptance Criteria

1. THE system SHALL expose a `POST /api/users/delete/send-otp` endpoint protected by the `protect` middleware, which sends a 6-digit OTP to the authenticated user's current email address.
2. WHEN `POST /api/users/delete/send-otp` is called, THE system SHALL create an OTP record with `type: 'account_delete'` and send the OTP to the user's email, then return a 200 response.
3. THE existing `DELETE /api/users/profile` endpoint SHALL be updated to accept `{ otp }` in the request body and SHALL verify the OTP before deleting the account.
4. WHEN `DELETE /api/users/profile` is called with a valid OTP that is not expired, THE system SHALL delete the user's account and return a 200 response.
5. WHEN `DELETE /api/users/profile` is called with an invalid or expired OTP, THE system SHALL return a 400 response without deleting the account.
6. THE Settings page deletion flow SHALL implement a 3-step modal: step 1 is a confirmation prompt; step 2 informs the user that an OTP was sent to their email and shows an OTP input; step 3 is the final deletion call.

### Requirement 15: Security Confirmation Emails

**User Story:** As a user, I want to receive a security email when my password or email address is changed, so that I can detect unauthorized account changes.

#### Acceptance Criteria

1. WHEN a user successfully changes their password via `PUT /api/users/password`, THE system SHALL send a security confirmation email to the user's current email address notifying them of the change.
2. WHEN a user successfully changes their email address via `PUT /api/users/email`, THE system SHALL send a security confirmation email to the OLD email address notifying them of the change and what the new address is.
3. IF sending a security confirmation email fails, THE system SHALL log the failure and still return a successful response to the user — the security email MUST NOT block the operation.
4. Security confirmation emails SHALL be sent using the existing `sendEmail` and `buildEmailHtml` helpers.
