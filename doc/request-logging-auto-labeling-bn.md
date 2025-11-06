# Dynamic Request Logging & Auto-Labeling (Bangla Guide)

এই ডকুমেন্টটা আপনার প্রজেক্টে থাকা Dynamic Controller/Service Labeling সেটআপটা সহজে বুঝতে, ব্যবহার করতে এবং extend করতে সহায়তা করবে। লক্ষ্য হচ্ছে: **কোনও manual label set না করে** logs-এ `controller: <Controller>.<method>` এবং `service: <Service>.<method>` auto ভাবে show করা।

## কেন দরকার
- Logs পড়ে দ্রুত বুঝতে পারা যায় কোন Controller handler এবং কোন Service method কাজ করেছে।
- Debugging ফাস্ট হয়: ভুল জায়গায় controller/service নাম দেখালে সহজে ধরা যায়।
- Route/Controller/Service ফাইলে **extra wrapper বা label set** করার দরকার নেই — সবকিছু centrally auto হয়।

## High-Level Architecture
- `AsyncLocalStorage`-ভিত্তিক request context: `src/app/middlewares/requestContext.ts`
  - `setControllerLabel(label)`, `setServiceLabel(label)`, `getLabels()` — request scope-এ নাম রাখে।
  - `controllerNameFromBasePath(baseUrl)` — base path থেকে Controller নাম derive করে (plural→singular mapping সহ)।
- Central bootstrap: `src/app/middlewares/autoLabelBootstrap.ts`
  - Services ও Controllers-এর সব method dependency-free ভাবে wrap করা হয়।
  - Method call হলেই context-এ label set করে: `ControllerName.method`, `ServiceName.method`।
- Request logger: `src/app/middlewares/requestLogger.ts`
  - Response finish-এর সময় context থেকে label নিয়ে সুন্দরভাবে log ফরম্যাট করে।
  - যদি controller label না পাওয়া যায়, fallback হিসেবে base path + handler name দিয়ে derive করে।
- App init order: `src/app.ts`
  - `import './app/middlewares/autoLabelBootstrap'` **router bind হওয়ার আগেই** করা আছে।
  - `app.use(requestContextInit)` **requestLogger**-এর আগে।

## কিভাবে কাজ করে
1. App স্টার্ট হওয়ার সাথে সাথেই `autoLabelBootstrap` লোড হয় — এটা Controllers/Services-এর exported object-গুলোর function-গুলো wrap করে।
2. কোনও route hit হলে Controller method invoke হয় — wrapper label set করে: `ControllerName.method`।
3. Controller-এর ভিতর Service method call হলে service wrapper label set করে: `ServiceName.method`।
4. `requestLogger` response finish হলে context থেকে labels পড়ে log print করে।

## আপনি কী করবেন (Usage)
- Controllers ও Services **normal ভাবে লিখুন** — কোনও manual `res.locals` বা wrapper লাগবে না।
- Export pattern follow করুন:
  - Controller: `export const SomeController = { methodA: handlerA, methodB: handlerB, ... }`
  - Service: `export const SomeService = { methodA, methodB, ... }`
- Base path গুলো conventional রাখুন (e.g., `/api/v1/auth`, `/api/v1/users`, `/api/v1/notifications`) — fallback derive করার সময় singular mapping কাজ করবে।

## Extend/নতুন Module add করবেন কীভাবে
ধরুন নতুন `payment` module add করলেন:

1) Service যোগ করুন: `src/app/modules/payment/payment.service.ts`

```ts
export const PaymentService = {
  createPayment,
  capturePayment,
  refundPayment,
};
```

2) Controller যোগ করুন: `src/app/modules/payment/payment.controller.ts`

```ts
export const PaymentController = {
  createPayment,
  capturePayment,
  refundPayment,
};
```

3) Bootstrap-এ register করুন: `src/app/middlewares/autoLabelBootstrap.ts`

```ts
import { PaymentService } from '../modules/payment/payment.service';
import { PaymentController } from '../modules/payment/payment.controller';

wrapService('PaymentService', PaymentService);
wrapController('PaymentController', PaymentController);
```

