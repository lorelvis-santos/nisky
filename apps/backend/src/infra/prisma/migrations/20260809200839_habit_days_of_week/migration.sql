-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
