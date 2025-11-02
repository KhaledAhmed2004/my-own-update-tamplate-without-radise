# GeoQuery Support in QueryBuilder

এই আপডেটে QueryBuilder-এ MongoDB-এর জিওস্পেশাল (GeoJSON + 2dsphere) সাপোর্ট যোগ করা হয়েছে। এর মাধ্যমে `location` ফিল্ডে সংরক্ষিত GeoJSON Point ব্যবহার করে কাছাকাছি সার্চ (`$near`), বৃত্তের মধ্যে সার্চ (`$geoWithin` + `$centerSphere`) এবং বক্সের মধ্যে সার্চ (`$geoWithin` + `$box`) করা যাবে।

## কেন করা হয়েছে
- পূর্বে `locationFilter()` শুধুমাত্র latitude/longitude ভিত্তিক একটি bounding box approximation করত — এটা দ্রুত হলেও সঠিক দূরত্বভিত্তিক সার্চ নয় এবং 2dsphere index ব্যবহার করে না।
- বাস্তব দূরত্বভিত্তিক সার্চ, সঠিক গোলাকার পৃথিবী মডেল (sphere) বিবেচনায় আনা এবং MongoDB-র নেটিভ জিও ইন্ডেক্সের সুবিধা নিতে `$near`/`$geoWithin` যুক্ত করা হয়েছে।

## কী সমস্যা সমাধান হয়েছে
- প্রধান সমস্যা ছিল distance-based সার্চে অস্বচ্ছতা ও নির্ভুলতার ঘাটতি। Approximate bounding box-এ উত্তর/দক্ষিণ মেরুর কাছে longitude scaling সমস্যা দেখা দেয়।
- এখন `$near` এবং `$centerSphere` radius ব্যবহার করে নির্ভুল সার্চ করা যায়, ইন্ডেক্স-ফ্রেন্ডলি এবং স্কেলেবল।

## আগে কেমন ছিল
- `locationFilter()` কুয়েরি প্যারাম: `latitude`, `longitude`, `distance` নিয়ে একটি আনুমানিক বাউন্ডিং বক্স বানাতো এবং `latitude`/`longitude` ফিল্ডে `$gte`/`$lte` দিয়ে ফিল্টার করতো।

## এখন কেমন
- নতুন মেথডসমূহ:
  - `geoNear()`: `$near` ব্যবহার করে একটি কেন্দ্র বিন্দু থেকে সর্বোচ্চ/সর্বনিম্ন দূরত্বে ডকুমেন্ট খুঁজে বের করে।
  - `geoWithinCircle()`: `$geoWithin` + `$centerSphere` ব্যবহার করে একটি রেডিয়াসের মধ্যে ডকুমেন্ট খুঁজে।
  - `geoWithinBox()`: `$geoWithin` + `$box` দিয়ে একটি বক্সের মধ্যে ডকুমেন্ট খুঁজে।
  - `geoQuery()`: কুয়েরি প্যারাম `geoMode` অনুযায়ী উপরোক্ত মোডগুলো চালায় (`near`/`circle`/`box`)।

## প্রি-রিকুইজিটস
- আপনার মডেলে GeoJSON `location` ফিল্ড থাকতে হবে এবং 2dsphere ইন্ডেক্স থাকতে হবে:

```ts
// উদাহরণ স্কিমা (Mongoose)
const TaskSchema = new Schema({
  // অন্যান্য ফিল্ড...
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
});

TaskSchema.index({ location: '2dsphere' });
```

## কিভাবে ব্যবহার করবেন

### Before (bounding box approximation)
```ts
const qb = new QueryBuilder(Task.find(), req.query)
  .filter()
  .locationFilter() // latitude, longitude, distance (km)
  .sort()
  .paginate();
const { data, pagination } = await qb.getFilteredResults();
```

### After (distance-accurate geospatial)
```ts
// Near search (distance in km via `distance`, or meters via `maxDistance`)
const qb = new QueryBuilder(Task.find(), req.query)
  .filter()
  .geoNear() // requires: latitude, longitude, and distance or maxDistance
  .sort()
  .paginate();
const { data, pagination } = await qb.getFilteredResults();
```

