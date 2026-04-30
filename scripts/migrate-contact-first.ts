/**
 * Data Migration Script: Member → Contact + MembershipEnrollment
 * 
 * This script migrates the JanaGana database from a Member-first architecture
 * to a Contact-first architecture as outlined in DATA_MODEL_MIGRATION_PLAN.md
 * 
 * Prerequisites:
 * - Database backup completed
 * - Schema migration applied (dual foreign keys in place)
 * - Run in maintenance window
 * 
 * Usage:
 *   npx tsx scripts/migrate-contact-first.ts
 * 
 * Rollback:
 *   npx tsx scripts/rollback-contact-first.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
const BATCH_SIZE = 100;
const DRY_RUN = process.env.DRY_RUN === 'true';

interface MigrationStats {
  membersProcessed: number;
  contactsCreated: number;
  enrollmentsCreated: number;
  foreignKeysUpdated: number;
  errors: number;
}

const stats: MigrationStats = {
  membersProcessed: 0,
  contactsCreated: 0,
  enrollmentsCreated: 0,
  foreignKeysUpdated: 0,
  errors: 0,
};

/**
 * Migrate a single Member to Contact + MembershipEnrollment
 */
async function migrateMember(member: any) {
  try {
    // Step 1: Create Contact record
    const contactData = {
      tenantId: member.tenantId,
      memberId: member.id, // Link to legacy Member
      externalIds: {
        stripeCustomerId: member.stripeCustomerId,
      },
      emails: [member.email], // Primary email at index 0
      phones: member.phone ? [member.phone] : [],
      firstName: member.firstName,
      lastName: member.lastName,
      avatarUrl: member.avatarUrl,
      dateOfBirth: member.dateOfBirth,
      address: member.address,
      city: member.city,
      state: member.state,
      postalCode: member.postalCode,
      country: member.country,
      source: 'migration',
      lifecycleStage: (member.status === 'ACTIVE' ? 'MEMBER' : 'PROSPECT') as import('@prisma/client').LifecycleStage,
      clerkUserId: member.clerkUserId,
      companyId: null, // Will be updated from existing Contact if exists
      jobTitle: null,
      linkedinUrl: null,
      companyName: null,
      tags: [],
      notes: member.notes,
    };

    let contact;
    if (!DRY_RUN) {
      contact = await prisma.contact.create({
        data: contactData,
      });
      stats.contactsCreated++;
    } else {
      console.log(`[DRY RUN] Would create Contact for Member ${member.id}`);
      contact = { id: 'dry-run-id', ...contactData };
    }

    // Step 2: Create MembershipEnrollment record
    if (member.tierId || member.status === 'ACTIVE') {
      const enrollmentData = {
        tenantId: member.tenantId,
        contactId: contact.id,
        tierId: member.tierId,
        status: member.status,
        startDate: member.joinedAt,
        endDate: null,
        renewalDate: member.renewsAt,
        stripeCustomerId: member.stripeCustomerId,
        stripeSubscriptionId: member.stripeSubscriptionId,
        paymentStatus: 'active',
        memberNumber: null,
        benefits: [],
        notes: member.notes,
        chapterId: member.chapterId,
      };

      if (!DRY_RUN) {
        await prisma.membershipEnrollment.create({
          data: enrollmentData,
        });
        stats.enrollmentsCreated++;
      } else {
        console.log(`[DRY RUN] Would create MembershipEnrollment for Contact ${contact.id}`);
      }
    }

    // Step 3: Update foreign keys in related tables
    await updateForeignKeys(member.id, contact.id);

    stats.membersProcessed++;
    
    if (stats.membersProcessed % BATCH_SIZE === 0) {
      console.log(`Processed ${stats.membersProcessed} members...`);
    }
  } catch (error) {
    console.error(`Error migrating member ${member.id}:`, error);
    stats.errors++;
  }
}

/**
 * Update foreign key references from memberId to contactId
 */
