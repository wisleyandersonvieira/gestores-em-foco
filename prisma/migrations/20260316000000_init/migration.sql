-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM (
  'START',
  'END',
  'QUESTION_YESNO',
  'QUESTION_MULTIPLE',
  'QUESTION_SCALE',
  'QUESTION_TEXT',
  'GROUP'
);

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "companyName" TEXT,
  "segment" TEXT,
  "employeesCount" INTEGER,
  "role" "Role" NOT NULL DEFAULT 'CLIENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticModel" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "status" "ModelStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticNode" (
  "id" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "nodeType" "NodeType" NOT NULL,
  "label" TEXT,
  "questionText" TEXT,
  "category" TEXT,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "positionX" DOUBLE PRECISION NOT NULL,
  "positionY" DOUBLE PRECISION NOT NULL,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticEdge" (
  "id" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "sourceNodeId" TEXT NOT NULL,
  "targetNodeId" TEXT NOT NULL,
  "conditionLabel" TEXT,
  "conditionValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticLink" (
  "id" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "label" TEXT,
  "assignedUserId" TEXT,
  "status" "LinkStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticResponse" (
  "id" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "answerValue" TEXT NOT NULL,
  "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "DiagnosticNode_modelId_idx" ON "DiagnosticNode"("modelId");

-- CreateIndex
CREATE INDEX "DiagnosticEdge_modelId_idx" ON "DiagnosticEdge"("modelId");

-- CreateIndex
CREATE INDEX "DiagnosticEdge_sourceNodeId_idx" ON "DiagnosticEdge"("sourceNodeId");

-- CreateIndex
CREATE INDEX "DiagnosticEdge_targetNodeId_idx" ON "DiagnosticEdge"("targetNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticLink_token_key" ON "DiagnosticLink"("token");

-- CreateIndex
CREATE INDEX "DiagnosticLink_modelId_idx" ON "DiagnosticLink"("modelId");

-- CreateIndex
CREATE INDEX "DiagnosticLink_assignedUserId_idx" ON "DiagnosticLink"("assignedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticResponse_linkId_userId_nodeId_key" ON "DiagnosticResponse"("linkId", "userId", "nodeId");

-- CreateIndex
CREATE INDEX "DiagnosticResponse_linkId_userId_idx" ON "DiagnosticResponse"("linkId", "userId");

-- CreateIndex
CREATE INDEX "DiagnosticResponse_nodeId_idx" ON "DiagnosticResponse"("nodeId");

-- AddForeignKey
ALTER TABLE "DiagnosticNode"
ADD CONSTRAINT "DiagnosticNode_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "DiagnosticModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticEdge"
ADD CONSTRAINT "DiagnosticEdge_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "DiagnosticModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticEdge"
ADD CONSTRAINT "DiagnosticEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "DiagnosticNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticEdge"
ADD CONSTRAINT "DiagnosticEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "DiagnosticNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticLink"
ADD CONSTRAINT "DiagnosticLink_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "DiagnosticModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticLink"
ADD CONSTRAINT "DiagnosticLink_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticResponse"
ADD CONSTRAINT "DiagnosticResponse_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "DiagnosticLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticResponse"
ADD CONSTRAINT "DiagnosticResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticResponse"
ADD CONSTRAINT "DiagnosticResponse_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DiagnosticNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
