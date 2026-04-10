'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import type { InvoiceItemRecord, InvoiceRecord, CreateInvoicePayload } from '@/lib/types/payments';

interface InvoiceModalProps {
  invoice?: InvoiceRecord;
  onCreate: (payload: CreateInvoicePayload) => void;
}

const initialItems = [{ description: '', quantity: 1, unitCents: 0 }];

export function InvoiceModal({ invoice, onCreate }: InvoiceModalProps) {
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState(initialItems);

  const handleAddItem = () => setItems((prev) => [...prev, { description: '', quantity: 1, unitCents: 0 }]);
  const handleUpdateItem = (index: number, key: keyof InvoiceItemRecord, value: string | number) => {
    setItems((prev) => prev.map((item, idx) => idx === index ? { ...item, [key]: value } : item));
  };

  const handleSubmit = () => {
    const payload: CreateInvoicePayload = {
      memberId,
      notes,
      dueDate: dueDate || undefined,
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitCents: item.unitCents,
      })),
    };
    onCreate(payload);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <Plus className="h-4 w-4" /> Create invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{invoice ? 'Edit invoice' : 'New invoice'}</DialogTitle>
          <DialogDescription>Build a manual invoice for any member or event charge.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Member ID</Label>
              <Input value={memberId} onChange={(event) => setMemberId(event.target.value)} />
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Invoice items</p>
              <Button variant="outline" size="sm" onClick={handleAddItem} className="gap-2">
                <Plus className="h-4 w-4" /> Add item
              </Button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-3xl border border-border bg-background p-4 sm:grid-cols-[1.5fr,0.8fr,0.8fr,auto]">
                  <div>
                    <Label>Description</Label>
                    <Input value={item.description} onChange={(event) => handleUpdateItem(index, 'description', event.target.value)} className="mt-2" />
                  </div>
                  <div>
                    <Label>Qty</Label>
                    <Input type="number" min={1} value={item.quantity} onChange={(event) => handleUpdateItem(index, 'quantity', Number(event.target.value))} className="mt-2" />
                  </div>
                  <div>
                    <Label>Unit cents</Label>
                    <Input type="number" min={0} value={item.unitCents} onChange={(event) => handleUpdateItem(index, 'unitCents', Number(event.target.value))} className="mt-2" />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save invoice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