4) Base path mapping confirm করুন: `requestContext.ts`-এ plural→singular mapping থাকলে ভাল (e.g., `payments: 'PaymentController'`).

> নোট: এই central bootstrap approach-এ module ফাইলের ভিতরে কোনও Proxy বা extra কোড লাগবে না।

## Expected Log Examples
- Notifications list:
```
🎛️ Handler: controller: NotificationController.getNotificationFromDB 
             service: NotificationService.getNotificationFromDB
```
- Auth login:
```
🎛️ Handler: controller: AuthController.loginUser 
             service: AuthService.loginUserFromDB
```

## Troubleshooting
- Controller label `GET /` বা `POST /path` দেখাচ্ছে:
  - Check করুন `src/app.ts`-এ `import './app/middlewares/autoLabelBootstrap'` **router import-এর আগেই** আছে।
  - Controller export pattern object-ভিত্তিক কিনা দেখুন (anonymous inline function pass করলে নাম resolve করা কঠিন)।
- Service label show হচ্ছে না:
  - Bootstrap-এ `wrapService('YourService', YourService)` add হয়েছে কিনা দেখুন।
  - Controller থেকে service method call হচ্ছে কিনা নিশ্চিত করুন।
- ভুল Controller নাম আসছে (plural vs singular):
  - `controllerNameFromBasePath`-এর `BASE_TO_CONTROLLER` map-এ আপনার base path যোগ করুন (e.g., `messages: 'MessageController'`).

## Performance & Safety
- Wrapper overhead: খুবই কম — শুধু method call-এর আগে context-এ string set করে।
- Sensitive data masking: `requestLogger` `password`, `token`, `authorization` প্রভৃতি key mask করে।
- Webhook routes: `/api/v1/payments/webhook` raw body retain রাখা হয়, logger নিরাপদ summary দেখায়।

## Enable/Disable
- পুরো auto-labeling বন্ধ করতে চাইলে `src/app.ts` থেকে `import './app/middlewares/autoLabelBootstrap'` comment/remove করুন।
- Environment অনুযায়ী behaviour টিউন করতে পারেন (e.g., dev-এ বেশি details, prod-এ কম)।

## Best Practices
- Controller/Service method-এর নাম meaningful রাখুন — log পড়ে action বোঝা সহজ হবে।
- Export সবসময় object আকারে করুন — bootstrap সহজে wrap করতে পারে।
- Base path conventional রাখুন — mapping কম লিখতে হবে।

## FAQ
**প্র: Controller/Service file-এর ভিতরে Proxy দরকার?**
উ: না। Central bootstrap already wrap করে দেয়।

**প্র: Manual label set করব?**
উ: দরকার নেই। Context labels auto set হয়।

**প্র: Anonymous/inline handler দিলে হবে?**
উ: হবে, তবে নাম derive কষ্টকর — সেক্ষেত্রে bootstrap controller wrapping থাকলে ঠিকঠাক label set হবে।

---
এই guide follow করলে কোনও extra কাজ ছাড়াই সুন্দরভাবে controller/service labels logs-এ show হবে। নতুন module লাগলে শুধু bootstrap-এ দুইটা line import+wrap করলেই হয়ে যাবে।

---

## Per-Request Metrics (DB/Cache/External)
- Metrics store: `src/app/middlewares/requestContext.ts`
  - `recordDbQuery(ms, { model?, operation?, cacheHit? })`, `recordCacheHit(ms)`, `recordCacheMiss(ms)`, `recordExternalCall(ms)` — প্রতি request-এর scope-এ metrics জমা হয়।
  - DB-এর জন্য `queries: { model?, operation?, durationMs, cacheHit }[]` আলাদা করে রাখা হয় — logger এগুলো থেকেই per-query details দেখায়।
  - `getMetrics()` দিয়ে logger metrics পড়ে।
