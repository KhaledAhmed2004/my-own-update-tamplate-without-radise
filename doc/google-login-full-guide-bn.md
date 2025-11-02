# গুগল লগইন (Google OAuth 2.0) – ফুল গাইড

এই ডকুমেন্টে আপনার প্রজেক্টে গুগল লগইন কীভাবে কাজ করে, কোথায় কী কনফিগার আছে, ফ্রন্টএন্ডে কীভাবে ইমপ্লিমেন্ট করবেন, কেন এই ডিজাইন নেওয়া হয়েছে—সবকিছু ধাপে ধাপে ব্যাখ্যা করা হয়েছে। শেষে কিছু নিরাপত্তা ও আর্কিটেকচারাল ইমপ্রুভমেন্টের প্রস্তাবও দেওয়া আছে।

## কীভাবে কাজ করে (হাই-লেভেল ফ্লো)
- ইউজার `Continue with Google` বাটনে ক্লিক করে।
- ব্রাউজার ব্যাকএন্ড এন্ডপয়েন্টে রিডাইরেক্ট হয়: `GET /api/v1/auth/google` (ঐচ্ছিক `role` কুয়েরি নিয়ে)।
- গুগল কনসেন্ট স্ক্রিনে ইউজার অনুমতি দেয়; গুগল ব্যাকএন্ডের `callback` এ পাঠায়: `GET /api/v1/auth/google/callback`।
- ব্যাকএন্ডে Passport Google Strategy ইউজারের প্রোফাইল পায়; ইমেইল দিয়ে ইউজার মেলানো/নতুন ইউজার তৈরি করে; ব্লক/ডিলিটেড স্ট্যাটাস চেক করে।
- ব্যাকএন্ড JWT `access token` তৈরি করে এবং ফ্রন্টএন্ডে সাকসেস পেজে রিডাইরেক্ট করে টোকেনসহ।
- ফ্রন্টএন্ড টোকেন পড়ে স্টোরে/স্টোরেজে সেট করে; এরপর প্রোটেক্টেড API কল করতে পারে।

## ব্যাকএন্ড সেটআপ (এই প্রজেক্টে কী আছে)

**মূল ফাইল/পাথ**
- Strategy রেজিস্টার: `src/app/modules/auth/config/passport.ts`
- রুট: `src/app/modules/auth/auth.route.ts`
- কলব্যাক কন্ট্রোলার: `src/app/modules/auth/auth.controller.ts`
- টোকেন তৈরি: `src/app/modules/auth/auth.service.ts` → `googleLoginToDB`
- সার্ভার বুটে স্ট্র্যাটেজি লোড: `src/app.ts` → `import './config/passport'` (ডিস্টে: `dist/config/passport.js`)

**ENV কনফিগ (ফাইল: `src/config/index.ts`)**
```
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=https://<your-backend-domain>/api/v1/auth/google/callback

JWT_SECRET=<your_jwt_secret>
JWT_EXPIRE_IN=1d
JWT_REFRESH_SECRET=<your_refresh_secret>
JWT_REFRESH_EXPIRE_IN=7d
```
- `GOOGLE_REDIRECT_URI` অবশ্যই গুগল কনসোলের Authorized redirect URI এর সঙ্গে মিলতে হবে।
- JWT সেটিংস টোকেন ইস্যুতে ব্যবহৃত হয়।

**Passport Google Strategy (রেফারেন্স)**
- ফাইল: `src/app/modules/auth/config/passport.ts`
- কনফিগ: `clientID`, `clientSecret`, `callbackURL` `.env` থেকে আসে।
- লজিক:
  - ইমেইল না পেলে এরর।
  - `req.query.role` থেকে ফ্রন্টএন্ডের রোল নেয়ার সাপোর্ট আছে (ডিফল্ট `'user'`).
  - ইমেইল মিলে গেলে: ব্লক/ডিলিটেড হলে এরর; `googleId` লিংক না থাকলে লিংক করা।
  - না মিললে: নতুন ইউজার তৈরি, `verified: true`, `googleId` সেভ।

**রাউটিং**
- `GET /api/v1/auth/google` → Google OAuth শুরু
- `GET /api/v1/auth/google/callback` → গুগল থেকে ফিরে আসে; Passport `session: false` দিয়ে অথেন্টিকেট; তারপর কন্ট্রোলার রিডাইরেক্ট করে।

