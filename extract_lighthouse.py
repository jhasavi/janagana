#!/usr/bin/env python3
import re
import json

# Read HTML file
with open('lighthouse-report.html', 'r') as f:
    content = f.read()

# Find JSON data in the script tag
json_match = re.search(r'<script[^>]*>.*?window\.lighthouseReport\s*=\s*({.*?});.*?</script>', content, re.DOTALL)

if json_match:
    json_str = json_match.group(1)
    try:
        data = json.loads(json_str)
        
        # Extract scores
        categories = data.get('categories', {})
        performance_score = categories.get('performance', {}).get('score', 0)
        accessibility_score = categories.get('accessibility', {}).get('score', 0)
        best_practices_score = categories.get('best-practices', {}).get('score', 0)
        seo_score = categories.get('seo', {}).get('score', 0)
        
        print('Lighthouse Scores:')
        print(f'Performance: {performance_score * 100:.0f}')
        print(f'Accessibility: {accessibility_score * 100:.0f}')
        print(f'Best Practices: {best_practices_score * 100:.0f}')
        print(f'SEO: {seo_score * 100:.0f}')
        
        # Find failed audits
        audits = data.get('audits', {})
        print('\nFailed Audits (score < 0.9):')
        for audit_id, audit in audits.items():
            score = audit.get('score', 1)
            if score < 0.9 and score is not None:
                title = audit.get('title', audit_id)
                description = audit.get('description', '')
                print(f'- {title}: {score * 100:.0f}')
                print(f'  {description[:100]}...')
        
    except json.JSONDecodeError as e:
        print(f'Error parsing JSON: {e}')
else:
    print('No Lighthouse report JSON found')
