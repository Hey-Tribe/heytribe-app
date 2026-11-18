# HeyTribe iPhone app (Expo): App Store Connect setup

App Store Connect app: HeyTribe, Apple ID 6836027831, bundle `app.heytribe.ios`, SKU `heytribe-ios`, team 4395SDMFHT.
Builds: EAS (`@squared-away-labs/heytribe`), `eas build -p ios --profile production`, then `eas submit -p ios`.

## Filled in (Nov 18, 2026)
- Subtitle: Family calendar, chores, lists. Category: Productivity, secondary Lifestyle.
- Content rights: no third-party content. Age rating: 4+ (all answers No/None).
- Price: free, 174 countries (China mainland left out: it needs an ICP filing and security assessment).
- Subscriptions (group "HeyTribe Premium"): `app.heytribe.premium.monthly` $4.99 and `app.heytribe.premium.yearly` $39.99,
  2 weeks free intro offer, all countries.
- App Store Server Notifications (production and sandbox): https://app.heytribe.app/api/apple-notifications
- App privacy (not published yet): Name, Email, Health, Other user content, User ID, Purchases. All for app functionality,
  linked to the user, none used for tracking. The native app has no analytics or crash reporting.
- Version 1.0: description, promotional text, keywords, support URL (contact.html), marketing URL, copyright
  "2026 Squared Away Labs LLC", review notes, manual release, build 2, iPhone 6.3" and iPad 13" screenshots
  (made from the app with the sample family).

## Still needed before "Add for Review"
- App Review contact: first and last name, phone, email.
- Decide on a review login (Sign-in required is off; reviewers can use the sample family or sign up).
- A screenshot of the Premium screen on each subscription (Review Information), taken from the TestFlight build.
- Publish the App Privacy answers.
- `APNS_KEY_P8` in Vercel for reminders.
