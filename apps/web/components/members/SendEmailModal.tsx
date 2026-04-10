'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSendMemberEmail } from '@/hooks/useMembers';
import { sendEmailSchema, type SendEmailInput } from '@/lib/validations/member';

interface SendEmailModalProps {
  open: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
}

export function SendEmailModal({ open, onClose, memberId, memberName }: SendEmailModalProps) {
  const { mutateAsync, isPending } = useSendMemberEmail();

  const form = useForm<SendEmailInput>({
    resolver: zodResolver(sendEmailSchema),
    defaultValues: { subject: '', body: '' },
  });

  const onSubmit = async (values: SendEmailInput) => {
    try {
      const result = await mutateAsync({ memberId, data: values });
      toast.success(`Email queued for ${memberName}`, {
        description: `${result.queued} recipient(s) in queue.`,
      });
      form.reset();
      onClose();
    } catch (err) {
      toast.error('Failed to send email', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription>Send a message to {memberName}.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Email subject…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Write your message here…" rows={6} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                <Send className="mr-2 h-4 w-4" />
                {isPending ? 'Sending…' : 'Send Email'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
