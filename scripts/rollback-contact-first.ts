/**
 * Rollback Script: Contact + MembershipEnrollment → Member
 * 
 * This script rolls back the Contact-first migration by:
 * 1. Removing Contact records
 * 2. Removing MembershipEnrollment records
 * 3. Reverting foreign key references from contactId to memberId
 * 4. Removing ContactCustomField and ContactDocument records
 * 
 * WARNING: This will delete all Contact and MembershipEnrollment data
 * created during the migration. Use with caution.
 * 
 * Usage:
 *   npx tsx scripts/rollback-contact-first.ts
 * 
 * Prerequisites:
 * - Migration was completed successfully
 * - No new data has been added to Contact/ContactCustomField/ContactDocument
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
const DRY_RUN = process.env.DRY_RUN === 'true';

interface RollbackStats {
  contactsDeleted: number;
  enrollmentsDeleted: number;
  foreignKeysReverted: number;
  customFieldsDeleted: number;
  documentsDeleted: number;
  errors: number;
}

const stats: RollbackStats = {
  contactsDeleted: 0,
  enrollmentsDeleted: 0,
  foreignKeysReverted: 0,
  customFieldsDeleted: 0,
  documentsDeleted: 0,
  errors: 0,
};

/**
 * Revert foreign key references from contactId to memberId
 */
async function revertForeignKeys(contactId: string, memberId: string) {
  const updates = [
    // EventRegistration
    prisma.eventRegistration.updateMany({
      where: { contactId },
      data: { contactId: null },
    }),
    // VolunteerSignup
    prisma.volunteerSignup.updateMany({
      where: { contactId },
      data: { contactId: null },
    }),
    // Donation
    prisma.donation.updateMany({
      where: { contactId },
      data: { contactId: null },
    }),
    // ClubMembership
    prisma.clubMembership.updateMany({
      where: { contactId },
      data: { contactId: null },
    }),
    // ClubPost
    prisma.clubPost.updateMany({
      where: { contactId },
      data: { contactId: null },
    }),
    // Notification
    prisma.notification.updateMany({
      where: { contactId },
      data: { contactId: null },
    }),
    // JobPosting
    prisma.jobPosting.updateMany({
      where: { postedByContactId: contactId },
      data: { postedByContactId: null },
    }),
    // ForumThread
    prisma.forumThread.updateMany({
      where: { authorContactId: contactId },
      data: { authorContactId: null },
    }),
    // ForumReply
    prisma.forumReply.updateMany({
      where: { authorContactId: contactId },
      data: { authorContactId: null },
    }),
    // ChapterMember
    prisma.chapterMember.updateMany({
      where: { contactId },
      data: { contactId: null },
    }),
  ];

  if (!DRY_RUN) {
    const results = await Promise.all(updates);
    const totalReverted = results.reduce((sum, r) => sum + r.count, 0);
    stats.foreignKeysReverted += totalReverted;
  } else {
    console.log(`[DRY RUN] Would revert foreign keys for Contact ${contactId}`);
  }
}

/**
 * Rollback a single Contact and its related data
 */
async function rollbackContact(contact: any) {
  try {
    // Step 1: Revert foreign keys
    if (contact.memberId) {
      await revertForeignKeys(contact.id, contact.memberId);
    }

    // Step 2: Delete MembershipEnrollments for this contact
    if (!DRY_RUN) {
      const enrollmentsDeleted = await prisma.membershipEnrollment.deleteMany({
        where: { contactId: contact.id },
      });
      stats.enrollmentsDeleted += enrollmentsDeleted.count;
    } else {
      console.log(`[DRY RUN] Would delete MembershipEnrollments for Contact ${contact.id}`);
    }

    // Step 3: Delete ContactCustomFieldValues for this contact
    if (!DRY_RUN) {
      await prisma.contactCustomFieldValue.deleteMany({
        where: { contactId: contact.id },
      });
    }

    // Step 4: Delete ContactDocuments for this contact
    if (!DRY_RUN) {
      await prisma.contactDocument.deleteMany({
        where: { contactId: contact.id },
      });
    }

    // Step 5: Delete the Contact
    if (!DRY_RUN) {
      await prisma.contact.delete({
        where: { id: contact.id },
      });
      stats.contactsDeleted++;
    } else {
      console.log(`[DRY RUN] Would delete Contact ${contact.id}`);
    }
  } catch (error) {
    console.error(`Error rolling back contact ${contact.id}:`, error);
    stats.errors++;
  }
}

/**
 * Rollback custom fields
 */
async function rollbackCustomFields() {
  console.log('Rolling back custom fields...');
  
  if (!DRY_RUN) {
    // Delete all ContactCustomFieldValues
    await prisma.contactCustomFieldValue.deleteMany({});
    
    // Delete all ContactCustomFields
    const deleted = await prisma.contactCustomField.deleteMany({});
    stats.customFieldsDeleted += deleted.count;
  } else {
    console.log('[DRY RUN] Would delete all ContactCustomFields and values');
  }
  
  console.log('Custom field rollback complete');
}

/**
 * Rollback documents
 */
async function rollbackDocuments() {
  console.log('Rolling back documents...');
  
  if (!DRY_RUN) {
    const deleted = await prisma.contactDocument.deleteMany({});
    stats.documentsDeleted += deleted.count;
  } else {
    console.log('[DRY RUN] Would delete all ContactDocuments');
  }
  
  console.log('Document rollback complete');
}

/**
 * Main rollback function
 */
async function main() {
  console.log('Starting Contact-first rollback...');
  console.log(`DRY RUN: ${DRY_RUN}`);
  console.log('=====================================');

  try {
    // Step 1: Rollback all Contacts
    console.log('Step 1: Rolling back Contacts...');
    const contacts = await prisma.contact.findMany({
      where: {
        source: 'migration', // Only rollback contacts created during migration
      },
    });

    console.log(`Found ${contacts.length} contacts to rollback`);

    for (const contact of contacts) {
      await rollbackContact(contact);
    }

    console.log(`\nContact rollback complete: ${stats.contactsDeleted} deleted`);
    console.log(`Enrollments deleted: ${stats.enrollmentsDeleted}`);
    console.log(`Foreign keys reverted: ${stats.foreignKeysReverted}`);
    console.log(`Errors: ${stats.errors}`);

    // Step 2: Rollback custom fields
    await rollbackCustomFields();

    // Step 3: Rollback documents
    await rollbackDocuments();

    console.log('=====================================');
    console.log('Rollback complete!');
    console.log('Final stats:', stats);

    if (stats.errors > 0) {
      console.warn(`Rollback completed with ${stats.errors} errors`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
