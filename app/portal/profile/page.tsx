import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { generateMembershipCardQR } from '@/lib/actions'
import { QrCode, Download } from 'lucide-react'
import Image from 'next/image'

export default async function ProfilePage() {
  const user = await currentUser()

  // Look up the Member record that matches this Clerk user's email
  const member = user?.emailAddresses[0]?.emailAddress
    ? await prisma.member.findFirst({
        where: { email: user.emailAddresses[0].emailAddress },
      })
    : null

  const qrCode = member ? await generateMembershipCardQR(member.id) : null

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>
      
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-6 mb-6">
          {user?.imageUrl && (
            <Image
              src={user.imageUrl}
              alt="Profile"
              width={96}
              height={96}
              className="w-24 h-24 rounded-full"
            />
          )}
          <div>
            <h2 className="text-2xl font-semibold">{user?.fullName || 'User'}</h2>
            <p className="text-gray-600">{user?.emailAddresses[0]?.emailAddress}</p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Account Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <div className="text-gray-900">{user?.firstName || '-'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <div className="text-gray-900">{user?.lastName || '-'}</div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="text-gray-900">{user?.emailAddresses[0]?.emailAddress}</div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Digital Membership Card</h3>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center gap-6">
              {qrCode && (
                <div className="bg-white p-4 rounded-lg">
                  <Image src={qrCode} alt="Membership QR Code" width={192} height={192} className="w-48 h-48" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-gray-600 mb-4">
                  Scan this QR code to check in at events. This is your digital membership card.
                </p>
                <div className="flex gap-2">
                  <a
                    href={qrCode || '#'}
                    download="membership-card.png"
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Download Card
                  </a>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Apple Wallet and Google Pay integration coming soon (requires developer account setup)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Membership Status</h3>
          <p className="text-gray-600">
            Your membership information will appear here once you&apos;ve been added to an organization.
          </p>
        </div>
      </div>
    </div>
  )
}
