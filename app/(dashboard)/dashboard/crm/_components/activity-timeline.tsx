'use client'

import { Calendar, Clock, MapPin, Phone, Mail, MessageSquare, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Activity } from '@prisma/client'

interface ActivityTimelineProps {
  activities: Activity[]
}

const activityIcons: Record<string, any> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  NOTE: FileText,
  TASK: MessageSquare,
}

const activityColors: Record<string, string> = {
  CALL: 'bg-blue-100 text-blue-700',
  EMAIL: 'bg-green-100 text-green-700',
  MEETING: 'bg-purple-100 text-purple-700',
  NOTE: 'bg-gray-100 text-gray-700',
  TASK: 'bg-orange-100 text-orange-700',
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No activities yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.type] || FileText
        const colorClass = activityColors[activity.type] || 'bg-gray-100 text-gray-700'

        return (
          <div key={activity.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="w-px h-full bg-border mt-2" />
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="text-xs">
                  {activity.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(activity.createdAt)}
                </span>
              </div>
              <h4 className="font-medium text-sm">{activity.title}</h4>
              {activity.description && (
                <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
              )}
              {activity.duration && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Clock className="h-3 w-3" />
                  {activity.duration} min
                </div>
              )}
              {activity.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  {activity.location}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
