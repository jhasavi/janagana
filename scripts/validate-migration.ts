/**
 * Migration Validation Script
 * 
 * This script validates that the Contact-first migration was successful by:
 * 1. Checking that all Members have corresponding Contact records
 * 2. Verifying MembershipEnrollment records exist for active members
 * 3. Checking foreign key integrity across all related tables
 * 4. Validating data consistency between old and new models
 * 5. Checking custom field and document migration
 * 
 * Usage:
 *   npx tsx scripts/validate-migration.ts
 * 
 * This should be run AFTER the migration script completes successfully.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationResult {
  category: string;
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const results: ValidationResult[] = [];

function addResult(category: string, check: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
  results.push({ category, check, status, message, details });
}

/**
 * Validate that all Members have corresponding Contact records
 */
async function validateMemberContactMapping() {
  console.log('Validating Member → Contact mapping...');
  
  const members = await prisma.member.findMany({
    include: { contact: true },
  });
  
  const membersWithoutContact = members.filter(m => !m.contact);
  const membersWithContact = members.filter(m => m.contact);
  
  if (membersWithoutContact.length === 0) {
    addResult('Member → Contact', 'All members have Contact records', 'pass', `${membersWithContact.length} members mapped to contacts`);
  } else {
    addResult('Member → Contact', 'All members have Contact records', 'fail', `${membersWithoutContact.length} members without Contact records`, {
      memberIds: membersWithoutContact.map(m => m.id),
    });
  }
  
  // Check that Contact data matches Member data
  const mismatches: any[] = [];
  for (const member of membersWithContact) {
    const contact = member.contact!;
    if (contact.firstName !== member.firstName || 
        contact.lastName !== member.lastName ||
        !contact.emails.includes(member.email)) {
      mismatches.push({
        memberId: member.id,
        contactId: contact.id,
        memberName: `${member.firstName} ${member.lastName}`,
        contactName: `${contact.firstName} ${contact.lastName}`,
        memberEmail: member.email,
        contactEmails: contact.emails,
      });
    }
  }
  
  if (mismatches.length === 0) {
    addResult('Member → Contact', 'Contact data matches Member data', 'pass', 'All Contact records have matching data');
  } else {
    addResult('Member → Contact', 'Contact data matches Member data', 'warning', `${mismatches.length} data mismatches found`, { mismatches });
  }
}

/**
 * Validate MembershipEnrollment records
 */
async function validateMembershipEnrollments() {
  console.log('Validating MembershipEnrollment records...');
  
  const activeMembers = await prisma.member.findMany({
    where: { status: 'ACTIVE' },
    include: { contact: true },
  });
  
  let enrollmentsCount = 0;
  let membersWithoutEnrollment = 0;
  
  for (const member of activeMembers) {
    if (!member.contact) continue;
    
    const enrollments = await prisma.membershipEnrollment.findMany({
      where: { contactId: member.contact.id },
    });
    
    if (enrollments.length === 0) {
      membersWithoutEnrollment++;
    } else {
      enrollmentsCount += enrollments.length;
    }
  }
  
  if (membersWithoutEnrollment === 0) {
    addResult('MembershipEnrollment', 'Active members have enrollments', 'pass', `${enrollmentsCount} enrollment records created`);
  } else {
    addResult('MembershipEnrollment', 'Active members have enrollments', 'warning', `${membersWithoutEnrollment} active members without enrollments`);
  }
  
  // Check tier mapping
  const membersWithTier = await prisma.member.findMany({
    where: { tierId: { not: null } },
    include: { contact: true, tier: true },
  });
  
  let tierMismatches = 0;
  for (const member of membersWithTier) {
    if (!member.contact) continue;
    
    const enrollment = await prisma.membershipEnrollment.findFirst({
      where: { 
        contactId: member.contact.id,
        tierId: member.tierId,
      },
    });
    
    if (!enrollment) {
      tierMismatches++;
    }
  }
  
  if (tierMismatches === 0) {
    addResult('MembershipEnrollment', 'Tier mapping preserved', 'pass', 'All tier mappings preserved in enrollments');
  } else {
    addResult('MembershipEnrollment', 'Tier mapping preserved', 'warning', `${tierMismatches} tier mappings not found in enrollments`);
  }
}

/**
 * Validate foreign key integrity
 */