```ts
// Circle search using radius in km
const qb = new QueryBuilder(Task.find(), req.query)
  .filter()
  .geoWithinCircle() // requires: latitude, longitude, radius (km) or distance (km)
  .sort()
  .paginate();
const { data, pagination } = await qb.getFilteredResults();
```

```ts
// Box search using southwest and northeast corners
const qb = new QueryBuilder(Task.find(), req.query)
  .filter()
  .geoWithinBox() // requires: swLat, swLng, neLat, neLng
  .sort()
  .paginate();
const { data, pagination } = await qb.getFilteredResults();
```

```ts
// Unified entry via geoQuery() and query param `geoMode`
// geoMode: 'near' | 'circle' | 'box'
const qb = new QueryBuilder(Task.find(), req.query)
  .filter()
  .geoQuery()
  .sort()
  .paginate();
const { data, pagination } = await qb.getFilteredResults();
```

## Query Params রেফারেন্স
- `near`: `latitude`, `longitude`, `distance` (km) অথবা `maxDistance` (meters), ঐচ্ছিক `minDistance` (km)
- `circle`: `latitude`, `longitude`, `radius` (km) বা `distance` (km)
- `box`: `swLat`, `swLng`, `neLat`, `neLng`
- `geoMode`: `'near' | 'circle' | 'box'` (ব্যবহার করলে `geoQuery()` স্বয়ংক্রিয়ভাবে মোড নির্বাচন করে)

## নোট
- `$near` এবং `$geoWithin` কাজ করতে `location` ফিল্ডে 2dsphere index থাকা আবশ্যক।
- `coordinates` এর অর্ডার অবশ্যই `[lng, lat]` হবে।
 
 ## New: Field Flexibility + Polygon Support
 - `geoField` প্যারাম যোগ করা হয়েছে — ডিফল্ট `location`; চাইলে অন্য GeoJSON ফিল্ডও টার্গেট করতে পারবেন।
 - `geoWithinPolygon()` যুক্ত করা হয়েছে — `$geoWithin` + `$polygon` দিয়ে পলিগন এরিয়া সার্চ।
 - `geoQuery()` এখন `polygon` মোডও সাপোর্ট করে।

 ### New Params
 - `geoField`: যে GeoJSON ফিল্ডে সার্চ করবেন, ডিফল্ট `location`।
 - `polygon` (JSON) অথবা `poly` (string pairs): পলিগন কোঅর্ডিনেটস।
   - JSON উদাহরণ: `polygon=[[90.40,23.76],[90.42,23.76],[90.42,23.79],[90.40,23.79],[90.40,23.76]]`
   - String উদাহরণ: `poly=90.40,23.76;90.42,23.76;90.42,23.79;90.40,23.79;90.40,23.76`
   - নোট: ফার্স্ট এবং লাস্ট পয়েন্ট একই না হলে, কুয়েরি অটো-বন্ধ (close) করে দিবে।

 ### Examples (Field + Polygon)
 ```http
 GET /tasks?geoMode=near&geoField=location&latitude=23.7808&longitude=90.4071&distance=10
 GET /tasks?geoMode=circle&geoField=location&latitude=23.7808&longitude=90.4071&radius=10
 GET /tasks?geoMode=box&geoField=location&swLat=23.70&swLng=90.35&neLat=23.82&neLng=90.45
 GET /tasks?geoMode=polygon&geoField=location&poly=90.40,23.76;90.42,23.76;90.42,23.79;90.40,23.79;90.40,23.76
 ```

 ### Notes (Hybrid)
 - Lat/Lng ইনপুট রেঞ্জ চেক করা হয়; ভুল ইনপুটে descriptive error পাওয়া যাবে।
 - পূর্বের সব ফিল্টার (`filter()`, `search()`, etc.) preserve হয় — geo ফিল্টার merge করে।