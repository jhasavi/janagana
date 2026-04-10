'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ChevronUp, ChevronDown, Pencil, Trash2, Plus, Loader2,
  GripVertical, X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  useCustomFields, useCreateCustomField, useUpdateCustomField,
  useDeleteCustomField, useReorderCustomFields,
} from '@/hooks/useSettings';
import type { CustomField, UpsertCustomFieldInput, CustomFieldType } from '@/lib/types/settings';

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'TEXT', label: 'Text (Short)' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'BOOLEAN', label: 'Yes / No' },
  { value: 'SELECT', label: 'Single Select' },
  { value: 'MULTI_SELECT', label: 'Multi Select' },
  { value: 'URL', label: 'URL / Link' },
  { value: 'PHONE', label: 'Phone Number' },
];

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  DATE: 'Date',
  BOOLEAN: 'Yes/No',
  SELECT: 'Single Select',
  MULTI_SELECT: 'Multi Select',
  URL: 'URL',
  PHONE: 'Phone',
};

// ─── Form schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(60),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'URL', 'PHONE']),
  isRequired: z.boolean(),
  isPublic: z.boolean(),
  placeholder: z.string().max(100).optional().or(z.literal('')),
  helpText: z.string().max(200).optional().or(z.literal('')),
  options: z.array(z.object({ value: z.string().min(1) })),
  showInMemberList: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// ─── Field form (used in create + edit dialogs) ────────────────────────────────

function FieldForm({
  defaultValues,
  onCancel,
  onSave,
  isSaving,
}: {
  defaultValues?: Partial<FormValues>;
  onCancel: () => void;
  onSave: (data: UpsertCustomFieldInput) => void;
  isSaving: boolean;
}) {
  const {
    register, handleSubmit, watch, setValue, control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      fieldType: 'TEXT',
      isRequired: false,
      isPublic: true,
      placeholder: '',
      helpText: '',
      options: [],
      showInMemberList: false,
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'options' });
  const watchedType = watch('fieldType');
  const needsOptions = watchedType === 'SELECT' || watchedType === 'MULTI_SELECT';

  const onSubmit = (data: FormValues) => {
    onSave({
      name: data.name,
      fieldType: data.fieldType,
      isRequired: data.isRequired,
      isPublic: data.isPublic,
      placeholder: data.placeholder || undefined,
      helpText: data.helpText || undefined,
      options: needsOptions ? data.options.map(o => o.value) : [],
      showInMemberList: data.showInMemberList,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="cf-name">Field Name</Label>
        <Input id="cf-name" {...register('name')} placeholder="e.g. Jersey Number" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label>Field Type</Label>
        <Controller
          control={control}
          name="fieldType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Options — only for SELECT / MULTI_SELECT */}
      {needsOptions && (
        <div className="space-y-2">
          <Label>Options</Label>
          {fields.map((f, idx) => (
            <div key={f.id} className="flex items-center gap-2">
              <Input {...register(`options.${idx}.value`)} placeholder={`Option ${idx + 1}`} />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => append({ value: '' })}
          >
            <Plus className="h-3.5 w-3.5" /> Add Option
          </Button>
        </div>
      )}

      {/* Placeholder */}
      <div className="space-y-1.5">
        <Label htmlFor="cf-placeholder">Placeholder</Label>
        <Input id="cf-placeholder" {...register('placeholder')} placeholder="Optional" />
      </div>

      {/* Help text */}
      <div className="space-y-1.5">
        <Label htmlFor="cf-help">Help Text</Label>
        <Input id="cf-help" {...register('helpText')} placeholder="Shown below the field" />
      </div>

      {/* Toggles */}
      <div className="space-y-3 pt-1">
        {([
          { key: 'isRequired' as const, label: 'Required' },
          { key: 'isPublic' as const, label: 'Visible to member' },
          { key: 'showInMemberList' as const, label: 'Show in member list' },
        ] as const).map(item => (
          <div key={item.key} className="flex items-center justify-between">
            <Label className="text-sm">{item.label}</Label>
            <Controller
              control={control}
              name={item.key}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Save Field'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomFieldsPage() {
  const { data: fields, isLoading } = useCustomFields();
  const { mutateAsync: createField, isPending: creating } = useCreateCustomField();
  const { mutateAsync: updateField, isPending: updating } = useUpdateCustomField();
  const { mutateAsync: deleteField, isPending: deleting } = useDeleteCustomField();
  const { mutateAsync: reorderFields } = useReorderCustomFields();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleReorder = async (currentFields: CustomField[], fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= currentFields.length) return;
    const reordered = [...currentFields];
    [reordered[fromIndex], reordered[toIndex]] = [reordered[toIndex], reordered[fromIndex]];
    try {
      await reorderFields(reordered.map(f => f.id));
    } catch {
      toast.error('Could not reorder fields');
    }
  };

  const handleCreate = async (data: UpsertCustomFieldInput) => {
    try {
      await createField(data);
      toast.success('Custom field added');
      setShowAddDialog(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleUpdate = async (data: UpsertCustomFieldInput) => {
    if (!editingField) return;
    try {
      await updateField({ id: editingField.id, data });
      toast.success('Field updated');
      setEditingField(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteField(deletingId);
      toast.success('Field deleted');
      setDeletingId(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-3xl">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Custom Fields</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add extra fields to member profiles. Drag rows to reorder.
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Field
        </Button>
      </div>

      {/* Fields table */}
      <div className="rounded-xl border overflow-x-auto">
        {!fields || fields.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No custom fields yet. Add one to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="w-8" />
                <th className="px-4 py-2.5 text-left font-medium">Field Name</th>
                <th className="px-4 py-2.5 text-left font-medium">Type</th>
                <th className="px-4 py-2.5 text-left font-medium">Attributes</th>
                <th className="px-4 py-2.5 text-right font-medium">Reorder</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => (
                <tr key={field.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="pl-3 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </td>
                  <td className="px-4 py-3 font-medium">{field.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {FIELD_TYPE_LABELS[field.fieldType]}
                  </td>
                  <td className="px-4 py-3 space-x-1.5">
                    {field.isRequired && <Badge variant="secondary">Required</Badge>}
                    {field.isPublic && <Badge variant="outline">Public</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-0.5">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => handleReorder(fields, idx, 'up')}
                        disabled={idx === 0}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => handleReorder(fields, idx, 'down')}
                        disabled={idx === fields.length - 1}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setEditingField(field)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(field.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Custom Field</DialogTitle>
          </DialogHeader>
          <FieldForm
            onCancel={() => setShowAddDialog(false)}
            onSave={handleCreate}
            isSaving={creating}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={Boolean(editingField)} onOpenChange={open => !open && setEditingField(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
          </DialogHeader>
          {editingField && (
            <FieldForm
              defaultValues={{
                name: editingField.name,
                fieldType: editingField.fieldType,
                isRequired: editingField.isRequired,
                isPublic: editingField.isPublic,
                placeholder: editingField.placeholder ?? '',
                helpText: editingField.helpText ?? '',
                options: (editingField.options ?? []).map(v => ({ value: v })),
                showInMemberList: false,
              }}
              onCancel={() => setEditingField(null)}
              onSave={handleUpdate}
              isSaving={updating}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={Boolean(deletingId)} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the field and any stored data for existing members.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
