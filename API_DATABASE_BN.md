## 🧾 BaigDentPro – API ও ডাটাবেস ব্যবহার (বাংলা গাইড)

এই ডকুমেন্টে সংক্ষেপে বোঝানো হয়েছে **কোন ডাটাবেস** ব্যবহার করা হবে, আর **ফ্রন্টএন্ড (React/Vite)** কীভাবে **ব্যাকএন্ড API**–র সাথে কথা বলে।

---

## ১. আমরা কোন ডাটাবেস ব্যবহার করছি?

BaigDentPro–র জন্য ডাটাবেস ডিজাইন করা হয়েছে **রিলেশনাল ডাটাবেস** ধরে:

- সাধারণত **PostgreSQL** বা **MySQL** ব্যবহার করার পরামর্শ দেওয়া হয়েছে  
- স্কিমা (টেবিল গঠন) `BACKEND_INTEGRATION_GUIDE.md`–এ SQL আকারে দেয়া আছে  

মূল টেবিলগুলো:

- `users` – ইউজার / স্টাফ (ডাক্তার, রিসেপশনিস্ট, অ্যাকাউন্টেন্ট ইত্যাদি)
- `clinics` – ক্লিনিক/চেম্বার–সংক্রান্ত তথ্য
- `patients` – পেশেন্ট–এর মৌলিক তথ্য
- `prescriptions` – প্রেসক্রিপশন হেডার (একজন পেশেন্টের জন্য এক ভিজিটে যা লেখা হয়)
- `prescription_items` – প্রতিটি প্রেসক্রিপশনের ভিতরের আলাদা আলাদা ওষুধ/ডোজ
- `appointments` – অ্যাপয়েন্টমেন্ট/সিডিউল
- `medical_histories` – পেশেন্ট–এর মেডিকেল হিস্ট্রি (BP, ডায়াবেটিস, হেপাটাইটিস ইত্যাদি)
- `treatment_plans` – দাঁতের ট্রীটমেন্ট প্ল্যান
- `bills` ও `payments` – বিল ও পেমেন্ট–এর হিসাব
- `drugs` – ওষুধের ডাটাবেস
- `audit_logs` – কে কোন ডেটা পরিবর্তন করেছে তার লগ (কমপ্লায়েন্সের জন্য)

এই টেবিলগুলো একে অন্যের সাথে **FOREIGN KEY** দিয়ে যুক্ত (যেমন `patients` ↔ `prescriptions`), তাই রিপোর্ট ও অ্যানালিটিক্স তৈরি করা সহজ।

---

## ২. API কিভাবে কাজ করে? (High Level Flow)

BaigDentPro–র গঠন:

- **Frontend**: React + TypeScript (Vite) – ব্রাউজারে চলে  
- **Backend API**: Node.js / Python / অন্য যে কোনো সার্ভার – HTTP/REST API দেয়  
- **Database**: PostgreSQL / MySQL – ব্যাকএন্ড থেকে কানেক্টেড

ডাটা–ফ্লো (সহজ ভাষায়):

1. ইউজার ব্রাউজারে BaigDentPro খোলে (React অ্যাপ লোড হয়)
2. ইউজার কোনো কাজ করে (যেমন নতুন পেশেন্ট সেভ, প্রেসক্রিপশন লেখা, অ্যাপয়েন্টমেন্ট বুক করা)
3. ফ্রন্টএন্ড `fetch`/`axios` দিয়ে ব্যাকএন্ড–এর নির্দিষ্ট URL–এ **HTTP request** পাঠায়
4. ব্যাকএন্ড সেই রিকোয়েস্ট নিয়ে ডাটাবেসে SQL কুয়েরি চালায়
5. রেজাল্ট JSON আকারে ফেরত দেয়
6. ফ্রন্টএন্ড সেই JSON ব্যবহার করে UI আপডেট করে

সব API সাধারণত `/api/...` পাথ ব্যবহার করবে, যেমন:

- `/api/auth/login`
- `/api/patients`
- `/api/prescriptions`
- `/api/appointments`
- `/api/bills`

---

## ৩. অথেন্টিকেশন (Login) ও টোকেন ব্যবহার

### ৩.১. লগইন ফ্লো

1. লগইন ফর্ম থেকে **ইমেইল/ইউজারনেম + পাসওয়ার্ড** যায় `POST /api/auth/login`–এ
2. ব্যাকএন্ড পাসওয়ার্ড চেক করে (হ্যাশ করা অবস্থায়)
3. সফল হলে:
   - একটি **JWT টোকেন** দেয় (অথেন্টিকেটেড ইউজারের তথ্য সহ)
   - ফ্রন্টএন্ড সেই টোকেন `localStorage` বা `HttpOnly cookie`–তে রাখে (ইমপ্লিমেন্টেশনের উপর নির্ভর)
4. পরের সব প্রোটেকটেড API–তে হেডারে পাঠানো হয়:

```http
Authorization: Bearer <JWT_TOKEN>
```

### ৩.২. রোল–বেসড অ্যাক্সেস

`users` টেবিলে প্রত্যেক ইউজারের `role` থাকে:

- `doctor`
- `receptionist`
- `accountant`
- `admin`

ব্যাকএন্ড এই রোল দেখে ঠিক করে কোন ইউজার কোন API ব্যবহার করতে পারবে (যেমন বিল/রিপোর্ট শুধু `accountant`/`admin` দেখতে পারবে)।

---

