'use client';

import * as React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';

export function TicketBuilder() {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'tickets' });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <Card key={field.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <h4 className="font-medium text-sm">Ticket {index + 1}</h4>
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
              name={`tickets.${index}.name`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Ticket Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. General Admission" {...f} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`tickets.${index}.price`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Price (cents)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...f} />
                  </FormControl>
                  <FormDescription className="text-xs">Enter 0 for free</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`tickets.${index}.quantity`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Unlimited"
                      {...f}
                      value={f.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`tickets.${index}.maxPerPerson`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Max per person</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="No limit"
                      {...f}
                      value={f.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`tickets.${index}.description`}
              render={({ field: f }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="What's included..." {...f} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`tickets.${index}.availableFrom`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Available From</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...f} value={f.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`tickets.${index}.availableTo`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Available Until</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...f} value={f.value ?? ''} />
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
            description: '',
            price: 0,
            isFree: true,
            quantity: undefined,
            maxPerPerson: undefined,
            availableFrom: '',
            availableTo: '',
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Ticket Type
      </Button>
    </div>
  );
}