**কলব্যাক কন্ট্রোলার** (`auth.controller.ts`)
- ইউজার অবজেক্ট না থাকলে এরর পেজে রিডাইরেক্ট।
- `AuthService.googleLoginToDB(user)` কল করে `access token` তৈরি।
- সাকসেস পেজে রিডাইরেক্ট: `https://<frontend-domain>/success?token=<jwt>`
- এরর হলে: `https://<frontend-domain>/error?message=<...>`

## গুগল কনসোল সেটআপ
1. Google Cloud Console → `APIs & Services` → `OAuth consent screen` সেটআপ করুন (অ্যাপ নাম, সাপোর্ট ইমেইল, স্কোপ `profile`, `email`).
2. `Credentials` → `Create credentials` → `OAuth client ID` → Application type `Web application`।
3. `Authorized redirect URIs` এ যুক্ত করুন: `https://<your-backend-domain>/api/v1/auth/google/callback`।
4. তৈরি হওয়া `Client ID` এবং `Client Secret` `.env` এ দিন।

## ফ্রন্টএন্ড ইমপ্লিমেন্টেশন

**লগইন বাটন ক্লিক**
```ts
// উদাহরণ: React (SPA)
const BASE_URL = import.meta.env.VITE_API_BASE_URL; // e.g. https://api.example.com

function GoogleLoginButton({ role = 'user' }: { role?: 'user' | 'TASKER' | 'POSTER' }) {
  const handleClick = () => {
    const url = `${BASE_URL}/api/v1/auth/google?role=${encodeURIComponent(role)}`;
    window.location.href = url;
  };
  return <button onClick={handleClick}>Continue with Google</button>;
}
```

**সাকসেস/এরর পেজে টোকেন/মেসেজ পড়া**
```ts
// Success.tsx
import { useEffect } from 'react';

export default function Success() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('accessToken', token);
      // TODO: navigate to dashboard/home
    }
  }, []);

  return <div>Google login successful. Redirecting...</div>;
}

// Error.tsx
export default function ErrorPage() {
  const params = new URLSearchParams(window.location.search);
  const message = params.get('message') || 'Unknown error';
  return <div>Login failed: {message}</div>;
}
```

