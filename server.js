const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodeCron = require('node-cron');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ownmedicare';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ==================== MONGODB SCHEMAS ====================

// Patient Schema
const patientSchema = new mongoose.Schema({
  uniqueCode: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  fullName: { 
    type: String, 
    required: true 
  },
  age: { 
    type: Number, 
    required: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  deviceToken: String, // For push notifications
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Doctor Schema
const doctorSchema = new mongoose.Schema({
  uniqueCode: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  username: { type: String, required: true },
  fullName: { type: String, required: true },
  password: { type: String, required: true },
  specialization: { type: String, required: true },
  deviceToken: String,
  createdAt: { type: Date, default: Date.now }
});

// Caregiver Schema
const caregiverSchema = new mongoose.Schema({
  uniqueCode: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  username: { type: String, required: true },
  fullName: { type: String, required: true },
  password: { type: String, required: true },
  relation: { type: String, required: true },
  phone: String,
  deviceToken: String,
  createdAt: { type: Date, default: Date.now }
});

// Connection Schema
const connectionSchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient',
    required: true 
  },
  providerId: { type: mongoose.Schema.Types.ObjectId },
  providerType: { 
    type: String, 
    enum: ['doctor', 'caregiver'],
    required: true 
  },
  linkedAt: { type: Date, default: Date.now }
});

// Medicine Schedule Schema (NEW - for reminders)
const medicineScheduleSchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient',
    required: true,
    index: true
  },
  patientCode: { 
    type: String, 
    required: true,
    index: true
  },
  medicineName: { 
    type: String, 
    required: true 
  },
  dosage: String,
  scheduleTime: { 
    type: String, 
    required: true 
  },
  scheduleType: { 
    type: String, 
    enum: ['Breakfast', 'After Lunch', 'Dinner', 'Custom Time'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'taken', 'skipped', 'missed'],
    default: 'pending'
  },
  snoozeCount: { 
    type: Number, 
    default: 0 
  },
  maxSnooze: { 
    type: Number, 
    default: 3 
  },
  lastActionTime: Date,
  nextReminderTime: Date,
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Notification Schema
const notificationSchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient',
    required: true
  },
  type: { 
    type: String, 
    enum: ['reminder', 'alert'],
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['sent', 'read', 'action_taken'],
    default: 'sent' 
  },
  medicineScheduleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MedicineSchedule' 
  },
  sentAt: { 
    type: Date, 
    default: Date.now 
  },
  readAt: Date
});

// Medicine Log Schema
const medicineLogSchema = new mongoose.Schema({
  medicineScheduleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MedicineSchedule',
    required: true 
  },
  scheduledTime: { type: String, required: true },
  actionTime: Date,
  status: { 
    type: String, 
    enum: ['Taken', 'Skipped', 'Missed', 'Snoozed'],
    required: true 
  },
  snoozeCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Adherence Stats Schema
const adherenceStatsSchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient',
    required: true 
  },
  date: { type: String, required: true },
  totalDoses: Number,
  takenDoses: Number,
  skippedDoses: Number,
  missedDoses: Number,
  adherencePercent: Number
});

