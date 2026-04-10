#!/bin/bash

# OrgFlow Beta Tenant Creation Script
# This script creates a new beta tenant organization via the API

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"
API_KEY="${API_KEY:-}"

# Check if API key is set
if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: API_KEY environment variable is required${NC}"
    echo "Please set your API key: export API_KEY=your-api-key"
    exit 1
fi

echo -e "${BLUE}=== OrgFlow Beta Tenant Creation ===${NC}"
echo ""

# Prompt for organization name
read -p "Organization Name: " org_name

# Prompt for admin email
read -p "Admin Email: " admin_email

# Validate email format
if [[ ! "$admin_email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    echo -e "${RED}Error: Invalid email format${NC}"
    exit 1
fi

# Prompt for organization type
echo ""
echo "Organization Type:"
echo "1) Non-profit"
echo "2) Club"
echo "3) School"
echo "4) Association"
echo "5) Religious Organization"
echo "6) Other"
read -p "Select (1-6): " org_type_choice

case $org_type_choice in
    1) org_type="nonprofit" ;;
    2) org_type="club" ;;
    3) org_type="school" ;;
    4) org_type="association" ;;
    5) org_type="religious" ;;
    6) org_type="other" ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Generate slug from org name
slug=$(echo "$org_name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')

# Prompt for admin name
read -p "Admin Full Name: " admin_name

# Confirm details
echo ""
echo -e "${YELLOW}=== Confirmation ===${NC}"
echo "Organization Name: $org_name"
echo "Admin Email: $admin_email"
echo "Admin Name: $admin_name"
echo "Organization Type: $org_type"
echo "Slug: $slug"
echo ""
read -p "Create this organization? (y/n): " confirm

if [[ $confirm != "y" && $confirm != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${BLUE}Creating organization...${NC}"

# Create tenant via API
tenant_response=$(curl -s -X POST \
    "$API_BASE_URL/tenants" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "{
        \"name\": \"$org_name\",
        \"slug\": \"$slug\",
        \"countryCode\": \"US\",
        \"timezone\": \"UTC\"
    }")

tenant_id=$(echo $tenant_response | jq -r '.id // empty')

if [ -z "$tenant_id" ]; then
    echo -e "${RED}Error: Failed to create tenant${NC}"
    echo "Response: $tenant_response"
    exit 1
fi

echo -e "${GREEN}✓ Tenant created (ID: $tenant_id)${NC}"

# Create admin user via API
user_response=$(curl -s -X POST \
    "$API_BASE_URL/users" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "{
        \"tenantId\": \"$tenant_id\",
        \"email\": \"$admin_email\",
        \"fullName\": \"$admin_name\",
        \"role\": \"OWNER\",
        \"isActive\": true
    }")

user_id=$(echo $user_response | jq -r '.id // empty')

if [ -z "$user_id" ]; then
    echo -e "${RED}Error: Failed to create admin user${NC}"
    echo "Response: $user_response"
    exit 1
fi

echo -e "${GREEN}✓ Admin user created (ID: $user_id)${NC}"

# Start free trial via API
trial_response=$(curl -s -X POST \
    "$API_BASE_URL/tenants/$tenant_id/start-trial" \
    -H "Authorization: Bearer $API_KEY")

if echo "$trial_response" | grep -q "error"; then
    echo -e "${YELLOW}Warning: Failed to start trial (may need to be done manually)${NC}"
else
    echo -e "${GREEN}✓ Free trial started (14 days)${NC}"
fi

# Schedule onboarding emails via API
onboarding_response=$(curl -s -X POST \
    "$API_BASE_URL/communications/onboarding/schedule" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "{
        \"tenantId\": \"$tenant_id\",
        \"adminEmail\": \"$admin_email\",
        \"orgName\": \"$org_name\"
    }")

if echo "$onboarding_response" | grep -q "error"; then
    echo -e "${YELLOW}Warning: Failed to schedule onboarding emails${NC}"
else
    echo -e "${GREEN}✓ Onboarding email sequence scheduled${NC}"
fi

# Print access information
echo ""
echo -e "${GREEN}=== Organization Created Successfully ===${NC}"
echo ""
echo "Organization Details:"
echo "  Name: $org_name"
echo "  ID: $tenant_id"
echo "  Slug: $slug"
echo "  Type: $org_type"
echo ""
echo "Admin Details:"
echo "  Name: $admin_name"
echo "  Email: $admin_email"
echo "  ID: $user_id"
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo "  Dashboard: https://$slug.orgflow.app/dashboard"
echo "  Member Portal: https://$slug.orgflow.app/portal"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Send the admin email ($admin_email) to the organization admin"
echo "2. They will need to set their password via the sign-in flow"
3. Share the BETA-GUIDE.md with them
echo "4. Monitor their progress and collect feedback"
echo ""
echo -e "${BLUE}Beta Tenant Ready!${NC}"
