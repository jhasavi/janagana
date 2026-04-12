'use client'

import { useState } from 'react'
import { createCheckoutSession } from '@/lib/actions'

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(false)

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
        <h2 className="text-xl font-semibold mb-4">Payment Methods</h2>
        <p className="text-gray-600">
          Payment methods will be managed here once you subscribe to a plan.
        </p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border p-8 mt-8">
        <h2 className="text-xl font-semibold mb-4">Invoices</h2>
        <p className="text-gray-600">
          Invoice history will appear here once you have active subscriptions.
        </p>
      </div>
    </div>
  )
}