// ==================== MODELS ====================
const Patient = mongoose.model('Patient', patientSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);
const Caregiver = mongoose.model('Caregiver', caregiverSchema);
const Connection = mongoose.model('Connection', connectionSchema);
const MedicineSchedule = mongoose.model('MedicineSchedule', medicineScheduleSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const MedicineLog = mongoose.model('MedicineLog', medicineLogSchema);
const AdherenceStats = mongoose.model('AdherenceStats', adherenceStatsSchema);

// ==================== UTILITY FUNCTIONS ====================

function generateUniqueCode(prefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, uniqueCode: user.uniqueCode },
    process.env.JWT_SECRET || 'ownmedicare_secret_key',
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'ownmedicare_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Send push notification (placeholder - integrate with Firebase/Expo)
async function sendPushNotification(deviceToken, title, body, data) {
  console.log(`📱 Push notification to ${deviceToken}: ${title} - ${body}`);
  // In production, integrate with Firebase Cloud Messaging or Expo Push
  return { success: true };
}

// Send alert to caregiver/doctor
async function sendAlertToCareTeam(patientId, medicineName, scheduleTime) {
  try {
    // Find connected caregivers and doctors
    const connections = await Connection.find({ patientId });
    
    for (const conn of connections) {
      let provider;
      let providerType;
      
      if (conn.providerType === 'doctor') {
        provider = await Doctor.findById(conn.providerId);
        providerType = 'Doctor';
      } else if (conn.providerType === 'caregiver') {
        provider = await Caregiver.findById(conn.providerId);
        providerType = 'Caregiver';
      }
      
      if (provider && provider.deviceToken) {
        const message = `⚠️ ALERT: Patient has skipped their scheduled medicine "${medicineName}" at ${scheduleTime}`;
        
        await sendPushNotification(
          provider.deviceToken,
          'Patient Missed Medicine!',
          message,
          { type: 'alert', patientId }
        );
        
        // Save notification
        await Notification.create({
          patientId,
          type: 'alert',
          message,
          status: 'sent'
        });
      }
    }
  } catch (error) {
    console.error('Error sending alert:', error);
  }
}

// Calculate next reminder time
function calculateNextReminderTime(scheduleTime, scheduleType) {
  const now = new Date();
  let [hours, minutes] = scheduleTime.split(':').map(Number);
  
  // Parse AM/PM if present
  if (scheduleTime.includes('PM') && hours !== 12) hours += 12;
  if (scheduleTime.includes('AM') && hours === 12) hours = 0;
  
  let nextTime = new Date();
  nextTime.setHours(hours, minutes, 0, 0);
  
  // If time has passed today, schedule for tomorrow
  if (nextTime <= now) {
    nextTime.setDate(nextTime.getDate() + 1);
  }
  
  return nextTime;
}

// ==================== AUTH ROUTES ====================

app.post('/api/auth/patient/register', async (req, res) => {
  try {
    const { username, fullName, age, password } = req.body;
    
    const existingPatient = await Patient.findOne({ username });
    if (existingPatient) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const uniqueCode = 'OM-' + generateUniqueCode('');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const patient = new Patient({
      uniqueCode,
      username,
      fullName,
      age,
      password: hashedPassword
    });
    
    await patient.save();
    
    const token = generateToken({ 
      _id: patient._id, 
      role: 'patient', 
      uniqueCode: patient.uniqueCode 
    });
    
    res.status(201).json({
      message: 'Patient registered successfully',
      token,
      user: {
        id: patient._id,
        uniqueCode: patient.uniqueCode,
        username: patient.username,
        fullName: patient.fullName,
        age: patient.age,
        role: 'Patient'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/doctor/register', async (req, res) => {
  try {
    const { username, fullName, specialization, password } = req.body;
    
    const uniqueCode = 'DR-' + generateUniqueCode('');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const doctor = new Doctor({
      uniqueCode,
      username,
      fullName,
      specialization,
      password: hashedPassword
    });
    
    await doctor.save();
    
    const token = generateToken({ 
      _id: doctor._id, 
      role: 'doctor', 
      uniqueCode: doctor.uniqueCode 
    });
    
    res.status(201).json({
      message: 'Doctor registered successfully',
      token,
      user: {
        id: doctor._id,
        uniqueCode: doctor.uniqueCode,
        username: doctor.username,
        fullName: doctor.fullName,
        specialization: doctor.specialization,
        role: 'Doctor'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/caregiver/register', async (req, res) => {
  try {
    const { username, fullName, relation, password } = req.body;
    
    const uniqueCode = 'CD-' + generateUniqueCode('');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const caregiver = new Caregiver({
      uniqueCode,
      username,
      fullName,
      relation,
      password: hashedPassword
    });
    
    await caregiver.save();
    
    const token = generateToken({ 
      _id: caregiver._id, 
      role: 'caregiver', 
      uniqueCode: caregiver.uniqueCode 
    });
    
    res.status(201).json({
      message: 'Caregiver registered successfully',
      token,
      user: {
        id: caregiver._id,
        uniqueCode: caregiver.uniqueCode,
        username: caregiver.username,
        fullName: caregiver.fullName,
        relation: caregiver.relation,
        role: 'Caregiver'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    let user;
    if (role === 'Patient') {
      user = await Patient.findOne({ username });
    } else if (role === 'Doctor') {
      user = await Doctor.findOne({ username });
    } else if (role === 'Caregiver') {
      user = await Caregiver.findOne({ username });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken({ 
      _id: user._id, 
      role: user.role || role.toLowerCase(), 
      uniqueCode: user.uniqueCode 
    });
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        uniqueCode: user.uniqueCode,
        username: user.username,
        fullName: user.fullName,
        role: role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register device token for push notifications
app.post('/api/auth/register-device', authenticateToken, async (req, res) => {
  try {
    const { deviceToken } = req.body;
    
    const updateData = { deviceToken };
    
    if (req.user.role === 'patient') {
      await Patient.findByIdAndUpdate(req.user.id, updateData);
    } else if (req.user.role === 'doctor') {
      await Doctor.findByIdAndUpdate(req.user.id, updateData);
    } else if (req.user.role === 'caregiver') {
      await Caregiver.findByIdAndUpdate(req.user.id, updateData);
    }
    
    res.json({ message: 'Device token registered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MEDICINE SCHEDULE ROUTES ====================

// POST /schedule-medicine - Create medicine schedule
app.post('/api/schedule-medicine', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can schedule medicines' });
    }
    
    const { medicineName, dosage, scheduleTime, scheduleType, maxSnooze = 3 } = req.body;
    
    // Get patient code
    const patient = await Patient.findById(req.user.id);
    
    // Calculate next reminder time
    const nextReminderTime = calculateNextReminderTime(scheduleTime, scheduleType);
    
    const schedule = new MedicineSchedule({
      patientId: req.user.id,
      patientCode: patient.uniqueCode,
      medicineName,
      dosage,
      scheduleTime,
      scheduleType,
      maxSnooze,
      nextReminderTime,
      status: 'pending'
    });
    
    await schedule.save();
    
    // Create notification record
    await Notification.create({
      patientId: req.user.id,
      type: 'reminder',
      message: `Time to take ${medicineName}`,
      medicineScheduleId: schedule._id,
      status: 'sent'
    });
    
    res.status(201).json({
      message: 'Medicine scheduled successfully',
      schedule: {
        id: schedule._id,
        medicineName,
        scheduleTime,
        scheduleType,
        nextReminderTime,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /patient-medicines - Get all medicine schedules for patient
app.get('/api/patient-medicines', authenticateToken, async (req, res) => {
  try {
    const schedules = await MedicineSchedule.find({ 
      patientId: req.user.id,
      isActive: true 
    }).sort({ scheduleTime: 1 });
    
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /patient-medicines/today - Get today's medicine schedules
app.get('/api/patient-medicines/today', authenticateToken, async (req, res) => {
  try {
    const schedules = await MedicineSchedule.find({ 
      patientId: req.user.id,
      isActive: true,
      status: { $in: ['pending', 'taken', 'skipped'] }
    }).sort({ scheduleTime: 1 });
    
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /action - Handle patient response (taken/snooze/skip)
app.post('/api/action', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can take action' });
    }
    
    const { scheduleId, action } = req.body; // action: 'taken', 'snooze', 'skip'
    
    const schedule = await MedicineSchedule.findById(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Medicine schedule not found' });
    }
    
    if (schedule.patientId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const now = new Date();
    
    if (action === 'taken') {
      // Mark as taken
      schedule.status = 'taken';
      schedule.lastActionTime = now;
      await schedule.save();
      
      // Create log
      await MedicineLog.create({
        medicineScheduleId: schedule._id,
        scheduledTime: schedule.scheduleTime,
        actionTime: now,
        status: 'Taken',
        snoozeCount: schedule.snoozeCount
      });
      
      // Update adherence stats
      await updateAdherenceStats(schedule.patientId);
      
      res.json({ 
        message: '✅ Medicine marked as taken!',
        status: 'taken'
      });
      
    } else if (action === 'snooze') {
      // Increment snooze count
      schedule.snoozeCount += 1;
      
      if (schedule.snoozeCount >= schedule.maxSnooze) {
        // Max snoozes reached - mark as missed and alert
        schedule.status = 'missed';
        schedule.lastActionTime = now;
        await schedule.save();
        
        await MedicineLog.create({
          medicineScheduleId: schedule._id,
          scheduledTime: schedule.scheduleTime,
          actionTime: now,
          status: 'Missed',
          snoozeCount: schedule.snoozeCount
        });
        
        // Send alert to caregiver/doctor
        await sendAlertToCareTeam(
          schedule.patientId,
          schedule.medicineName,
          schedule.scheduleTime
        );
        
        // Update adherence
        await updateAdherenceStats(schedule.patientId);
        
        res.json({ 
          message: '⚠️ Maximum snoozes reached. Care team has been alerted.',
          status: 'missed',
          snoozeCount: schedule.snoozeCount
        });
      } else {
        // Schedule next reminder in 2 seconds (configurable)
        const snoozeTime = new Date(now.getTime() + 2000); // 2 seconds
        schedule.nextReminderTime = snoozeTime;
        await schedule.save();
        
        await MedicineLog.create({
          medicineScheduleId: schedule._id,
          scheduledTime: schedule.scheduleTime,
          actionTime: now,
          status: 'Snoozed',
          snoozeCount: schedule.snoozeCount
        });
        
        res.json({ 
          message: `⏰ Snoozed! Reminder in 2 seconds (${schedule.snoozeCount}/${schedule.maxSnooze})`,
          status: 'snoozed',
          nextReminderTime: snoozeTime,
          snoozeCount: schedule.snoozeCount
        });
      }
      
    } else if (action === 'skip') {
      // Mark as skipped
      schedule.status = 'skipped';
      schedule.lastActionTime = now;
      await schedule.save();
      
      await MedicineLog.create({
        medicineScheduleId: schedule._id,
        scheduledTime: schedule.scheduleTime,
        actionTime: now,
        status: 'Skipped',
        snoozeCount: schedule.snoozeCount
      });
      
      // Send alert to caregiver/doctor immediately
      await sendAlertToCareTeam(
        schedule.patientId,
        schedule.medicineName,
        schedule.scheduleTime
      );
      
      // Update adherence
      await updateAdherenceStats(schedule.patientId);
      
      res.json({ 
        message: '❌ Medicine skipped. Care team has been alerted.',
        status: 'skipped'
      });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /adherence - Get adherence stats
app.get('/api/adherence', authenticateToken, async (req, res) => {
  try {
    const stats = await AdherenceStats.find({ 
      patientId: req.user.id 
    }).sort({ date: -1 }).limit(30);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /notifications - Get patient notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      patientId: req.user.id 
    }).sort({ sentAt: -1 }).limit(50);
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROVIDER ROUTES ====================

app.get('/api/provider/find-patient/:code', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findOne({ uniqueCode: req.params.code })
      .select('uniqueCode fullName age');
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/provider/link-patient', authenticateToken, async (req, res) => {
  try {
    const { patientCode } = req.body;
    const providerType = req.user.role;
    
    const patient = await Patient.findOne({ uniqueCode: patientCode });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const existingConnection = await Connection.findOne({
      patientId: patient._id,
      providerId: req.user.id,
      providerType
    });
    
    if (existingConnection) {
      return res.status(400).json({ error: 'Already linked with this patient' });
    }
    
    const connection = new Connection({
      patientId: patient._id,
      providerId: req.user.id,
      providerType
    });
    
    await connection.save();
    
    res.json({ 
      message: 'Successfully linked with patient',
      patient: {
        uniqueCode: patient.uniqueCode,
        fullName: patient.fullName,
        age: patient.age
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/provider/patients', authenticateToken, async (req, res) => {
  try {
    const connections = await Connection.find({
      providerId: req.user.id,
      providerType: req.user.role
    }).populate('patientId', 'uniqueCode fullName age');
    
    const patients = connections.map(conn => ({
      uniqueCode: conn.patientId.uniqueCode,
      fullName: conn.patientId.fullName,
      age: conn.patientId.age,
      linkedAt: conn.linkedAt
    }));
    
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get patient details for provider
app.get('/api/provider/patient/:id/details', authenticateToken, async (req, res) => {
  try {
    const connection = await Connection.findOne({
      patientId: req.params.id,
      providerId: req.user.id,
      providerType: req.user.role
    });
    
    if (!connection) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const patient = await Patient.findById(req.params.id)
      .select('fullName age uniqueCode');
    
    const schedules = await MedicineSchedule.find({ 
      patientId: req.params.id,
      isActive: true 
    });
    
    const adherence = await AdherenceStats.find({ 
      patientId: req.params.id 
    }).sort({ date: -1 }).limit(7);
    
    res.json({
      patient,
      medicines: schedules,
      adherence
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function updateAdherenceStats(patientId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const schedules = await MedicineSchedule.find({
      patientId,
      isActive: true,
      createdAt: { $gte: new Date(today) }
    });
    
    const taken = schedules.filter(s => s.status === 'taken').length;
    const skipped = schedules.filter(s => s.status === 'skipped').length;
    const missed = schedules.filter(s => s.status === 'missed').length;
    const total = schedules.length;
    
    const adherencePercent = total > 0 ? Math.round((taken / total) * 100) : 0;
    
    await AdherenceStats.findOneAndUpdate(
      { patientId, date: today },
      {
        patientId,
        date: today,
        totalDoses: total,
        takenDoses: taken,
        skippedDoses: skipped,
        missedDoses: missed,
        adherencePercent
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error updating adherence:', error);
  }
}

// ==================== CRON JOBS FOR REMINDERS ====================

// Check every minute for due reminders
nodeCron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    // Find all pending schedules that are due
    const dueSchedules = await MedicineSchedule.find({
      isActive: true,
      status: 'pending',
      nextReminderTime: { $lte: now }
    });
    
    for (const schedule of dueSchedules) {
      // Get patient device token
      const patient = await Patient.findById(schedule.patientId);
      
      if (patient && patient.deviceToken) {
        const message = `💊 It's your medicine time! Please take ${schedule.medicineName}`;
        
        await sendPushNotification(
          patient.deviceToken,
          'Time for Medicine',
          message,
          { 
            type: 'reminder', 
            scheduleId: schedule._id.toString(),
            medicineName: schedule.medicineName
          }
        );
        
        // Save notification
        await Notification.create({
          patientId: schedule.patientId,
          type: 'reminder',
          message,
          medicineScheduleId: schedule._id,
          status: 'sent'
        });
        
        console.log(`📱 Reminder sent for ${schedule.medicineName} to ${patient.fullName}`);
      }
    }
  } catch (error) {
    console.error('Error in reminder cron:', error);
  }
});

// Check for missed medicines every hour
nodeCron.schedule('0 * * * *', async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Find pending schedules that are more than 1 hour overdue
    const missedSchedules = await MedicineSchedule.find({
      isActive: true,
      status: 'pending',
      nextReminderTime: { $lt: oneHourAgo }
    });
    
    for (const schedule of missedSchedules) {
      // Mark as missed
      schedule.status = 'missed';
      await schedule.save();
      
      // Log it
      await MedicineLog.create({
        medicineScheduleId: schedule._id,
        scheduledTime: schedule.scheduleTime,
        actionTime: new Date(),
        status: 'Missed',
        snoozeCount: schedule.snoozeCount
      });
      
      // Alert caregiver/doctor
      await sendAlertToCareTeam(
        schedule.patientId,
        schedule.medicineName,
        schedule.scheduleTime
      );
      
      // Update adherence
      await updateAdherenceStats(schedule.patientId);
      
      console.log(`⚠️ Marked as missed: ${schedule.medicineName}`);
    }
  } catch (error) {
    console.error('Error in missed check cron:', error);
  }
});

// Reset daily statuses at midnight
nodeCron.schedule('0 0 * * *', async () => {
  try {
    // Reset all pending schedules for a new day
    await MedicineSchedule.updateMany(
      { status: { $in: ['pending', 'taken', 'skipped', 'missed'] } },
      { 
        $set: { 
          status: 'pending',
          snoozeCount: 0,
          lastActionTime: null
        }
      }
    );
    
    console.log('🔄 Daily schedule reset completed');
  } catch (error) {
    console.error('Error in daily reset cron:', error);
  }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🏥 OwnMediCare Server running on port ${PORT}`);
  console.log(`⏰ Cron jobs active for medicine reminders`);
});

module.exports = app;
