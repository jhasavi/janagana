import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface MembershipCardProps {
  member: any;
  organization: any;
}

export function MembershipCard({ member, organization }: MembershipCardProps) {
  return (
    <View className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-6 shadow-lg">
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-white text-lg font-bold">{organization?.name}</Text>
          <Text className="text-white/80 text-sm">{member?.membershipTier?.name || 'Member'}</Text>
        </View>
        {organization?.logoUrl && (
          <View className="w-12 h-12 bg-white/20 rounded-lg items-center justify-center">
            <Text className="text-white font-bold text-xl">
              {organization.name.charAt(0)}
            </Text>
          </View>
        )}
      </View>

      <View className="bg-white/10 rounded-xl p-4 mb-4">
        <Text className="text-white text-xs mb-1">Member ID</Text>
        <Text className="text-white font-mono">{member?.id.slice(0, 8).toUpperCase()}</Text>
      </View>

      <View className="bg-white rounded-xl p-4 items-center justify-center">
        <QRCode
          value={`orgflow://member/${member?.id}`}
          size={150}
          color="#667eea"
          backgroundColor="white"
        />
        <Text className="text-gray-600 text-xs mt-2">Scan for check-in</Text>
      </View>

      {member?.membershipTier?.expiresAt && (
        <Text className="text-white/70 text-xs text-center mt-3">
          Expires: {new Date(member.membershipTier.expiresAt).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
}
