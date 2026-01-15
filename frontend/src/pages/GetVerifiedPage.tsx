import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import VerifiedBadge from '../components/VerifiedBadge'

// Paystack public key - replace with your actual key
const PAYSTACK_PUBLIC_KEY = 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

// Verification tiers with USD pricing
const VERIFICATION_TIERS = [
  {
    id: 'basic',
    name: 'Blue',
    monthlyPrice: 8,
    description: 'For individuals',
    features: [
      'Blue verified badge',
      'Edit posts',
      'Longer posts (10k characters)',
      'Bookmark folders',
      'Creator analytics',
    ],
    highlight: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 16,
    description: 'For creators',
    features: [
      'Everything in Blue',
      'Priority ranking in replies',
      'Half ads in feed',
      'Longer video uploads',
      'Early access to features',
      'Priority support',
    ],
    highlight: true,
  },
  {
    id: 'organization',
    name: 'Organization',
    monthlyPrice: 200,
    description: 'For businesses',
    features: [
      'Everything in Premium',
      'Gold verified badge',
      'Affiliate accounts',
      'Custom branding',
      'Advanced analytics',
      'Account manager',
    ],
    highlight: false,
  },
]

// Local storage for demo verification status
function getVerificationStatus(): { isVerified: boolean; tier?: string; expiresAt?: string } {
  try {
    const status = localStorage.getItem('verificationStatus')
    return status ? JSON.parse(status) : { isVerified: false }
  } catch {
    return { isVerified: false }
  }
}

function setVerificationStatus(tier: string) {
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 1)
  localStorage.setItem('verificationStatus', JSON.stringify({
    isVerified: true,
    tier,
    expiresAt: expiresAt.toISOString(),
  }))
}

