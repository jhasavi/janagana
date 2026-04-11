#!/bin/bash
echo "Generating secure secrets for janagana..."
echo ""
echo "JWT_SECRET=$(openssl rand -hex 64)"
echo ""
echo "MEMBER_JWT_SECRET=$(openssl rand -hex 64)"
echo ""
echo "Copy the above values to your .env file"
echo "Replace the current JWT_SECRET=replace_me and MEMBER_JWT_SECRET=replace_me"