async function validateForeignKeys() {
  console.log('Validating foreign key integrity...');
  
  const tables = [
    { name: 'EventRegistration', foreignKey: 'contactId', originalKey: 'memberId' },
    { name: 'VolunteerSignup', foreignKey: 'contactId', originalKey: 'memberId' },
    { name: 'Donation', foreignKey: 'contactId', originalKey: 'memberId' },
    { name: 'ClubMembership', foreignKey: 'contactId', originalKey: 'memberId' },
    { name: 'ClubPost', foreignKey: 'contactId', originalKey: 'memberId' },
    { name: 'Notification', foreignKey: 'contactId', originalKey: 'memberId' },
    { name: 'ChapterMember', foreignKey: 'contactId', originalKey: 'memberId' },
  ];
  
  for (const table of tables) {
    // Get records with memberId but no contactId
    const query = `SELECT COUNT(*) as count FROM "${table.name}" WHERE "${table.originalKey}" IS NOT NULL AND "${table.foreignKey}" IS NULL`;
    
    try {
      const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(query);
      const count = Number(result[0]?.count || 0);
      
      if (count === 0) {
        addResult('Foreign Keys', `${table.name} has contactId populated`, 'pass', 'All records migrated');
      } else {
        addResult('Foreign Keys', `${table.name} has contactId populated`, 'fail', `${count} records without contactId`);
      }
    } catch (error) {
      addResult('Foreign Keys', `${table.name} has contactId populated`, 'fail', `Query failed: ${error}`);
    }
  }
}

/**
 * Validate custom field migration
 */
async function validateCustomFields() {
  console.log('Validating custom field migration...');
  
  const memberCustomFields = await prisma.memberCustomField.count();
  const contactCustomFields = await prisma.contactCustomField.count();
  
  if (contactCustomFields >= memberCustomFields) {
    addResult('Custom Fields', 'ContactCustomField records created', 'pass', `${contactCustomFields} ContactCustomField records (was ${memberCustomFields} MemberCustomField)`);
  } else {
    addResult('Custom Fields', 'ContactCustomField records created', 'warning', `Only ${contactCustomFields} ContactCustomField records (was ${memberCustomFields} MemberCustomField)`);
  }
  
  const memberCustomFieldValues = await prisma.memberCustomFieldValue.count();
  const contactCustomFieldValues = await prisma.contactCustomFieldValue.count();
  
  if (contactCustomFieldValues >= memberCustomFieldValues) {
    addResult('Custom Fields', 'ContactCustomFieldValue records created', 'pass', `${contactCustomFieldValues} ContactCustomFieldValue records (was ${memberCustomFieldValues} MemberCustomFieldValue)`);
  } else {
    addResult('Custom Fields', 'ContactCustomFieldValue records created', 'warning', `Only ${contactCustomFieldValues} ContactCustomFieldValue records (was ${memberCustomFieldValues} MemberCustomFieldValue)`);
  }
}

/**
 * Validate document migration
 */
async function validateDocuments() {
  console.log('Validating document migration...');
  
  const memberDocuments = await prisma.memberDocument.count();
  const contactDocuments = await prisma.contactDocument.count();
  
  if (contactDocuments >= memberDocuments) {
    addResult('Documents', 'ContactDocument records created', 'pass', `${contactDocuments} ContactDocument records (was ${memberDocuments} MemberDocument)`);
  } else {
    addResult('Documents', 'ContactDocument records created', 'warning', `Only ${contactDocuments} ContactDocument records (was ${memberDocuments} MemberDocument)`);
  }
}

/**
 * Validate data counts
 */
async function validateDataCounts() {
  console.log('Validating data counts...');
  
  const memberCount = await prisma.member.count();
  const contactCount = await prisma.contact.count();
  
  addResult('Data Counts', 'Contact records created', 'pass', `${contactCount} Contact records (from ${memberCount} Members)`);
  
  const enrollmentCount = await prisma.membershipEnrollment.count();
  addResult('Data Counts', 'MembershipEnrollment records created', 'pass', `${enrollmentCount} MembershipEnrollment records`);
}

/**
 * Main validation function
 */
async function main() {
  console.log('Starting Contact-first migration validation...');
  console.log('=====================================\n');
  
  try {
    await validateMemberContactMapping();
    await validateMembershipEnrollments();
    await validateForeignKeys();
    await validateCustomFields();
    await validateDocuments();
    await validateDataCounts();
    
    console.log('\n=====================================');
    console.log('Validation Results:');
    console.log('=====================================\n');
    
    const passed = results.filter(r => r.status === 'pass');
    const failed = results.filter(r => r.status === 'fail');
    const warnings = results.filter(r => r.status === 'warning');
    
    // Group by category
    const grouped = results.reduce((acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    }, {} as Record<string, ValidationResult[]>);
    
    for (const [category, checks] of Object.entries(grouped)) {
      console.log(`\n${category}:`);
      for (const check of checks) {
        const icon = check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠';
        console.log(`  ${icon} ${check.check}: ${check.message}`);
        if (check.details) {
          console.log(`    Details:`, JSON.stringify(check.details, null, 2));
        }
      }
    }
    
    console.log('\n=====================================');
    console.log(`Summary: ${passed.length} passed, ${warnings.length} warnings, ${failed.length} failed`);
    console.log('=====================================');
    
    if (failed.length > 0) {
      console.error('\n❌ Validation failed! Please review the errors above.');
      process.exit(1);
    } else if (warnings.length > 0) {
      console.warn('\n⚠️  Validation passed with warnings. Review warnings before proceeding.');
      process.exit(0);
    } else {
      console.log('\n✅ Validation passed! Migration successful.');
      process.exit(0);
    }
  } catch (error) {
    console.error('Validation failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