## ৪. Patients API – ফ্রন্টএন্ড থেকে ব্যবহার (উদাহরণ)

### ৪.১. সব পেশেন্ট লিস্ট করা

- Endpoint: `GET /api/patients`
- ব্যবহার: পেশেন্ট টেবিলে লিস্ট দেখানোর সময়

React side (উদাহরণ TypeScript কোড):

```ts
const token = localStorage.getItem('token');

const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/patients`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
const data = await res.json();
// data.data বা সরাসরি data থেকে পেশেন্ট লিস্ট রেন্ডার করা হবে
```

### ৪.২. নতুন পেশেন্ট তৈরি করা

- Endpoint: `POST /api/patients`
- Body: পেশেন্ট ফর্ম থেকে নেওয়া ডাটা (JSON)

```ts
await fetch(`${import.meta.env.VITE_API_BASE_URL}/patients`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(formValues),
});
```

---

## ৫. Prescriptions API – প্রেসক্রিপশন সেভ ও প্রিন্ট

### ৫.১. নতুন প্রেসক্রিপশন সেভ

- Endpoint: `POST /api/prescriptions`
- Body:
  - পেশেন্ট আইডি (`patient_id`)
  - ডাক্তার (`doctor_id`)
  - ডায়াগনসিস, C/C, O/E, Investigation, Drug history
  - এক বা একাধিক `prescription_items` (ওষুধ, ডোজ, ডুরেশন ইত্যাদি)

ফ্রন্টএন্ড পুরো ফর্মের ডাটা JSON–এ কনভার্ট করে এই এন্ডপয়েন্টে পাঠাবে।  
ব্যাকএন্ড `prescriptions` ও `prescription_items` টেবিলে সেভ করবে।

### ৫.২. প্রিন্ট / PDF

- Endpoint: `POST /api/prescriptions/:id/print`
- কাজ: প্রেসক্রিপশন থেকে **PDF** বা **প্রিন্ট–রেডি HTML** তৈরি করা

ফ্লো:

1. ফ্রন্টএন্ড প্রথমে `POST /api/prescriptions` দিয়ে প্রেসক্রিপশন সেভ করে
2. সেভ হওয়া আইডি দিয়ে পরের কল: `POST /api/prescriptions/:id/print`
3. রেসপন্সে:
   - হয় `pdfUrl` (ব্যাকএন্ডে জেনারেটেড PDF–এর লিঙ্ক)  
   - নয়তো HTML, যা ফ্রন্টএন্ড `iframe` বা নতুন উইন্ডোতে প্রিন্ট করবে

---

## ৬. Appointments, Billing, Drugs – API ধারণা

### ৬.১. Appointments

- `GET /api/appointments` – ক্যালেন্ডারে সব অ্যাপয়েন্টমেন্ট দেখানোর জন্য
- `POST /api/appointments` – নতুন অ্যাপয়েন্টমেন্ট বুক
- `PUT /api/appointments/:id` – রিসিডিউল/আপডেট
- `DELETE /api/appointments/:id` – ক্যানসেল

**ডাটাবেস:** `appointments` টেবিল – `clinic_id`, `patient_id`, `doctor_id`, `appointment_date`, `status` ইত্যাদি ফিল্ড থাকে।

### ৬.২. Billing & Payments

- `POST /api/bills` – নতুন বিল তৈরি
- `POST /api/bills/:id/payment` – পেমেন্ট যোগ করা
- `GET /api/reports/revenue` – রিপোর্ট পেজে রেভিনিউ চার্ট/টেবিল দেখানোর জন্য

**ডাটাবেস:** `bills`, `payments` টেবিল – প্রতিটি বিল ও পেমেন্ট ঠিক কোন পেশেন্ট ও ক্লিনিকের সেটা সেভ থাকে।

### ৬.৩. Drug Database

- `GET /api/drugs` / `GET /api/drugs/search` – প্রেসক্রিপশন পেজে ড্রাগ সার্চ করার জন্য

**ডাটাবেস:** `drugs` টেবিল – ব্র্যান্ড নাম, জেনেরিক, ডোজ, প্রাইস, কোম্পানি ইত্যাদি।

---

## ৭. Environment Variable ও Base URL

ফ্রন্টএন্ডে API–র বেস URL `.env` ফাইলে থাকে:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=BaigDentPro Dental Suite
```

React কোডের ভিতরে সাধারণত ব্যবহার হবে:

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL;
await fetch(`${API_BASE}/patients`, { ... });
```

প্রোডাকশনে এই URL হবে আপনার লাইভ সার্ভারের ঠিকানা (যেমন `https://api.yourclinic.com/api`)।

---

## ৮. সারসংক্ষেপ (বাংলায় এক লাইনে)

- **ডাটাবেস**: PostgreSQL/MySQL–স্টাইল রিলেশনাল স্কিমা, আলাদা টেবিলে পেশেন্ট, প্রেসক্রিপশন, অ্যাপয়েন্টমেন্ট, বিল, ড্রাগ ইত্যাদি।
- **API ব্যবহার**: React ফ্রন্টএন্ড `/api/...` এন্ডপয়েন্টে `fetch`/`axios` দিয়ে JSON পাঠায়/নেয়, JWT টোকেন দিয়ে সিকিউর, আর ব্যাকএন্ড সেই ডাটা ডাটাবেসে সেভ করে বা রিড করে আবার ফ্রন্টএন্ডকে পাঠায়।