async function updateForeignKeys(memberId: string, contactId: string) {
  const updates = [
    // EventRegistration
    prisma.eventRegistration.updateMany({
      where: { memberId },
      data: { contactId },
    }),
    // VolunteerSignup
    prisma.volunteerSignup.updateMany({
      where: { memberId },
      data: { contactId },
    }),
    // Donation
    prisma.donation.updateMany({
      where: { memberId },
      data: { contactId },
    }),
    // ClubMembership
    prisma.clubMembership.updateMany({
      where: { memberId },
      data: { contactId },
    }),
    // ClubPost
    prisma.clubPost.updateMany({
      where: { memberId },
      data: { contactId },
    }),
    // Notification
    prisma.notification.updateMany({
      where: { memberId },
      data: { contactId },
    }),
    // JobPosting
    prisma.jobPosting.updateMany({
      where: { postedByMemberId: memberId },
      data: { postedByContactId: contactId },
    }),
    // ForumThread
    prisma.forumThread.updateMany({
      where: { authorMemberId: memberId },
      data: { authorContactId: contactId },
    }),
    // ForumReply
    prisma.forumReply.updateMany({
      where: { authorMemberId: memberId },
      data: { authorContactId: contactId },
    }),
    // ChapterMember
    prisma.chapterMember.updateMany({
      where: { memberId },
      data: { contactId },
    }),
  ];

  if (!DRY_RUN) {
    const results = await Promise.all(updates);
    const totalUpdated = results.reduce((sum, r) => sum + r.count, 0);
    stats.foreignKeysUpdated += totalUpdated;
  } else {
    console.log(`[DRY RUN] Would update foreign keys for Member ${memberId} → Contact ${contactId}`);
  }
}

/**
 * Migrate custom field values
 */
async function migrateCustomFields() {
  console.log('Migrating custom field values...');
  
  const customFields = await prisma.memberCustomField.findMany();
  
  for (const field of customFields) {
    // Create corresponding ContactCustomField
    if (!DRY_RUN) {
      await prisma.contactCustomField.create({
        data: {
          tenantId: field.tenantId,
          fieldName: field.fieldName,
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          isActive: field.isActive,
          options: field.options,
          sortOrder: field.sortOrder,
          helpText: field.helpText,
        },
      });
    }
  }

  // Migrate values
  const values = await prisma.memberCustomFieldValue.findMany();
  for (const value of values) {
    const member = await prisma.member.findUnique({
      where: { id: value.memberId },
      include: { contact: true },
    });

    if (member?.contact) {
      if (!DRY_RUN) {
        await prisma.contactCustomFieldValue.create({
          data: {
            fieldId: value.fieldId,
            contactId: member.contact.id,
            value: value.value,
          },
        });
      }
    }
  }
  
  console.log('Custom field migration complete');
}

/**
 * Migrate documents
 */
async function migrateDocuments() {
  console.log('Migrating documents...');
  
  const documents = await prisma.memberDocument.findMany();
  
  for (const doc of documents) {
    const member = await prisma.member.findUnique({
      where: { id: doc.memberId },
      include: { contact: true },
    });

    if (member?.contact) {
      if (!DRY_RUN) {
        await prisma.contactDocument.create({
          data: {
            tenantId: doc.tenantId,
            contactId: member.contact.id,
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            publicId: doc.publicId,
            fileType: doc.fileType,
            fileSizeBytes: doc.fileSizeBytes,
            documentType: doc.documentType,
            description: doc.description,
            uploadedBy: doc.uploadedBy,
          },
        });
      }
    }
  }
  
  console.log('Document migration complete');
}

/**
 * Main migration function
 */
async function main() {
  console.log('Starting Contact-first migration...');
  console.log(`DRY RUN: ${DRY_RUN}`);
  console.log('=====================================');

  try {
    // Step 1: Migrate all Members to Contacts
    console.log('Step 1: Migrating Members to Contacts...');
    const members = await prisma.member.findMany({
      where: {
        // Skip members that already have a Contact linked
        contact: null,
      },
    });

    console.log(`Found ${members.length} members to migrate`);

    for (const member of members) {
      await migrateMember(member);
    }

    console.log(`\nMember migration complete: ${stats.membersProcessed} processed`);
    console.log(`Contacts created: ${stats.contactsCreated}`);
    console.log(`Enrollments created: ${stats.enrollmentsCreated}`);
    console.log(`Foreign keys updated: ${stats.foreignKeysUpdated}`);
    console.log(`Errors: ${stats.errors}`);

    // Step 2: Migrate custom fields
    await migrateCustomFields();

    // Step 3: Migrate documents
    await migrateDocuments();

    console.log('=====================================');
    console.log('Migration complete!');
    console.log('Final stats:', stats);

    if (stats.errors > 0) {
      console.warn(`Migration completed with ${stats.errors} errors`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