- Log output: `src/app/middlewares/requestLogger.ts`
  - Emoji + indentation সহ বিস্তারিত ব্লক প্রিন্ট হয়:
    - `🧮 DB Metrics` → `Hits` / `Avg Query Time` / `Slowest Query`
    - Categorized lists: `Fast ⚡ (<300ms)` / `Moderate ⏱️ (300–999ms)` / `Slow 🐌 (>=1000ms)`
      - প্রতিটি লাইনে: `Model`, `Operation`, `Duration`, `Cache Hit`
    - `🗄️ Cache Metrics` → `Hits` / `Misses` / `Hit Ratio`
    - `🌐 External API Calls` → `Count` / `Avg Response` / `Slowest Call`
    - শেষে `📊 Total Request Cost` এবং `⏱️ Processed in <X>ms` ক্যাটাগরি লেবেলসহ।

### DB Timing কীভাবে record হচ্ছে
- `QueryBuilder` ও `AggregationBuilder`-এ instrumentation আছে (search/filter/pagination flow-এ)
- Global Mongoose plugin: `src/app/observability/mongooseMetrics.ts`
  - Query ops: `find`, `findOne`, `countDocuments`, `findOneAndUpdate`, `update*`, `delete*`
  - Aggregation: `aggregate`
  - Document ops: `save` (এর মাধ্যমে `Model.create()` কভার হয়)
  - Error hooks: failed হলে-ও duration record হয়
- গুরুত্বপূর্ণ: এই plugin টা **সকল schema compile হওয়ার আগেই** register হতে হবে।
  - Fix: `src/app.ts`-এ `import './app/observability/mongooseMetrics'` উপরে রাখুন — `autoLabelBootstrap` ও `router`-এর আগেই।
 - ডুপ্লিকেট/`n/a` এন্ট্রি এড়াতে:
   - `QueryBuilder.getFilteredResults()` থেকে manual `recordDbQuery()` কল সরানো হয়েছে — Mongoose plugin-ই `find` অপারেশন record করে।
   - অন্য যেকোনো manual রেকর্ডে `model`/`operation` metadata দিন।

### Cache Metrics
- `src/app/shared/CacheHelper.ts`-এ `get()` method hit/miss timing record করে।
- `recordCacheHit(ms)` / `recordCacheMiss(ms)` per-request metrics store-এ যোগ হয়।

### External API Metrics
- External call হলে duration মেপে `recordExternalCall(ms)` ব্যবহার করুন।
- বর্তমানে success/failure আলাদা করে ট্র্যাক করা হচ্ছে না — summary-তে `Count`, `Avg Response`, `Slowest Call` দেখায়।

### Cost Labeling Rules
- `HIGH` যদি: `dbHits ≥ 8` বা `dbAvg ≥ 120ms` বা `dbSlow ≥ 350ms` বা `extAvg ≥ 400ms` বা `extSlow ≥ 500ms`।
- `MEDIUM` যদি: `dbHits ≥ 4` বা `extCount ≥ 1`।
- অন্য সব ক্ষেত্রে `LOW`।

---

## Expected Log Example (with Metrics)
```
📥 Request:  GET  /api/v1/notifications from IP: 10.10.7.33
     🛰️ Client: ua="PostmanRuntime/7.49.1" referer="n/a" ct="n/a"
     🎛️ Handler: controller: NotificationController.getNotificationFromDB service: NotificationService.getNotificationFromDB
     👤 Auth: id="..." email="..." role="POSTER"
📤 Response sent:  200 OK  (size: 2821 bytes)
💬 Message:  Notifications retrieved successfully
 ----------------------------------------------------
 🧮 DB Metrics
    • Hits            : 3 ✅
    • Avg Query Time  : 48ms ⏱️
    • Slowest Query   : 48ms ⚡
 Fast Queries ⚡ (< 300ms):
 - Model: Notification, Operation: find, Duration: 48ms, Cache Hit: ❌
 - Model: Notification, Operation: countDocuments, Duration: 47ms, Cache Hit: ❌
 Moderate Queries ⏱️ (300–999ms):
 - None
 Slow Queries 🐌 (>= 1000ms):
 - None
 🗄️ Cache Metrics
    • Hits            : 0
    • Misses          : 0
    • Hit Ratio       : 0%
 🌐 External API Calls
    • Count           : 0
    • Avg Response    : 0ms
    • Slowest Call    : 0ms
 ----------------------------------------------------
 📊 Total Request Cost :  LOW  ✅
 ⏱️ Processed in 102ms  [ Fast: < 300ms ]
```

