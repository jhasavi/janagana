'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createClubSchema, type CreateClubInput } from '@/lib/validations/club';

const CATEGORY_OPTIONS = [
  { value: 'INTEREST', label: 'Interest' },
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'OTHER', label: 'Other' },
];

interface ClubFormProps {
  defaultValues?: Partial<CreateClubInput>;
  onSubmit: (data: CreateClubInput) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function ClubForm({ defaultValues, onSubmit, submitLabel = 'Save', isSubmitting }: ClubFormProps) {
  const [tagInput, setTagInput] = useState('');

  const form = useForm<CreateClubInput>({
    resolver: zodResolver(createClubSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      category: undefined,
      coverImageUrl: '',
      logoUrl: '',
      isPublic: true,
      requiresApproval: false,
      maxMembers: undefined,
      tags: [],
      socialLinks: { website: '', facebook: '', instagram: '', twitter: '' },
      meetingSchedule: '',
      ...defaultValues,
    },
  });

  const { formState: { isSubmitting: formSubmitting } } = form;
  const busy = isSubmitting || formSubmitting;

  const tags = form.watch('tags') ?? [];

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v) && tags.length < 10) {
      form.setValue('tags', [...tags, v]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    form.setValue('tags', tags.filter((t) => t !== tag));
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic details */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Details</h3>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Club Name *</FormLabel>
                <FormControl><Input placeholder="e.g. Photography Club" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What is this club about?"
                    className="min-h-[100px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="coverImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image URL</FormLabel>
                  <FormControl><Input placeholder="https://…" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl><Input placeholder="https://…" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Visibility & access */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Visibility & Access</h3>

          <FormField
            control={form.control}
            name="isPublic"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div>
                  <FormLabel className="cursor-pointer">Public club</FormLabel>
                  <FormDescription>Anyone in the organisation can discover and view this club.</FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requiresApproval"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div>
                  <FormLabel className="cursor-pointer">Require approval to join</FormLabel>
                  <FormDescription>New members must be approved by a leader before joining.</FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxMembers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Membership Cap</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    placeholder="Unlimited"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>Leave blank for no limit.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Tags */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tags</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Add a tag…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={!tagInput.trim() || tags.length >= 10}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 rounded-full hover:bg-muted/80 p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Meeting schedule */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Meeting Schedule</h3>
          <FormField
            control={form.control}
            name="meetingSchedule"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schedule Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g. Every Wednesday at 6 PM in Room 201"
                    className="min-h-[80px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Social links */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Social Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['website', 'facebook', 'instagram', 'twitter'] as const).map((key) => (
              <FormField
                key={key}
                control={form.control}
                name={`socialLinks.${key}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="capitalize">{key}</FormLabel>
                    <FormControl>
                      <Input placeholder={`${key} URL`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
