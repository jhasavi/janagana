#!/bin/bash

# OrgFlow Deployment Verification Script
# This script verifies all services are running correctly after deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-https://api.orgflow.app}"
WEB_URL="${WEB_URL:-https://orgflow.app}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-30}"

# Counter for passed/failed checks
PASSED=0
FAILED=0

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "pass" ]; then
        echo -e "${GREEN}✓${NC} $message"
        ((PASSED++))
    elif [ "$status" = "fail" ]; then
        echo -e "${RED}✗${NC} $message"
        ((FAILED++))
    else
        echo -e "${YELLOW}○${NC} $message"
    fi
}

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local name=$2
    local expected_code=${3:-200}
    
    echo -n "Checking $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $HEALTH_TIMEOUT "$url" 2>&1)
    
    if [ "$response" = "$expected_code" ]; then
        print_status "pass" "$name is accessible (HTTP $response)"
        return 0
    else
        print_status "fail" "$name returned HTTP $response (expected $expected_code)"
        return 1
    fi
}

# Function to check JSON response
check_json() {
    local url=$1
    local name=$2
    local field=$3
    
    echo -n "Checking $name JSON response... "
    
    response=$(curl -s --max-time $HEALTH_TIMEOUT "$url" 2>&1)
    
    if echo "$response" | jq -e ".${field}" > /dev/null 2>&1; then
        print_status "pass" "$name JSON contains '$field'"
        return 0
    else
        print_status "fail" "$name JSON missing '$field' or invalid response"
        return 1
    fi
}

# Function to check database connection
check_database() {
    echo -n "Checking database connection... "
    
    if [ -z "$DATABASE_URL" ]; then
        print_status "skip" "DATABASE_URL not set, skipping database check"
        return 0
    fi
    
    # Try to connect to database
    if node -e "
        const { Client } = require('pg');
        const client = new Client({ connectionString: process.env.DATABASE_URL });
        client.connect()
            .then(() => client.query('SELECT 1'))
            .then(() => { console.log('OK'); client.end(); })
            .catch(err => { console.error('FAIL'); client.end(); process.exit(1); });
    " 2>/dev/null; then
        print_status "pass" "Database connection successful"
        return 0
    else
        print_status "fail" "Database connection failed"
        return 1
    fi
}

# Function to check Redis connection
check_redis() {
    echo -n "Checking Redis connection... "
    
    if [ -z "$REDIS_URL" ]; then
        print_status "skip" "REDIS_URL not set, skipping Redis check"
        return 0
    fi
    
    # Try to ping Redis
    if node -e "
        const redis = require('redis');
        const client = redis.createClient({ url: process.env.REDIS_URL });
        client.connect()
            .then(() => client.ping())
            .then(() => { console.log('OK'); client.quit(); })
            .catch(err => { console.error('FAIL'); client.quit(); process.exit(1); });
    " 2>/dev/null; then
        print_status "pass" "Redis connection successful"
        return 0
    else
        print_status "fail" "Redis connection failed"
        return 1
    fi
}

# Function to check Stripe webhook
check_stripe_webhook() {
    echo -n "Checking Stripe webhook endpoint... "
    
    if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
        print_status "skip" "STRIPE_WEBHOOK_SECRET not set, skipping webhook check"
        return 0
    fi
    
    # Send a test webhook (this would need to be done via Stripe CLI or dashboard)
    print_status "skip" "Stripe webhook check requires manual verification in Stripe dashboard"
    return 0
}

# Function to test email sending
check_email() {
    echo -n "Checking email service (Resend)... "
    
    if [ -z "$RESEND_API_KEY" ]; then
        print_status "skip" "RESEND_API_KEY not set, skipping email check"
        return 0
    fi
    
    # Try to send a test email (optional - comment out to avoid sending actual emails)
    print_status "skip" "Email sending test requires manual verification"
    return 0
}

# Function to check file storage
check_storage() {
    echo -n "Checking Cloudinary storage... "
    
    if [ -z "$CLOUDINARY_API_KEY" ] || [ -z "$CLOUDINARY_API_SECRET" ]; then
        print_status "skip" "Cloudinary credentials not set, skipping storage check"
        return 0
    fi
    
    # Try to list resources from Cloudinary
    if node -e "
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
        cloudinary.api.resources({ max_results: 1 })
            .then(() => { console.log('OK'); })
            .catch(err => { console.error('FAIL'); process.exit(1); });
    " 2>/dev/null; then
        print_status "pass" "Cloudinary storage accessible"
        return 0
    else
        print_status "fail" "Cloudinary storage connection failed"
        return 1
    fi
}

# Function to check SSL certificate
check_ssl() {
    echo -n "Checking SSL certificate... "
    
    domain=$(echo "$API_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')
    
    if openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
        print_status "pass" "SSL certificate valid (expires: $expiry)"
        return 0
    else
        print_status "fail" "SSL certificate invalid or not found"
        return 1
    fi
}

# Function to check response time
check_response_time() {
    local url=$1
    local name=$2
    local max_time=${3:-2000} # Default 2 seconds
    
    echo -n "Checking $name response time... "
    
    start=$(date +%s%N)
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $HEALTH_TIMEOUT "$url" 2>&1)
    end=$(date +%s%N)
    
    elapsed=$(( (end - start) / 1000000 ))
    
    if [ "$response" = "200" ] && [ $elapsed -lt $max_time ]; then
        print_status "pass" "$name responded in ${elapsed}ms (< ${max_time}ms)"
        return 0
    else
        print_status "fail" "$name responded in ${elapsed}ms (expected < ${max_time}ms)"
        return 1
    fi
}

# Main execution
echo "========================================="
echo "  OrgFlow Deployment Verification"
echo "========================================="
echo ""
echo "Checking deployment at:"
echo "  API: $API_URL"
echo "  Web: $WEB_URL"
echo ""
echo "Starting checks..."
echo ""

# Check if required tools are installed
echo "Checking prerequisites..."
command -v curl >/dev/null 2>&1 || { echo "curl is required but not installed"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required but not installed"; exit 1; }
echo ""

# Health checks
check_http "$API_URL/health" "API health endpoint"
check_http "$WEB_URL/api/health" "Web health endpoint"

# Response time checks
check_response_time "$API_URL/health" "API response time" 2000
check_response_time "$WEB_URL/api/health" "Web response time" 2000

# JSON response checks
check_json "$API_URL/health" "API health" "status"
check_json "$WEB_URL/api/health" "Web health" "status"

# Service checks
check_database
check_redis
check_storage

# SSL check
check_ssl

# Webhook checks (skipped by default)
check_stripe_webhook
check_email

# Additional endpoint checks
echo ""
echo "Checking additional endpoints..."
check_http "$API_URL/tenants" "API tenants endpoint" 401
check_http "$WEB_URL" "Web homepage" 200

# Summary
echo ""
echo "========================================="
echo "  Verification Summary"
echo "========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed! Deployment is healthy.${NC}"
    exit 0
else
    echo -e "${RED}Some checks failed. Please review the output above.${NC}"
    exit 1
fi
