-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "inviteLink" TEXT,
ADD COLUMN     "inviteLinkExpires" TIMESTAMP(3),
ADD COLUMN     "planDays" INTEGER NOT NULL DEFAULT 30;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
