-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('MEMBER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "public"."MemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('HAND_TO_HAND', 'BKASH', 'NAGAD', 'ROCKET', 'BANK_TRANSFER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'MEMBER',
    "memberId" SERIAL NOT NULL,
    "fatherName" TEXT,
    "motherName" TEXT,
    "address" TEXT,
    "occupation" TEXT,
    "nid" TEXT,
    "status" "public"."MemberStatus" NOT NULL DEFAULT 'PENDING',
    "joiningDate" TIMESTAMP(3),
    "registrationFee" INTEGER NOT NULL DEFAULT 0,
    "referencePerson" TEXT,
    "referencePhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MemberStats" (
    "id" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "totalDeposited" BIGINT NOT NULL DEFAULT 0,
    "totalPenalties" BIGINT NOT NULL DEFAULT 0,
    "totalContribution" BIGINT NOT NULL DEFAULT 0,
    "monthlyDepositAmount" BIGINT NOT NULL DEFAULT 1000,
    "totalMonthsPaid" INTEGER NOT NULL DEFAULT 0,
    "consecutiveMonths" INTEGER NOT NULL DEFAULT 0,
    "missedMonths" INTEGER NOT NULL DEFAULT 0,
    "lastDepositDate" TIMESTAMP(3),
    "lastDepositMonth" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Deposit" (
    "id" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "depositMonth" TIMESTAMP(3) NOT NULL,
    "depositAmount" BIGINT NOT NULL,
    "penalty" BIGINT NOT NULL DEFAULT 0,
    "totalAmount" BIGINT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" "public"."PaymentMethod" NOT NULL,
    "referencePerson" TEXT NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "proofImage" TEXT,
    "notes" TEXT,
    "approvedBy" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HandToHandPayment" (
    "id" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "handoverDate" TIMESTAMP(3) NOT NULL,
    "handoverTime" TEXT NOT NULL,

    CONSTRAINT "HandToHandPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MobilePayment" (
    "id" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BankTransfer" (
    "id" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "transactionRef" TEXT,

    CONSTRAINT "BankTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MonthlySummary" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "monthNumber" INTEGER NOT NULL,
    "totalDeposited" BIGINT NOT NULL DEFAULT 0,
    "totalPenalties" BIGINT NOT NULL DEFAULT 0,
    "totalCollected" BIGINT NOT NULL DEFAULT 0,
    "totalMembers" INTEGER NOT NULL DEFAULT 0,
    "membersPaid" INTEGER NOT NULL DEFAULT 0,
    "membersNotPaid" INTEGER NOT NULL DEFAULT 0,
    "latePayments" INTEGER NOT NULL DEFAULT 0,
    "pendingDeposits" INTEGER NOT NULL DEFAULT 0,
    "approvedDeposits" INTEGER NOT NULL DEFAULT 0,
    "rejectedDeposits" INTEGER NOT NULL DEFAULT 0,
    "averageDeposit" BIGINT NOT NULL DEFAULT 0,
    "averagePenalty" BIGINT NOT NULL DEFAULT 0,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_config" (
    "id" TEXT NOT NULL,
    "minimumDeposit" BIGINT NOT NULL DEFAULT 1000,
    "penaltyPerThousand" BIGINT NOT NULL DEFAULT 30,
    "penaltyStartDay" INTEGER NOT NULL DEFAULT 16,
    "registrationFee" BIGINT NOT NULL DEFAULT 0,
    "totalSystemDeposits" BIGINT NOT NULL DEFAULT 0,
    "totalSystemPenalties" BIGINT NOT NULL DEFAULT 0,
    "totalSystemAmount" BIGINT NOT NULL DEFAULT 0,
    "totalActiveMembers" INTEGER NOT NULL DEFAULT 0,
    "totalSuspendedMembers" INTEGER NOT NULL DEFAULT 0,
    "totalMembers" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "performedBy" INTEGER,
    "performedByName" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_memberId_key" ON "public"."User"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "User_nid_key" ON "public"."User"("nid");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_memberId_idx" ON "public"."User"("memberId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "public"."User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MemberStats_memberId_key" ON "public"."MemberStats"("memberId");

-- CreateIndex
CREATE INDEX "MemberStats_memberId_idx" ON "public"."MemberStats"("memberId");

-- CreateIndex
CREATE INDEX "Deposit_memberId_idx" ON "public"."Deposit"("memberId");

-- CreateIndex
CREATE INDEX "Deposit_depositMonth_idx" ON "public"."Deposit"("depositMonth");

-- CreateIndex
CREATE INDEX "Deposit_status_idx" ON "public"."Deposit"("status");

-- CreateIndex
CREATE INDEX "Deposit_paymentDate_idx" ON "public"."Deposit"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_memberId_depositMonth_key" ON "public"."Deposit"("memberId", "depositMonth");

-- CreateIndex
CREATE UNIQUE INDEX "HandToHandPayment_depositId_key" ON "public"."HandToHandPayment"("depositId");

-- CreateIndex
CREATE UNIQUE INDEX "MobilePayment_depositId_key" ON "public"."MobilePayment"("depositId");

-- CreateIndex
CREATE INDEX "MobilePayment_transactionId_idx" ON "public"."MobilePayment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransfer_depositId_key" ON "public"."BankTransfer"("depositId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySummary_month_key" ON "public"."MonthlySummary"("month");

-- CreateIndex
CREATE INDEX "MonthlySummary_month_idx" ON "public"."MonthlySummary"("month");

-- CreateIndex
CREATE INDEX "MonthlySummary_year_monthNumber_idx" ON "public"."MonthlySummary"("year", "monthNumber");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_performedBy_idx" ON "public"."AuditLog"("performedBy");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."MemberStats" ADD CONSTRAINT "MemberStats_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."User"("memberId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deposit" ADD CONSTRAINT "Deposit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."User"("memberId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HandToHandPayment" ADD CONSTRAINT "HandToHandPayment_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "public"."Deposit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MobilePayment" ADD CONSTRAINT "MobilePayment_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "public"."Deposit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BankTransfer" ADD CONSTRAINT "BankTransfer_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "public"."Deposit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
