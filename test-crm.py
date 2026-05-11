#!/usr/bin/env python3
import re
import sys
import subprocess

def check_url(url, cookies_file="/tmp/cookies.txt"):
    """Check a URL and analyze the response"""
    try:
        result = subprocess.run([
            'curl', '-s', url, '-b', cookies_file
        ], capture_output=True, text=True)
        
        content = result.stdout
        
        # Look for CRM-related content
        crm_matches = re.findall(r'(People|Contacts|CRM|Add Person)', content, re.IGNORECASE)
        if crm_matches:
            print(f'CRM elements found: {crm_matches}')
        else:
            # Look for any dashboard content
            dashboard_matches = re.findall(r'(dashboard|Dashboard)', content, re.IGNORECASE)
            if dashboard_matches:
                print(f'Dashboard elements: {dashboard_matches}')
            else:
                # Look for any main content
                main_matches = re.findall(r'<main[^>]*>(.*?)</main>', content, re.DOTALL)
                if main_matches:
                    print(f'Main content found: {len(main_matches[0])} characters')
                else:
                    print('No main content found')
                    # Check if it's a redirect or error
                    if 'sign-in' in content.lower():
                        print('Redirecting to sign-in')
                    elif '404' in content:
                        print('404 error')
                    elif '500' in content:
                        print('500 error')
                    else:
                        print('Unknown response')
                        # Print first 500 chars
                        print(f'First 500 chars: {content[:500]}')
                        
    except Exception as e:
        print(f'Error checking {url}: {e}')

if __name__ == "__main__":
    # Test key URLs
    urls = [
        "http://localhost:3000/dashboard",
        "http://localhost:3000/dashboard/crm", 
        "http://localhost:3000/dashboard/events",
        "http://localhost:3000/dashboard/members"
    ]
    
    for url in urls:
        print(f"\n=== Checking {url} ===")
        check_url(url)
