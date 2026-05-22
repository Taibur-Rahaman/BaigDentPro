# BaigDentPro - Backend Integration Guide

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    BaigDentPro Frontend (React)                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Login Screen │ Prescription │ Records │ Analytics      │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                  Backend Server (Node/Python/etc)            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Auth │ Users │ Patients │ Prescriptions │ Billing     │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓ Database Queries
┌─────────────────────────────────────────────────────────────┐
│              Database (PostgreSQL/MySQL/MongoDB)             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Users │ Patients │ Prescriptions │ Bills │ Appointments│ │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Required Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role ENUM('admin', 'doctor', 'receptionist', 'accountant'),
  clinic_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);
```

### Patients Table
```sql
CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  patient_id VARCHAR(50) UNIQUE,
  clinic_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  age INT,
  gender ENUM('M', 'F', 'Other'),
  blood_group VARCHAR(10),
  mobile VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  occupation VARCHAR(100),
  due DECIMAL(10, 2) DEFAULT 0,
  image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  INDEX idx_clinic_patient (clinic_id, name)
);
```

### Prescriptions Table
```sql
CREATE TABLE prescriptions (
  id SERIAL PRIMARY KEY,
  clinic_id INT NOT NULL,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  prescription_date DATE NOT NULL,
  diagnosis TEXT,
  chief_complaint TEXT,
  examination_notes JSON,
  investigation TEXT,
  drug_history TEXT,
  follow_up_date DATE,
  status ENUM('draft', 'saved', 'printed', 'archived') DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);
```

### Prescription Items Table
```sql
CREATE TABLE prescription_items (
  id SERIAL PRIMARY KEY,
  prescription_id INT NOT NULL,
  drug_name VARCHAR(255) NOT NULL,
  dose VARCHAR(100),
  duration INT,
  duration_unit ENUM('D', 'M', 'Y'),
  frequency VARCHAR(100),
  before_food BOOLEAN DEFAULT FALSE,
  after_food BOOLEAN DEFAULT FALSE,
  instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);
```

### Appointments Table
```sql
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  clinic_id INT NOT NULL,
  patient_id INT NOT NULL,
  doctor_id INT,
  appointment_date DATETIME NOT NULL,
  duration_minutes INT DEFAULT 30,
  status ENUM('scheduled', 'completed', 'cancelled', 'no-show') DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);
```

### Billing Table
```sql
CREATE TABLE bills (
  id SERIAL PRIMARY KEY,
  clinic_id INT NOT NULL,
  patient_id INT NOT NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  balance DECIMAL(10, 2) NOT NULL,
  bill_date DATE NOT NULL,
  due_date DATE,
  payment_method VARCHAR(100),
  status ENUM('draft', 'issued', 'partial', 'paid', 'cancelled') DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
```

### Medical History Table
```sql
CREATE TABLE medical_histories (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL UNIQUE,
  bp VARCHAR(20),
  heart_disease VARCHAR(255),
  diabetic VARCHAR(255),
  hepatitis VARCHAR(255),
  bleeding_disorder VARCHAR(255),
  allergy VARCHAR(255),
  pregnant_lactating VARCHAR(255),
  other_conditions TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);
```

## Required API Endpoints

### Authentication
```
POST   /api/auth/login          - User login
POST   /api/auth/logout         - User logout
POST   /api/auth/refresh-token  - Refresh JWT token
POST   /api/auth/register       - User registration (admin only)
```

### Patients
```
GET    /api/patients            - List all patients
GET    /api/patients/:id        - Get patient details
POST   /api/patients            - Create new patient
PUT    /api/patients/:id        - Update patient
DELETE /api/patients/:id        - Delete patient
GET    /api/patients/search?q=  - Search patients
```

### Prescriptions
```
GET    /api/prescriptions       - List prescriptions
GET    /api/prescriptions/:id   - Get prescription details
POST   /api/prescriptions       - Create new prescription
PUT    /api/prescriptions/:id   - Update prescription
DELETE /api/prescriptions/:id   - Delete prescription
GET    /api/prescriptions/patient/:patientId - Get patient prescriptions
POST   /api/prescriptions/:id/print - Generate PDF
```

### Appointments
```
GET    /api/appointments        - List appointments
POST   /api/appointments        - Create appointment
PUT    /api/appointments/:id    - Update appointment
DELETE /api/appointments/:id    - Cancel appointment
GET    /api/appointments/date-range?from=&to= - Get appointments in date range
```

### Billing
```
GET    /api/bills              - List bills
POST   /api/bills              - Create bill
GET    /api/bills/:id          - Get bill details
PUT    /api/bills/:id          - Update bill
POST   /api/bills/:id/payment  - Record payment
GET    /api/reports/revenue    - Revenue reports
```

## Frontend API Integration Example

```typescript
// services/api.ts
const API_BASE_URL = 'http://localhost:3000/api';

export const apiClient = {
  // Authentication
  login: (username: string, password: string) =>
    fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then(r => r.json()),

  // Patients
  getPatients: () =>
    fetch(`${API_BASE_URL}/patients`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    }).then(r => r.json()),

  createPrescription: (data) =>
    fetch(`${API_BASE_URL}/prescriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  // ... more methods
};
```

## Environment Configuration

Create a `.env` file in the project root:

```env
# Frontend
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=BaigDentPro Dental Suite

# Backend (for reference)
DATABASE_URL=postgresql://user:password@localhost:5432/baigdentpro
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h

# Third-party services
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Data Flow Examples

### New Patient Creation Flow
```
1. User fills patient form in Records module
2. Frontend validates data
3. POST /api/patients with patient data
4. Backend saves to database, returns patient ID
5. Frontend stores in local state
6. Success notification shown to user
```

### Prescription Workflow
```
1. Doctor selects patient
2. Fills prescription form
3. Clicks "Save & Print"
4. Frontend sends POST /api/prescriptions
5. Backend creates prescription record
6. Backend generates PDF
7. Returns PDF URL
8. Frontend triggers download/print
```

### Appointment Scheduling
```
1. User clicks "Book Appointment"
2. Selects patient and date
3. Frontend calls POST /api/appointments
4. Backend checks availability
5. Creates appointment record
6. Triggers SMS notification via Twilio
7. Returns confirmation
8. Frontend updates calendar view
```

## Error Handling

```typescript
// Standard API response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

// Frontend error handling
try {
  const response = await fetch('/api/patients', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const result = await response.json();
  
  if (!result.success) {
    // Handle error
    showErrorMessage(result.error.message);
  }
} catch (error) {
  // Network error
  showErrorMessage('Connection failed');
}
```

## Security Best Practices

1. **Authentication**: Use JWT with secure HttpOnly cookies
2. **Authorization**: Implement role-based access control
3. **Data Validation**: Validate all inputs server-side
4. **Encryption**: Use HTTPS for all communications
5. **HIPAA Compliance**: Encrypt patient data at rest
6. **Audit Logging**: Log all sensitive operations
7. **Rate Limiting**: Prevent brute force attacks
8. **SQL Injection Prevention**: Use parameterized queries

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## Deployment

### Environment Setup
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to server
npm run deploy
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## Monitoring & Logging

- Implement centralized logging (ELK Stack, Datadog)
- Monitor API response times
- Track error rates
- Monitor database performance
- Set up alerts for critical errors

## Support & Documentation

- API Documentation: Swagger/OpenAPI format
- Database schema documentation
- Architecture decision records
- Development guidelines
- Troubleshooting guide

---

This system is designed for scalability and professional healthcare use. All components are structured for easy backend integration and enterprise deployment.
