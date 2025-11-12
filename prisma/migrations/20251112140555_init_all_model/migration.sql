-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "pic_mitra" TEXT,
    "kontak_mitra" TEXT,
    "pic_partnership" TEXT,
    "logo_mitra_url" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Mom" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "time" TEXT,
    "venue" TEXT,
    "count_attendees" TEXT,
    "content" JSONB,
    "progress_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Mom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Approver" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "email" TEXT,
    "jabatan" TEXT,
    "nik" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MomApprover" (
    "id" SERIAL NOT NULL,
    "mom_id" INTEGER NOT NULL,
    "approver_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MomApprover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MomAttachmentSection" (
    "id" SERIAL NOT NULL,
    "mom_id" INTEGER NOT NULL,
    "section_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomAttachmentSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MomAttachmentFile" (
    "id" SERIAL NOT NULL,
    "section_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomAttachmentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NextAction" (
    "id" SERIAL NOT NULL,
    "mom_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "pic" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NextAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JikApprover" (
    "id" SERIAL NOT NULL,
    "jik_id" INTEGER NOT NULL,
    "approver_id" INTEGER NOT NULL,
    "approver_type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JikApprover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Jik" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "judul" TEXT NOT NULL,
    "no" TEXT,
    "nama" TEXT,
    "nama_unit" TEXT,
    "initiative_partnership" TEXT,
    "invest_value" TEXT,
    "contract_duration_years" INTEGER,
    "document_initiative" JSONB,
    "progress_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Jik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Progress" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "step_id" INTEGER,
    "status_id" INTEGER,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Step" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Status" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" SERIAL NOT NULL,
    "progress_id" INTEGER NOT NULL,
    "document_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- AddForeignKey
ALTER TABLE "public"."Mom" ADD CONSTRAINT "Mom_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mom" ADD CONSTRAINT "Mom_progress_id_fkey" FOREIGN KEY ("progress_id") REFERENCES "public"."Progress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MomApprover" ADD CONSTRAINT "MomApprover_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."Approver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MomApprover" ADD CONSTRAINT "MomApprover_mom_id_fkey" FOREIGN KEY ("mom_id") REFERENCES "public"."Mom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MomAttachmentSection" ADD CONSTRAINT "MomAttachmentSection_mom_id_fkey" FOREIGN KEY ("mom_id") REFERENCES "public"."Mom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MomAttachmentFile" ADD CONSTRAINT "MomAttachmentFile_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."MomAttachmentSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NextAction" ADD CONSTRAINT "NextAction_mom_id_fkey" FOREIGN KEY ("mom_id") REFERENCES "public"."Mom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JikApprover" ADD CONSTRAINT "JikApprover_jik_id_fkey" FOREIGN KEY ("jik_id") REFERENCES "public"."Jik"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JikApprover" ADD CONSTRAINT "JikApprover_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."Approver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Jik" ADD CONSTRAINT "Jik_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Jik" ADD CONSTRAINT "Jik_progress_id_fkey" FOREIGN KEY ("progress_id") REFERENCES "public"."Progress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Progress" ADD CONSTRAINT "Progress_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Progress" ADD CONSTRAINT "Progress_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "public"."Step"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Progress" ADD CONSTRAINT "Progress_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."Status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_progress_id_fkey" FOREIGN KEY ("progress_id") REFERENCES "public"."Progress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