export default function GetVerifiedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedTier, setSelectedTier] = useState<string>('premium')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const verificationStatus = getVerificationStatus()

  const handlePayment = async (tier: typeof VERIFICATION_TIERS[0]) => {
    if (!user) {
      navigate('/login')
      return
    }

    setIsProcessing(true)

    // Load Paystack inline script
    if (!(window as any).PaystackPop) {
      const script = document.createElement('script')
      script.src = 'https://js.paystack.co/v1/inline.js'
      script.async = true
      document.body.appendChild(script)
      await new Promise(resolve => script.onload = resolve)
    }

    // Calculate amount in cents (annual = 10 months, 2 free)
    const amount = billingCycle === 'annual' 
      ? tier.monthlyPrice * 10 * 100
      : tier.monthlyPrice * 100

    const handler = (window as any).PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: amount,
      currency: 'USD',
      ref: `VRF_${Date.now()}_${user.id}`,
      metadata: {
        user_id: user.id,
        username: user.username,
        tier: tier.id,
        billing_cycle: billingCycle,
      },
      callback: function(response: { reference: string }) {
        console.log('Payment successful:', response.reference)
        setVerificationStatus(tier.id)
        setIsProcessing(false)
        setShowSuccess(true)
      },
      onClose: function() {
        setIsProcessing(false)
      }
    })

    handler.openIframe()
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div 
            className="w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1DA1F2 0%, #0A84FF 100%)' }}
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-12 h-12">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Get Verified
          </h1>
          <p className="text-lg mb-10" style={{ color: 'var(--text-secondary)' }}>
            Sign in to subscribe and unlock premium features
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-4 rounded-full font-semibold text-white text-lg mb-4 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1DA1F2 0%, #0A84FF 100%)' }}
          >
            Sign in
          </button>
          <button 
            onClick={() => navigate('/register')}
            className="w-full py-4 rounded-full font-semibold text-lg border-2 transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            Create account
          </button>
        </div>
      </div>
    )
  }

  // Success
  if (showSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div 
              className="absolute inset-0 rounded-full animate-ping opacity-25"
              style={{ backgroundColor: '#1DA1F2' }}
            />
            <div 
              className="relative w-full h-full rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1DA1F2 0%, #0A84FF 100%)' }}
            >
              <VerifiedBadge size="lg" className="w-14 h-14 [&_path]:fill-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Welcome to Verified
          </h1>
          <p className="text-lg mb-10" style={{ color: 'var(--text-secondary)' }}>
            Your badge is now active. Enjoy your new features!
          </p>
          <button 
            onClick={() => navigate(`/user/${user.username}`)}
            className="w-full py-4 rounded-full font-semibold text-white text-lg mb-4 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1DA1F2 0%, #0A84FF 100%)' }}
          >
            View your profile
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 rounded-full font-semibold text-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            Open dashboard
          </button>
        </div>
      </div>
    )
  }

  // Already verified
  if (verificationStatus.isVerified) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div 
            className="w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1DA1F2 0%, #0A84FF 100%)' }}
          >
            <VerifiedBadge size="lg" className="w-12 h-12 [&_path]:fill-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3" style={{ color: 'var(--text-primary)' }}>
            You're verified
            <VerifiedBadge size="lg" />
          </h1>
          <p className="text-lg mb-1" style={{ color: 'var(--text-secondary)' }}>
            {verificationStatus.tier?.charAt(0).toUpperCase()}{verificationStatus.tier?.slice(1)} subscription
          </p>
          <p className="text-sm mb-10" style={{ color: 'var(--text-tertiary)' }}>
            Renews {new Date(verificationStatus.expiresAt!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 rounded-full font-semibold text-white text-lg mb-4 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1DA1F2 0%, #0A84FF 100%)' }}
          >
            Open dashboard
          </button>
          <button 
            onClick={() => navigate(`/user/${user.username}`)}
            className="w-full py-4 rounded-full font-semibold text-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            View profile
          </button>
        </div>
      </div>
    )
  }

  const currentTier = VERIFICATION_TIERS.find(t => t.id === selectedTier) || VERIFICATION_TIERS[1]
  const annualTotal = currentTier.monthlyPrice * 10
  const effectiveMonthly = billingCycle === 'annual' 
    ? Math.round((annualTotal / 12) * 100) / 100
    : currentTier.monthlyPrice

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <VerifiedBadge size="lg" className="mx-auto mb-5" />
        <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Subscribe to Verified
        </h1>
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
          Get verified and unlock premium features
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center mb-10">
        <div 
          className="inline-flex p-1.5 rounded-full gap-1"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <button
            onClick={() => setBillingCycle('monthly')}
            className="px-6 py-3 rounded-full text-sm font-semibold transition-all"
            style={{ 
              backgroundColor: billingCycle === 'monthly' ? 'var(--bg-primary)' : 'transparent',
              color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: billingCycle === 'monthly' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className="px-6 py-3 rounded-full text-sm font-semibold transition-all flex items-center gap-2"
            style={{ 
              backgroundColor: billingCycle === 'annual' ? 'var(--bg-primary)' : 'transparent',
              color: billingCycle === 'annual' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: billingCycle === 'annual' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Annual
            <span 
              className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: '#10B981' }}
            >
              -17%
            </span>
          </button>
        </div>
      </div>

      {/* Tier Cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {VERIFICATION_TIERS.map((tier) => {
          const isSelected = selectedTier === tier.id
          const displayPrice = billingCycle === 'annual' 
            ? Math.round((tier.monthlyPrice * 10 / 12) * 100) / 100
            : tier.monthlyPrice
          
          return (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className={`relative p-5 rounded-2xl text-left transition-all border-2 ${
                isSelected 
                  ? 'border-[#1DA1F2]' 
                  : 'border-transparent hover:border-[var(--border)]'
              }`}
              style={{ 
                backgroundColor: isSelected ? 'rgba(29, 161, 242, 0.06)' : 'var(--bg-primary)',
                boxShadow: 'var(--card-shadow)'
              }}
            >
              {tier.highlight && (
                <span 
                  className="absolute -top-2.5 right-4 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wide"
                  style={{ backgroundColor: '#1DA1F2' }}
                >
                  Popular
                </span>
              )}
              
              <div className="flex items-center gap-2.5 mb-3">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ 
                    background: tier.id === 'organization' 
                      ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                      : 'linear-gradient(135deg, #1DA1F2 0%, #0A84FF 100%)'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
                    <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  {tier.name}
                </span>
              </div>
              
              <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                {tier.description}
              </p>
              
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  ${displayPrice}
                </span>
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>/mo</span>
              </div>
              
              {billingCycle === 'annual' && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  ${tier.monthlyPrice * 10}/year
                </p>
              )}
              
              {/* Selection indicator */}
              <div 
                className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected ? 'border-[#1DA1F2] bg-[#1DA1F2]' : 'border-[var(--border)]'
                }`}
              >
                {isSelected && (
                  <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3">
                    <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Features List */}
      <div 
        className="rounded-3xl p-6 sm:p-8 mb-10"
        style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {currentTier.name}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {currentTier.description}
            </p>
          </div>
          <div className="sm:text-right">
            <div className="flex items-baseline gap-1 sm:justify-end">
              <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                ${billingCycle === 'annual' ? annualTotal : currentTier.monthlyPrice}
              </span>
              <span style={{ color: 'var(--text-tertiary)' }}>
                /{billingCycle === 'annual' ? 'year' : 'month'}
              </span>
            </div>
            {billingCycle === 'annual' && (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                ~${effectiveMonthly.toFixed(2)}/month
              </p>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 mb-8">
          {currentTier.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-3">
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(29, 161, 242, 0.12)' }}
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#1DA1F2" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ color: 'var(--text-primary)' }}>{feature}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => handlePayment(currentTier)}
          disabled={isProcessing}
          className="w-full py-4 rounded-full font-semibold text-white text-lg transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #1DA1F2 0%, #0A84FF 100%)' }}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
              Processing...
            </span>
          ) : (
            `Subscribe for $${billingCycle === 'annual' ? annualTotal : currentTier.monthlyPrice}/${billingCycle === 'annual' ? 'year' : 'month'}`
          )}
        </button>

        <p className="text-center text-sm mt-5" style={{ color: 'var(--text-tertiary)' }}>
          Cancel anytime • Secure payment
        </p>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h3 className="text-xl font-bold text-center mb-6" style={{ color: 'var(--text-primary)' }}>
          Questions? We've got answers.
        </h3>
        <div className="space-y-4">
          {[
            {
              q: 'What is verification?',
              a: 'Verification is a subscription that gives you a badge next to your name, confirming your identity and unlocking premium features.'
            },
            {
              q: 'When will my badge appear?',
              a: 'Your badge appears instantly after payment. It may take a few minutes to show everywhere on the platform.'
            },
            {
              q: 'Can I cancel anytime?',
              a: 'Yes, you can cancel your subscription anytime from your settings. Your badge stays active until your billing period ends.'
            },
            {
              q: 'What payment methods are accepted?',
              a: 'We accept all major credit and debit cards including Visa, Mastercard, and American Express.'
            },
          ].map((faq, i) => (
            <div 
              key={i}
              className="rounded-2xl p-5"
              style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
            >
              <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                {faq.q}
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