---

## Troubleshooting (Metrics)
- DB hits `0` দেখাচ্ছে অথচ create/save হচ্ছে:
  - নিশ্চিত করুন `src/app.ts`-এ `import './app/observability/mongooseMetrics'` **সর্বপ্রথম** আছে।
  - যদি কোনও ফাইল top-level-এ model import করে থাকে (e.g., bootstrap), plugin import order আগেই রাখতে হবে।
  - `Model.create()` save middleware hit করছে কিনা দেখুন; আমাদের plugin `save` pre/post হুক কভার করে।
  - Aggregation/Query custom util ব্যবহার করলে (`QueryBuilder`, `AggregationBuilder`) instrumentation আছে — কিন্তু pure `User.create()`/`User.findOneAndUpdate()` এর জন্য plugin দরকার।

- `Model: n/a, Operation: n/a` দেখাচ্ছে:
  - কারণ: manual `recordDbQuery()` মেটাডাটা ছাড়া কল হয়েছে (e.g., আগের `getFilteredResults()` ইমপ্লিমেন্টেশন)।
  - সমাধান: ঐ manual কল সরান/মেটাডাটা যোগ করুন; গ্লোবাল Mongoose plugin ইতিমধ্যেই `model`/`operation` সহ রেকর্ড করে।

---

## কী কী add/update হয়েছে (Summary)
- Emoji-ভিত্তিক Metrics block: DB categories (Fast/Moderate/Slow) + summary `requestLogger`-এ।
- Request context: DB `queries[]` যোগ — model/operation/duration/cacheHit per-query ট্র্যাকিং।
- Cache instrumentation: `CacheHelper.get()`-এ hit/miss timing record।
- External metrics: `recordExternalCall(ms)` ব্যবহার করে duration ট্র্যাক।
- Mongoose plugin: `mongooseMetrics.ts` global plugin, query/aggregate/save timing + error coverage।
- Import order fix: `src/app.ts`-এ metrics plugin import উপরে এনে সব schema cover করা।
- Duplicate/n-a fix: `QueryBuilder.getFilteredResults()` থেকে manual record সরানো হয়েছে।

---

## Matching কীভাবে কাজ করে
- Controller/Service labels:
  - `autoLabelBootstrap` export করা object methods wrap করে — call হলেই `ControllerName.method` / `ServiceName.method` context-এ set হয়।
  - Fallback: base path থেকে `controllerNameFromBasePath()` derive করে + handler key যোগ করে।
- Sensitive data masking: logger body/query/headers-এ `password`, `token`, `authorization` প্রভৃতি key mask করা আছে।

---

## আপনি কী করবেন (Next Steps)
- নতুন external API call করলে duration মাপুন এবং `recordExternalCall(ms)` কল করুন।
- Cache ব্যবহার করলে `CacheHelper.get()` default ব্যবহার করুন — metrics auto হবে।
- নতুন module add করলে `autoLabelBootstrap.ts`-এ `wrapService`/`wrapController` এন্ট্রি দিন।
- Import order বজায় রাখুন: metrics plugin → bootstrap → router।

## Client Info Enrichment (OS/Device Detection)
Server logs-এ এখন browser Client Hints ব্যবহার করে OS/Device/Arch/Bitness/Browser details দেখানো হয়, fallback হিসেবে User-Agent parse করা হয়।

### কেন যোগ করা হল
- Chrome/Edge UA string-এ OS version কম accurate (e.g., `Windows NT 10.0`), তাই Client Hints (`sec-ch-ua-*`) বেশি নির্ভুল।
- Debugging ও analytics-এ device type/arch/bitness দরকার হয়।

### কীভাবে কাজ করে
- Server response-এ `Accept-CH`, `Critical-CH` header পাঠানো হয় — browser পরের request থেকে Client Hints পাঠায়।
- Middleware `clientInfo.ts` প্রথমে Client Hints পড়ে, না পেলে `ua-parser-js` দিয়ে UA parse করে।
- `requestLogger.ts` enriched line print করে।

