export default function BillingPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing</h1>
      
      <div className="bg-white rounded-xl shadow-sm border p-8">
        <h2 className="text-xl font-semibold mb-4">Subscription</h2>
        <p className="text-gray-600 mb-6">
          Your subscription information will appear here once Stripe is configured.
        </p>
        
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
          <p className="text-gray-600">
            Payment methods will be managed here once Stripe is integrated.
          </p>
        </div>
        
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Invoices</h3>
          <p className="text-gray-600">
            Invoice history will appear here once payments are processed.
          </p>
        </div>
      </div>
    </div>
  )
}
