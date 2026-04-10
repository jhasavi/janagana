import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-background rounded-xl border shadow-lg p-8 md:p-12">
          <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold">1. Introduction</h2>
              <p>
                Welcome to OrgFlow ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. Please read this policy carefully. If you do not agree with the terms of this privacy policy, please do not access the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">2. Information We Collect</h2>
              <p>We collect information you provide directly to us, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, organization name, and other information you provide when creating an account.</li>
                <li><strong>Member Information:</strong> Names, contact details, membership status, and other information you provide about your organization's members.</li>
                <li><strong>Payment Information:</strong> Payment details processed through our third-party payment processor, Stripe. We do not store your complete credit card information.</li>
                <li><strong>Communications:</strong> Information you provide when contacting us for support or through our feedback system.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send you related information</li>
                <li>Send you technical notices, updates, security alerts, and support messages</li>
                <li>Respond to your comments, questions, and customer service requests</li>
                <li>Communicate with you about products, services, and events</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, prevent, and address technical issues and fraud</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">4. Information Sharing</h2>
              <p>We do not sell, trade, or otherwise transfer your personal information to third parties. We may share your information in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service Providers:</strong> We may share information with third-party service providers who perform services on our behalf (e.g., Stripe for payments, Resend for email, Clerk for authentication).</li>
                <li><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, or acquisition of all or a portion of our business.</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights, property, or safety.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational security measures designed to protect the security of any personal information you provide us. However, no method of transmission over the Internet or electronic storage is completely secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">6. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to provide our services and fulfill the transactions you have requested, or for other legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">7. Your Rights</h2>
              <p>Depending on your location, you may have the following rights regarding your personal information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access to your personal information</li>
                <li>Correction of inaccurate personal information</li>
                <li>Deletion of your personal information</li>
                <li>Restriction of processing of your personal information</li>
                <li>Data portability</li>
                <li>Objection to processing of your personal information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">8. Children's Privacy</h2>
              <p>
                Our services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own. We ensure that your information is handled in accordance with this Privacy Policy and applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">10. Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">11. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us:</p>
              <div className="bg-muted p-4 rounded-lg mt-4">
                <p><strong>Email:</strong> privacy@orgflow.app</p>
                <p><strong>Website:</strong> https://orgflow.app</p>
                <p><strong>Address:</strong> [Your Company Address]</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">12. GDPR Compliance</h2>
              <p>
                If you are located in the European Economic Area (EEA), you have certain data protection rights. OrgFlow is committed to protecting your personal data and respecting your privacy in accordance with the General Data Protection Regulation (GDPR).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">13. CCPA Compliance</h2>
              <p>
                If you are a resident of California, you have specific rights regarding your personal information under the California Consumer Privacy Act (CCPA). We are committed to complying with the CCPA and protecting your privacy.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t">
            <Link href="/" className="text-primary hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