### কোন ফাইলে কী update
- `src/app.ts`
  - Global headers middleware add: `Accept-CH: Sec-CH-UA, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Mobile, Sec-CH-UA-Model, Sec-CH-UA-Arch, Sec-CH-UA-Bitness`
  - `Vary: Sec-CH-UA, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Mobile, Sec-CH-UA-Model, Sec-CH-UA-Arch, Sec-CH-UA-Bitness`
  - `Critical-CH: Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version`
  - Middleware order: `requestContextInit` → `clientInfo` → `requestLogger`।
- `src/app/middlewares/clientInfo.ts`
  - Client Hints normalize করে `res.locals.clientInfo`-এ store করে: `os`, `osFriendly`, `osVersion`, `deviceType`, `deviceModel`, `arch`, `bitness`, `browser`, `browserVersion`, `ua`।
  - Windows mapping heuristic: `platformVersion` major ≥ 13 ⇒ `Windows 11`, else `Windows 10`।
- `src/app/middlewares/requestLogger.ts`
  - নতুন লাইন add: `💻 Device: <deviceType>, OS: <osFriendly> (<osVersion>) ... Browser: <name> <version>`।

### Expected Log Example (Client Info)
```
📥 Request:  GET  /api/v1/notifications from IP: 127.0.0.1
     🛰️ Client: ua="Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/142.0.0.0 ..." referer="http://localhost:5001/" ct="n/a"
     💻 Device: desktop, OS: Windows 11 (19.0.0), Arch: x86, 64-bit, Browser: Chrome 142.0.0.0
     🎛️ Handler: controller: NotificationController.getNotificationFromDB service: NotificationService.getNotificationFromDB
```
> নোট: UA reduction-এর কারণে `🛰️ Client` লাইনে Windows সবসময় `Windows NT 10.0` দেখাতে পারে — enriched `💻 Device` লাইনে Client Hints দিয়ে friendly OS name (Windows 10/11) দেখানো হয় এবং raw token parentheses-এ রাখা হয়।

### Usage
- Dev server রান করুন: `npm run dev` — TypeScript changes live চলে (build errors থাকলেও dev চলবে)।
- Browser (Chrome/Edge) দিয়ে একই endpoint দুবার hit দিন:
  - ১ম request: browser `Accept-CH` headers cache করে।
  - ২য় request: browser Client Hints পাঠাবে → `💻 Device` লাইন দেখাবে।
- Client Hints শুধু browser পাঠায় — Postman/curl-এ দেখাবে না।

### Browser Support & Caching
- Chrome/Edge: Client Hints ভালোভাবে support করে।
- Firefox/Safari: সীমিত support — fallback UA parsing ব্যবহার হবে।
- `Vary` header cache-safe behaviour নিশ্চিত করে যাতে CDN/proxy ভুলভাবে cache না করে।

### Troubleshooting (Client Hints)
- `💻 Device` দেখা যাচ্ছে না:
  - নিশ্চিত করুন `app.ts`-এ headers middleware আছে ও `clientInfo` `requestLogger`-এর আগে।
  - Chrome DevTools → Network → Request Headers-এ দেখুন: `sec-ch-ua-platform`, `sec-ch-ua-platform-version`, `sec-ch-ua-mobile`, `sec-ch-ua-arch`, `sec-ch-ua-bitness` আসছে কিনা।
  - Cross-origin হলে (frontend `:5001` → API `:5000`), API side `Accept-CH` পাঠানোর পর দ্বিতীয় কল থেকে hints আসবে।
- Windows ভুল দেখাচ্ছে:
  - UA লাইনে `Windows NT 10.0` normal — enriched লাইনের `osFriendly`/`osVersion` দেখুন।
  - Windows heuristic current Chromium token mapping অনুযায়ী — চাইলে build ranges টিউন করা যাবে।

### API/Code Reference
- Headers middleware: `src/app.ts`
- Client detection: `src/app/middlewares/clientInfo.ts`
- Logger enrichment: `src/app/middlewares/requestLogger.ts`

### Summary (Client Info)
- Client Hints + UA fallback দিয়ে backend-only device/OS detection add করা হয়েছে।
- Logs আরো actionable: device type, OS (friendly), arch/bitness, browser — সব এক লাইনে।