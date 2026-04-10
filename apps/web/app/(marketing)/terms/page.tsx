import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-background rounded-xl border shadow-lg p-8 md:p-12">
          <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
              <p>
                By accessing or using OrgFlow ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">2. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new Terms of Service on this page. Your continued use of the Service after such modifications constitutes your acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">3. Account Registration</h2>
              <p>
                To use the Service, you must register for an account. You agree to provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">4. Subscription Plans and Billing</h2>
              <p>
                The Service is offered on a subscription basis. We offer various subscription plans with different features and pricing. By subscribing to a plan, you agree to pay the applicable fees. All fees are non-refundable except as required by law.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Free Trial:</strong> New users may be eligible for a 14-day free trial. No credit card is required to start the trial.</li>
                <li><strong>Monthly Billing:</strong> Subscriptions are billed monthly on the anniversary of your subscription start date.</li>
                <li><strong>Annual Billing:</strong> Annual subscriptions are billed in advance and offer a discount compared to monthly billing.</li>
                <li><strong>Cancellations:</strong> You may cancel your subscription at any time. You will continue to have access until the end of your current billing period.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">5. Acceptable Use Policy</h2>
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on the intellectual property rights of others</li>
                <li>Transmit viruses, malware, or other malicious code</li>
                <li>Engage in spam, harassment, or abusive behavior</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Use the Service for any fraudulent or unlawful purpose</li>
                <li>Compete directly with OrgFlow using the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">6. Content and Data</h2>
              <p>
                You retain ownership of all content you upload or create using the Service. You grant OrgFlow a license to use, reproduce, and display your content solely for the purpose of providing the Service to you.
              </p>
              <p>
                OrgFlow claims no ownership over your data and will not sell, rent, or lease your data to third parties. You may export your data at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">7. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are owned by OrgFlow and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">8. Service Availability</h2>
              <p>
                We strive to maintain 99.9% uptime but do not guarantee uninterrupted access to the Service. We may suspend or terminate your access to the Service for violation of these terms or for any other reason at our sole discretion.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">9. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, OrgFlow shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">10. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless OrgFlow and its affiliates from any claims arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">11. Termination</h2>
              <p>
                We may terminate or suspend your account and access to the Service at our sole discretion, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">12. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which OrgFlow is registered, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">13. Dispute Resolution</h2>
              <p>
                Any disputes arising from these Terms shall be resolved through binding arbitration. You agree to waive your right to a trial by jury and to participate in any class action lawsuit.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">14. Privacy Policy</h2>
              <p>
                Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand how we collect, use, and protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">15. Contact Information</h2>
              <p>If you have any questions about these Terms, please contact us:</p>
              <div className="bg-muted p-4 rounded-lg mt-4">
                <p><strong>Email:</strong> legal@orgflow.app</p>
                <p><strong>Website:</strong> https://orgflow.app</p>
                <p><strong>Address:</strong> [Your Company Address]</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">16. Third-Party Services</h2>
              <p>
                The Service may integrate with third-party services such as Stripe, Resend, and Clerk. Your use of these services is subject to their respective terms of service and privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">17. Beta Services</h2>
              <p>
                During beta periods, certain features may be offered without charge. Beta features are provided "as is" and may be modified or discontinued at any time without notice.
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
