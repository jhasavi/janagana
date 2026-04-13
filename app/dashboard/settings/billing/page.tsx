'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createCheckoutSession, getTenantSubscription, cancelSubscription } from '@/lib/actions'
import { AlertCircle, CheckCircle2, CreditCard, FileText, X } from 'lucide-react'

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [isCanceling, setIsCanceling] = useState(false)
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    loadSubscription()
  }, [])

  useEffect(() => {
    if (success === 'true') {
      alert('Subscription activated successfully!')
      loadSubscription()
    } else if (canceled === 'true') {
      alert('Subscription was canceled. You can try again anytime.')
    }
  }, [success, canceled])

  const loadSubscription = async () => {
    try {
      const sub = await getTenantSubscription()
      setSubscription(sub)
    } catch (error) {
      console.error('Failed to load subscription:', error)
    }
  }

  const handleSubscribe = async (priceId: string) => {
    setIsLoading(true)
    try {
      const session = await createCheckoutSession(priceId)
      if (session.url) {
        window.location.href = session.url
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      alert('Failed to initiate checkout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access at the end of your billing period.')) return
    
    setIsCanceling(true)
    try {
      await cancelSubscription()
      await loadSubscription()
      alert('Subscription will be canceled at the end of your billing period.')
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      alert(error instanceof Error ? error.message : 'Failed to cancel subscription. Please try again.')
    } finally {
      setIsCanceling(false)
    }
  }

  const plans = [
    {
      name: 'Starter',
      price: '$0',
      priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
      features: [
        'Up to 100 members',
        'Up to 5 users',
        'Up to 10 events',
        'Up to 5 clubs',
      ],
    },
    {
      name: 'Growth',
      price: '$29',
      priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID || '',
      features: [
        'Up to 500 members',
        'Up to 10 users',
        'Up to 50 events',
        'Up to 20 clubs',
        'Custom domain',
      ],
    },
    {
      name: 'Pro',
      price: '$99',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
      features: [
        'Unlimited members',
        'Up to 25 users',
        'Unlimited events',
        'Unlimited clubs',
        'API access',
        'Advanced reports',
      ],
    },
  ]

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing</h1>
      
      {subscription && subscription.status === 'ACTIVE' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Current Subscription</h2>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-green-600 font-medium">Active</span>
              </div>
              {subscription.currentPeriodEnd && (
                <p className="text-sm text-gray-600">
                  Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
              {subscription.cancelAtPeriodEnd && (
                <div className="flex items-center gap-2 mt-2 text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Cancels at period end</span>
                </div>
              )}
            </div>
            {!subscription.cancelAtPeriodEnd && (
              <button
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-300"
              >
                {isCanceling ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Choose Your Plan</h2>
        <p className="text-gray-600 mb-6">
          Select a plan that fits your organization&apos;s needs.
        </p>
        
        <div className="grid grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.name} className="border rounded-lg p-6 hover:border-blue-500 transition-colors">
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <div className="text-3xl font-bold mb-4">{plan.price}<span className="text-sm font-normal text-gray-600">/month</span></div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.priceId)}
                disabled={isLoading || !plan.priceId}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : plan.priceId ? 'Subscribe' : 'Coming Soon'}
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border p-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Methods
        </h2>
        <p className="text-gray-600">
          Payment methods are managed through Stripe. You can update them during checkout.
        </p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border p-8 mt-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Invoices
        </h2>
        <p className="text-gray-600">
          Invoices will be available here once you have an active subscription.
        </p>
      </div>
    </div>
  )
}
