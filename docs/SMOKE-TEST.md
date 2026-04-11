# Janagana Smoke Test Guide
Date: ____________
Tester: ____________
Environment: STAGING / PRODUCTION

## PRE-TEST SETUP
□ API is running (check https://janagana-api.onrender.com/api/v1/health/live)
□ Web is running (check https://janagana.namasteneedham.com)
□ Using Stripe TEST mode (not live)
□ Test email account ready (to receive emails)

---

## TEST 1: New Organization Registration (10 min)
□ 1.1 Visit https://janagana.namasteneedham.com
      Expected: Marketing homepage loads
      
□ 1.2 Click "Start Free Trial"
      Expected: Registration form appears
      
□ 1.3 Fill in:
      Org Name: Test Organization [timestamp]
      Your Name: Test Admin
      Email: [your test email]
      Password: TestPass123!
      Click "Create Account"
      Expected: Redirected to onboarding
      
□ 1.4 Complete onboarding wizard
      Step 1: Enter org name
      Step 2: Choose color (blue)
      Step 3: Skip member tier for now
      Step 4: Skip team invite
      Step 5: See checklist
      Expected: Redirected to dashboard
      
□ 1.5 Dashboard loads
      Expected: See welcome message, empty stats

RESULT: ✅ PASS / ❌ FAIL
Notes: _________________________________

---

## TEST 2: Member Management (15 min)
□ 2.1 Click "Members" in sidebar
      Expected: Empty members list
      
□ 2.2 Click "Add Member"
      Fill: First: John, Last: Smith
      Email: john.smith@test.com
      Phone: 555-1234
      Click through steps, Submit
      Expected: Member created, toast notification
      
□ 2.3 Member appears in list
      Expected: John Smith with status "Active"
      
□ 2.4 Click on John Smith
      Expected: Member detail page with all tabs
      
□ 2.5 Edit the member
      Change phone to 555-9999
      Save
      Expected: Phone updated, toast shows

□ 2.6 Check email received
      Expected: Welcome email in john.smith@test.com
      (If Resend configured correctly)

RESULT: ✅ PASS / ❌ FAIL
Notes: _________________________________

---

## TEST 3: Event Creation & Registration (15 min)
□ 3.1 Click "Events" in sidebar
□ 3.2 Click "Create Event"
      Fill: Title: "Test Community Meeting"
      Date: Tomorrow at 2pm
      Location: Virtual
      Add free ticket: "General Admission" qty: 50
      Publish it
      Expected: Event created and published
      
□ 3.3 View event detail page
      Expected: See all event info, 0/50 registrations
      
□ 3.4 Register John Smith for the event
      Click "Register Member"
      Select John Smith
      Select General Admission ticket
      Submit
      Expected: Registration confirmed
      
□ 3.5 Check registrations tab
      Expected: John Smith listed as registered
      
□ 3.6 Test check-in
      Click Check-In tab
      Search for "John"
      Click Check In
      Expected: John marked as attended

RESULT: ✅ PASS / ❌ FAIL
Notes: _________________________________

---

## TEST 4: Volunteer Opportunity (10 min)
□ 4.1 Click "Volunteers" in sidebar
□ 4.2 Create opportunity:
      Title: "Community Garden Help"
      Add one shift: Saturday 9am-12pm
      Publish
      Expected: Opportunity created and published
      
□ 4.3 Submit application for John Smith
      Expected: Application pending

□ 4.4 Approve John's application
      Expected: Status changes to approved, 
      email sent to John

RESULT: ✅ PASS / ❌ FAIL
Notes: _________________________________

---

## TEST 5: Club Creation (10 min)
□ 5.1 Click "Clubs" in sidebar
□ 5.2 Create club:
      Name: "Gardening Enthusiasts"
      Public club
      Submit
      Expected: Club created
      
□ 5.3 Add John Smith as member
      Expected: John shows in club members
      
□ 5.4 Create a post in the club
      Expected: Post appears in feed

RESULT: ✅ PASS / ❌ FAIL
Notes: _________________________________

---

## TEST 6: Member Portal (10 min)
□ 6.1 Log out of admin
□ 6.2 Log in as member (use magic link for John Smith)
      Click "Member Login"
      Enter john.smith@test.com
      Request magic link
      Check email, click link
      Expected: Logged into member portal
      
□ 6.3 See member home
      Expected: John's name, membership info, 
      upcoming event listed
      
□ 6.4 View profile
      Expected: Can see and edit profile
      
□ 6.5 View events section
      Expected: Test Community Meeting listed
      QR code visible for registration

RESULT: ✅ PASS / ❌ FAIL
Notes: _________________________________

---

## TEST 7: Analytics (5 min)
□ 7.1 Log back in as admin
□ 7.2 Click "Analytics"
      Expected: Charts show:
      1 member, 1 event, 1 volunteer opportunity, 1 club

RESULT: ✅ PASS / ❌ FAIL
Notes: _________________________________

---

## ISSUE LOG
| Test | Issue | Severity | Fixed |
|------|-------|----------|-------|
|      |       |          |       |

## FINAL VERDICT
□ READY FOR BETA USERS
□ NEEDS FIXES FIRST (list below)

---

After running this guide, create a prompt to fix 
any ❌ FAIL items found.
