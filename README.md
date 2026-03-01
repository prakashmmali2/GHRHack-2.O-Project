🚀 Live Deployment

📱 Expo Deployment Link:

👉 exp://p_9wfce5gwb0tyl3t8ywond.rork.live

Scan in Expo Go to test.

🎯 Core Features
👥 1. Multi-Role System

On first launch, user selects:

🧑 Patient

👨‍👩‍👧 Caregiver (Family Member)

🧑‍⚕️ Doctor

Each role has:

Separate navigation stack

Role-based data access

Permission-controlled views

🔐 Unique Code Linking System
🧑 Patient Registration

Name

Age

Username

System generates unique code:

OMXXXXXX

Displayed in profile

👨‍👩‍👧 Caregiver / 🧑‍⚕️ Doctor

Enter patient unique code

System validates

Links securely to patient data

Ensures:

Data isolation

Correct patient mapping

Secure relationship model

💊 Patient Module (Core Engine)

Patient can:

Add disease

Add medicines

Set:

Breakfast

After Lunch

Dinner

Custom Time

Set stock count

Set appointment date

Enable voice reminder

🔊 Smart Voice Notification (Expo Speech)

Examples:

🌅 Morning → “Good Morning, it's time for your medicine.”

🍛 After Lunch → “Now it's after lunch, please take your medicine.”

🌙 Night → “Good Night, please take your scheduled medicine.”

🔔 Intelligent Notification Engine

At medicine time:

Buttons:

✅ Taken

❌ Skip

⏰ Snooze (5 min)

Rules:

Max 3 reminders

Snooze counts as attempt

After 3 no-actions:

Mark as Missed

Alert Caregiver

Alert Doctor

Escalation Example:

“Prakash missed his After Lunch medicine.”

📦 Medicine Stock Intelligence

Each “Taken” reduces stock

If stock ≤ 2:

Notify Patient

Notify Caregiver

Message:

“Medicine stock is finishing. Please refill.”

📊 Adherence Intelligence Engine
Formula:
Adherence % = (Taken / Total Scheduled) × 100

Dashboard Shows:

Total Doses

Taken Count

Missed Count

Skip Rate

Weekly Graph

Most Missed Time

Average Delay

Current Adherence %

🧠 Adaptive Smart Time Engine

After 3–5 days:

System calculates Mean Delay:

Mean Delay = (Actual Time - Scheduled Time) / Total Days

Example:

Scheduled: 12:30

Avg Delay: +4 min

Next reminder: 12:34

System becomes personalized & adaptive.

👨‍👩‍👧 Caregiver View

Can:

View patient disease

View medicines

View adherence %

View stock

Receive alerts:

Missed 3 times

Low stock

Adherence < 60%

Cannot edit medicines.

🧑‍⚕️ Doctor View

Can:

View assigned patients

View weekly compliance

View skip rate

View appointment dates

Receive adherence alerts

Read-only access.

🤖 Face Scan AI Module

Includes:

Face detection (confidence > 80%)

If no face:

“Face not visible. Please align your face.”

Generates:

❤️ Heart Rate (Simulated 60–100 BPM)

😊 Emotion (Happy, Neutral, Sad, Stressed)

⚡ Stress Level

📄 Health Suggestion

Includes Demo Mode fallback.

🔍 Medicine Search AI

Home screen search bar:

Provides:

What is it?

Why used?

Who should take?

Dosage

Side effects

Languages:

🇬🇧 English

🇮🇳 Marathi

🇮🇳 Gujarati

🎬 Demo Mode

For mentor presentation:

Notification triggers in 10 sec

Escalation in 30 sec

Mock face scan results

Simulated adherence logs

🗄 Database (SQLite)

Tables:

Users

Roles

Medicines

MedicineLogs

AdherenceStats

Relationships

FaceScanReports

🏗 Architecture
/services
  roleService.ts
  authService.ts
  notificationService.ts
  adherenceService.ts
  stockService.ts
  adaptiveTimeService.ts
  faceScanService.ts
  medicineSearchService.ts

Navigation:

PatientStack

CaregiverStack

DoctorStack

🛠 Tech Stack

Expo

React Native

TypeScript

SQLite

Expo Notifications

Expo Speech

Charts Library

ML Mock / TensorFlow Lite (Optional Native)

🚀 Development Strategy
Phase 1: Foundation

Role system

Navigation

SQLite schema

Auth system

Phase 2: Core Patient Engine

Medicine logic

Notification engine

Stock tracking

Phase 3: Intelligence

Adherence analytics

Adaptive time engine

Escalation logic

Phase 4: AI Modules

Face scan

Medicine search

Phase 5: Optimization

Error handling

Permission handling

Offline handling

Demo mode

🌍 Deployment Strategy
Development
npx expo start
Production Build
eas build --platform android
OTA Updates
eas update
Current Live Testing

Use Expo Go:

exp://p_9wfce5gwb0tyl3t8ywond.rork.live
🔒 Security Strategy

Unique patient code linking

Role-based data filtering

Read-only access for caregivers & doctors

Escalation audit logs

Local encrypted SQLite

🎯 Future Improvements

Cloud sync

Real AI rPPG model

Doctor analytics portal

Hospital integration

Firebase push escalation

🏆 Conclusion

OwnMediCare is not just a reminder app.

It is an intelligent, adaptive, multi-role healthcare adherence monitoring platform designed to:

Improve compliance

Reduce missed doses

Support families

Assist doctors

Personalize medicine timing
