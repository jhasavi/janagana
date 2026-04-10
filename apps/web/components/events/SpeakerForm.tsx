'use client';

import * as React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

export function SpeakerForm() {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'speakers' });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <Card key={field.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <h4 className="font-medium text-sm">Speaker {index + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
            <FormField
              control={control}
              name={`speakers.${index}.name`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Smith" {...f} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`speakers.${index}.title`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="CEO at Acme Inc." {...f} value={f.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`speakers.${index}.company`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Inc." {...f} value={f.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`speakers.${index}.topic`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="What they'll talk about" {...f} value={f.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`speakers.${index}.photoUrl`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Photo URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." {...f} value={f.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`speakers.${index}.websiteUrl`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." {...f} value={f.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`speakers.${index}.bio`}
              render={({ field: f }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Short biography..." {...f} value={f.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        onClick={() =>
          append({
            name: '',
            title: '',
            company: '',
            bio: '',
            photoUrl: '',
            topic: '',
            websiteUrl: '',
            twitterUrl: '',
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Speaker
      </Button>
    </div>
  );
}
