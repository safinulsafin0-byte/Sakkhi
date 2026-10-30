# Sakkhi Data Model Specification

## 1. Overview
The database uses SQLite via Prisma ORM. Models represent evidence files, forensic verification cases, cryptographic certificates, campaigns, milestones, donations, ledger entries, and audit logs.

### Money Rules & Conventions
- **Integer Storage**: All monetary amounts (`amount`, `targetAmount`, etc.) are strictly stored as **integers in the smallest currency unit**:
  - **BDT**: stored in **Poisha** ($1\text{ BDT} = 100\text{ poisha}$). E.g., $5,000\text{ BDT} = 500,000\text{ poisha}$.
  - **USD**: stored in **Cents** ($1\text{ USD} = 100\text{ cents}$).
- **Exchange Rate Configuration**: Fixed conversion rate of **$1\text{ USD} = 120\text{ BDT}$** ($1\text{ BDT} \approx 0.008333\text{ USD}$). PayPal Sandbox payments are executed in USD cents while campaigns track balances in BDT poisha.

---

## 2. Prisma Schema Specification

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      String   @default("DONOR") // COORDINATOR, VOLUNTEER, DONOR
  phone     String?
  avatarUrl String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  coordinatedCampaigns Campaign[]    @relation("CoordinatedCampaigns")
  assignedMilestones   Milestone[]   @relation("AssignedMilestones")
  donations            Donation[]
  submittedMedia       MediaFile[]
  auditLogs            AuditLog[]
}

model Campaign {
  id            String   @id @default(cuid())
  slug          String   @unique
  title         String
  description   String
  location      String
  status        String   @default("ACTIVE") // ACTIVE, COMPLETED, PAUSED
  targetAmount  Int      // in smallest unit: poisha (1 BDT = 100 poisha)
  currency      String   @default("BDT")
  coordinatorId String
  coordinator   User     @relation("CoordinatedCampaigns", fields: [coordinatorId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  milestones    Milestone[]
  donations     Donation[]
  ledgerEntries LedgerEntry[]
  auditLogs     AuditLog[]
  mediaFiles    MediaFile[]
}

model Milestone {
  id                  String    @id @default(cuid())
  campaignId          String
  campaign            Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  title               String
  description         String
  order               Int       @default(1)
  targetAmount        Int       // in smallest unit: poisha
  status              String    @default("PENDING") // PENDING, RESERVED, VERIFIED, RELEASED
  proofChecklist      String    // JSON serialized array of checklist items
  assignedVolunteerId String?
  assignedVolunteer   User?     @relation("AssignedMilestones", fields: [assignedVolunteerId], references: [id], onDelete: SetNull)
  verifiedAt          DateTime?
  releasedAt          DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  mediaFiles    MediaFile[]
  ledgerEntries LedgerEntry[]
  certificates  Certificate[]
  auditLogs     AuditLog[]
}

model Donation {
  id             String        @id @default(cuid())
  campaignId     String
  campaign       Campaign      @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  donorId        String?
  donor          User?         @relation(fields: [donorId], references: [id], onDelete: SetNull)
  donorName      String
  donorEmail     String?
  amount         Int           // in smallest unit: poisha
  currency       String        @default("BDT")
  amountUsdCents Int?          // PayPal Sandbox conversion (1 USD = 120 BDT)
  status         String        @default("COMPLETED") // COMPLETED, REFUNDED, PARTIALLY_REFUNDED, PENDING
  idempotencyKey String        @unique
  paypalOrderId  String?       @unique
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  ledgerEntries LedgerEntry[]
  auditLogs     AuditLog[]
}

model LedgerEntry {
  id             String     @id @default(cuid())
  campaignId     String
  campaign       Campaign   @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  milestoneId    String?
  milestone      Milestone? @relation(fields: [milestoneId], references: [id], onDelete: SetNull)
  donationId     String?
  donation       Donation?  @relation(fields: [donationId], references: [id], onDelete: SetNull)
  type           String     // CREDIT_DONATION, RESERVE_MILESTONE, RELEASE_PAYMENT, REFUND
  amount         Int        // in smallest unit: poisha (always positive)
  currency       String     @default("BDT")
  idempotencyKey String     @unique
  description    String?
  createdAt      DateTime   @default(now())
}

model VerificationCase {
  id          String        @id @default(cuid())
  title       String
  description String?
  status      String        @default("PENDING") // PENDING, PROCESSING, VERIFIED, SUSPICIOUS, TAMPERED
  trustScore  Float         @default(0.0)
  notes       String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  files        MediaFile[]
  certificates Certificate[]
  auditLogs    AuditLog[]
  transactions Transaction[]
}

model MediaFile {
  id          String            @id @default(cuid())
  caseId      String?
  case        VerificationCase? @relation(fields: [caseId], references: [id], onDelete: Cascade)
  campaignId  String?
  campaign    Campaign?         @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  milestoneId String?
  milestone   Milestone?        @relation(fields: [milestoneId], references: [id], onDelete: SetNull)
  uploaderId  String?
  uploader    User?             @relation(fields: [uploaderId], references: [id], onDelete: SetNull)
  filename    String
  mimeType    String
  sizeBytes   Int
  sha256Hash  String
  storagePath String?
  isReceipt   Boolean           @default(false)
  caption     String?
  exifData    String?           // JSON serialized EXIF/IPTC/XMP payload
  hasGps      Boolean           @default(false)
  latitude    Float?
  longitude   Float?
  cameraModel String?
  software    String?
  captureDate DateTime?
  tamperScore Float             @default(0.0) // 0.0 (clean) to 1.0 (heavily tampered)
  aiSummary   String?
  createdAt   DateTime          @default(now())
}

model Certificate {
  id              String            @id @default(cuid())
  caseId          String?
  case            VerificationCase? @relation(fields: [caseId], references: [id], onDelete: Cascade)
  milestoneId     String?
  milestone       Milestone?        @relation(fields: [milestoneId], references: [id], onDelete: Cascade)
  certificateCode String            @unique // e.g. "SKH-YYYYMMDD-XXXX"
  signatureHash   String
  issuer          String            @default("Sakkhi Witness Authority")
  isRevoked       Boolean           @default(false)
  issuedAt        DateTime          @default(now())
}

model AuditLog {
  id          String            @id @default(cuid())
  caseId      String?
  case        VerificationCase? @relation(fields: [caseId], references: [id], onDelete: SetNull)
  campaignId  String?
  campaign    Campaign?         @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  milestoneId String?
  milestone   Milestone?        @relation(fields: [milestoneId], references: [id], onDelete: SetNull)
  donationId  String?
  donation    Donation?         @relation(fields: [donationId], references: [id], onDelete: SetNull)
  actorId     String?
  user        User?             @relation(fields: [actorId], references: [id], onDelete: SetNull)
  action      String            // DONATION_RECORDED, FUNDS_RESERVED, FUNDS_RELEASED, REFUND_ISSUED, etc.
  actor       String            @default("system")
  details     String?           // JSON serialized event metadata
  timestamp   DateTime          @default(now())
}

model Transaction {
  id            String            @id @default(cuid())
  paypalOrderId String?           @unique
  caseId        String?
  case          VerificationCase? @relation(fields: [caseId], references: [id], onDelete: SetNull)
  amount        Float
  currency      String            @default("USD")
  status        String            @default("CREATED") // CREATED, COMPLETED, FAILED, REFUNDED
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
}
```