**টোকেন ব্যবহার করে API কল**
```ts
const token = localStorage.getItem('accessToken');
const res = await fetch(`${BASE_URL}/api/v1/user/me`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

**রিফ্রেশ টোকেন (ঐচ্ছিক)**
- ব্যাকএন্ডে `POST /api/v1/auth/refresh-token` আছে।
- আপনার অ্যাপে অ্যাক্সেস টোকেন এক্সপায়ার হলে রিফ্রেশ টোকেন দিয়ে নতুন টোকেন নিন।

## কেন এই ডিজাইন
- Server-side OAuth ব্যবহারে `client secret` কখনো ক্লায়েন্টে যায় না—নিরাপদ।
- Passport স্ট্র্যাটেজি battle-tested; প্রোফাইল থেকে ইমেইল আইডেন্টিটি হিসেবে ব্যবহার করলে ইউনিক ইউজার ম্যানেজ সহজ হয়।
- ইমেইল-ভিত্তিক link বা নতুন ইউজার তৈরি—UX friction কমায়।
- JWT ব্যবহার করলে API stateless থাকে; স্কেলিং সহজ হয়।
- Redirect flow SPA-র সঙ্গে সিম্পলভাবে ফিট করে; OAuth implicit complexities কমে।

## সিকিউরিটি/আর্কিটেকচারাল ইমপ্রুভমেন্ট (প্রস্তাব)
1. `FRONTEND_URL` হার্ডকোড বাদ দিন
   - বর্তমানে `auth.controller.ts` এ Cloudflare URL হার্ডকোড আছে। `.env` এ `FRONTEND_URL` যোগ করে সেটি ব্যবহার করুন।
   - উদাহরণ:
   ```ts
   // .env
   FRONTEND_URL=https://your-frontend.example.com

   // src/config/index.ts
   frontend_url: process.env.FRONTEND_URL

   // auth.controller.ts
   const successUrl = `${config.frontend_url}/success?token=${result.createToken}`;
   const errorUrl = `${config.frontend_url}/error?message=${encodeURIComponent(errorMessage)}`;
   return res.redirect(successUrl);
   ```

2. `state` প্যারামিটার ব্যবহার করে role/redirect সুরক্ষিতভাবে পাঠান
   - Query দিয়ে `role` নেওয়া tampering-prone। `state` এ Base64 JSON পাঠান; ব্যাকএন্ডে verify করুন।
   - রুট:
   ```ts
   // auth.route.ts
   router.get('/google', (req, res, next) => {
     const role = (req.query.role as string) || 'user';
     const state = Buffer.from(JSON.stringify({ role })).toString('base64');
     passport.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next);
   });
   ```
   - Strategy-তে `req.query.state` ডিকোড করে validate করুন (ডিস্ট ভার্সনে আংশিক সাপোর্ট আছে)।

3. অ্যাক্সেস টোকেন Query String-এ না পাঠিয়ে HTTP-only Cookie এ সেট করুন
   - Query দিয়ে টোকেন পাঠানো ব্রাউজার হিস্ট্রি/লগ/রেফারার-এ লিক হতে পারে।
   - বিকল্প: callback-এ `res.cookie('accessToken', token, { httpOnly, secure, sameSite })` সেট করুন এবং ফ্রন্টএন্ডে কুকি ব্যবহার করুন।

4. Refresh Token কুকি ও রোটেশন
   - `refreshToken` কে HTTP-only কুকিতে রাখুন; রোটেট করুন; অবৈধ হলে লগআউট করুন।

5. CSRF/Replay Protections
   - `state`-এ `nonce`/`csrfToken` যুক্ত করুন এবং সার্ভারে যাচাই করুন।

6. CORS কনফিগ `.env`-ড্রিভেন করুন
   - `src/app.ts` এর `allowedOrigins` অ্যারে `.env`/কনফিগ থেকে লোড করুন।

7. Error messages স্ট্যান্ডার্ডাইজ করুন এবং ইউজার-ফেসিং টেক্সট লোকালাইজ করুন

## টেস্টিং/ভেরিফিকেশন
- Postman/HTTP ক্লায়েন্টে `GET /api/v1/auth/google` হিট করলে গুগলে রিডাইরেক্ট হওয়া উচিত।
- Callback ঠিকঠাক সেট না থাকলে 4xx দেখা যাবে—গুগল কনসোলে URI মিলিয়ে নিন।
- সফল লগইনের পরে সাকসেস পেজে `token` দেখা যাবে; API কল করে `Authorization: Bearer <token>` দিয়ে ভেরিফাই করুন।
- স্ক্রিপ্ট: `scripts/generate-postman-collection.js` এ `/google`, `/google/callback` পাবলিক এন্ডপয়েন্ট হিসেবে সেট করা আছে।

## কুইক চেকলিস্ট
- [ ] `.env` এ Google OAuth ক্রেডেনশিয়াল ঠিক আছে
- [ ] Google Console → Authorized redirect URI মিলছে
- [ ] `src/app.ts` CORS-এ আপনার ফ্রন্টএন্ড ডোমেইন আছে
- [ ] `/api/v1/auth/google` রুটে হিট করলে গুগলে যায়
- [ ] `/api/v1/auth/google/callback` থেকে টোকেন জেনারেট হয়
- [ ] ফ্রন্টএন্ডে টোকেন সেভ হয়ে API হিট হচ্ছে

## FAQ
- ইমেইল ছাড়া প্রোফাইল এলে কী হবে? → স্ট্র্যাটেজি এরর দেবে; গুগল অ্যাকাউন্টে ইমেইল ভিজিবল থাকতে হবে।
- ইউজার ব্লকড/ডিলিটেড থাকলে? → লগইন ব্লক হবে এবং এরর/রিডাইরেক্ট হবে।
- নতুন ইউজার তৈরি হলে কি `verified` সেট হয়? → হ্যাঁ, গুগল দিয়ে তৈরি ইউজারের `verified: true`।

---
এই গাইড অনুযায়ী সেটআপ করলে আপনার বর্তমান কোডবেসে গুগল লগইন সম্পূর্ণভাবে কাজ করবে। উপরের ইমপ্রুভমেন্টগুলো নিলে সিকিউরিটি ও মেইনটেইনেবিলিটি আরও ভালো হবে।