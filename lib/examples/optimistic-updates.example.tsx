/**
 * Optimistic Updates Example
 *
 * This file demonstrates how to implement optimistic UI updates in JanaGana.
 * The pattern: update UI immediately → send mutation → sync with server → rollback if error.
 *
 * Benefits:
 * - Instant user feedback (no loading states)
 * - Faster perceived performance
 * - Auto-rollback if server rejects the mutation
 *
 * Usage:
 * 1. Copy this pattern to your client components
 * 2. Replace `updateContact` with your server action
 * 3. Replace `contacts` state with your actual data
 *
 * For more: https://react.dev/reference/react/useOptimistic
 */

'use client'

import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'
// import { updateContact } from '@/lib/actions/contacts'
import type { Contact } from '@prisma/client'

interface ContactOptimisticProps {
  initialContacts: Contact[]
}

export function ContactListWithOptimisticUpdates({ initialContacts }: ContactOptimisticProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticContacts, addOptimisticContact] = useOptimistic(
    initialContacts,
    (state: Contact[], { type, contact }: { type: string; contact: Partial<Contact> }) => {
      if (type === 'UPDATE') {
        return state.map((c) => (c.id === contact.id ? { ...c, ...contact } : c))
      }
      return state
    }
  )

  const handleContactUpdate = async (contactId: string, newEmail: string) => {
    // Optimistically update the UI immediately
    addOptimisticContact({
      type: 'UPDATE',
      contact: { id: contactId, email: newEmail },
    })

    // Send mutation to server
    startTransition(async () => {
      // const result = await updateContact(contactId, { email: newEmail })
      // 
      // if (result.success) {
      //   toast.success(`Updated contact: ${newEmail}`)
      // } else {
      //   // If server rejects, useOptimistic automatically reverts to initialContacts
      //   toast.error(result.error || 'Failed to update contact')
      // }
      toast.success('Update simulated')
    })
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Contacts</h3>
      {optimisticContacts.map((contact) => (
        <div
          key={contact.id}
          className={`p-3 border rounded flex justify-between items-center transition ${
            isPending ? 'opacity-75' : 'opacity-100'
          }`}
        >
          <span>{contact.email}</span>
          <button
            onClick={() => handleContactUpdate(contact.id, `updated-${contact.email}`)}
            disabled={isPending}
            className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isPending ? 'Updating...' : 'Edit'}
          </button>
        </div>
      ))}
    </div>
  )
}

/**
 * Alternative: Using React Query (TanStack Query) for Optimistic Updates
 *
 * If you prefer external state management:
 */

// import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
//
// export function ContactListWithReactQuery(initialContacts: Contact[]) {
//   const queryClient = useQueryClient()
//
//   const { data: contacts = initialContacts } = useQuery({
//     queryKey: ['contacts'],
//     queryFn: async () => initialContacts, // Replace with actual API call
//     initialData: initialContacts,
//   })
//
//   const mutation = useMutation({
//     mutationFn: (data: { contactId: string; email: string }) =>
//       // updateContact(data.contactId, { email: data.email })
//       Promise.resolve({ success: true }),
//
//     onMutate: async (variables) => {
//       // Cancel outgoing queries
//       await queryClient.cancelQueries({ queryKey: ['contacts'] })
//
//       // Snapshot previous data
//       const previousContacts = queryClient.getQueryData<Contact[]>(['contacts'])
//
//       // Optimistically update cache
//       queryClient.setQueryData(['contacts'], (old: Contact[] = []) =>
//         old.map((c) =>
//           c.id === variables.contactId ? { ...c, email: variables.email } : c
//         )
//       )
//
//       return { previousContacts }
//     },
//
//     onError: (err, variables, context) => {
//       // Rollback on error
//       if (context?.previousContacts) {
//         queryClient.setQueryData(['contacts'], context.previousContacts)
//       }
//       toast.error(`Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`)
//     },
//
//     onSuccess: () => {
//       toast.success('Contact updated!')
//       queryClient.invalidateQueries({ queryKey: ['contacts'] })
//     },
//   })
//
//   return (
//     <div className="space-y-2">
//       {contacts.map((contact) => (
//         <div key={contact.id} className="p-3 border rounded flex justify-between">
//           <span>{contact.email}</span>
//           <button
//             onClick={() =>
//               mutation.mutate({ contactId: contact.id, email: `updated-${contact.email}` })
//             }
//             disabled={mutation.isPending}
//           >
//             {mutation.isPending ? 'Saving...' : 'Edit'}
//           </button>
//         </div>
//       ))}
//     </div>
//   )
// }
