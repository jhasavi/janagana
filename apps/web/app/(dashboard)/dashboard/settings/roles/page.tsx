'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Loader2, Plus, Trash2, Edit2, Copy, Shield, Users, Settings,
  ChevronDown, ChevronRight, Search, Filter,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGate } from '@/components/permission-gate';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

import {
  PERMISSIONS,
  PERMISSION_CATEGORIES,
  RoleType,
  ROLE_PRESETS,
  getRoleDisplayName,
  getPermissionDescription,
  Permission,
  Role,
} from '@orgflow/types';

// Form schemas
const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50, 'Role name must be 50 characters or less'),
  description: z.string().max(200, 'Description must be 200 characters or less').optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});

type CreateRoleFormData = z.infer<typeof createRoleSchema>;

// Mock data - replace with actual API calls
const mockCustomRoles: Role[] = [
  {
    id: '1',
    name: 'Event Manager',
    type: 'CUSTOM' as RoleType,
    permissions: [
      PERMISSIONS.EVENTS.VIEW,
      PERMISSIONS.EVENTS.CREATE,
      PERMISSIONS.EVENTS.EDIT,
      PERMISSIONS.EVENTS.DELETE,
      PERMISSIONS.EVENTS.MANAGE_REGISTRATIONS,
      PERMISSIONS.MEMBERS.VIEW,
    ],
    description: 'Can manage events and view member information',
    isCustom: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Communication Lead',
    type: 'CUSTOM' as RoleType,
    permissions: [
      PERMISSIONS.COMMUNICATIONS.VIEW,
      PERMISSIONS.COMMUNICATIONS.SEND_CAMPAIGNS,
      PERMISSIONS.COMMUNICATIONS.MANAGE_TEMPLATES,
      PERMISSIONS.MEMBERS.VIEW,
      PERMISSIONS.ANALYTICS.VIEW,
    ],
    description: 'Handles all communications and campaigns',
    isCustom: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function RolesSettingsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteRoleDialog, setDeleteRoleDialog] = useState<Role | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
    },
  });

  // Mock data - replace with actual API calls
  const customRoles = mockCustomRoles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateRole = async (data: CreateRoleFormData) => {
    try {
      // API call to create role
      console.log('Creating role:', data);
      toast.success('Role created successfully');
      setIsCreateDialogOpen(false);
      reset();
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    reset({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions,
    });
  };

  const handleUpdateRole = async (data: CreateRoleFormData) => {
    if (!editingRole) return;

    try {
      // API call to update role
      console.log('Updating role:', editingRole.id, data);
      toast.success('Role updated successfully');
      setEditingRole(null);
      reset();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleDeleteRole = async (role: Role) => {
    try {
      // API call to delete role
      console.log('Deleting role:', role.id);
      toast.success('Role deleted successfully');
      setDeleteRoleDialog(null);
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  const handleDuplicateRole = async (role: Role) => {
    try {
      // API call to duplicate role
      console.log('Duplicating role:', role.id);
      toast.success('Role duplicated successfully');
    } catch (error) {
      console.error('Error duplicating role:', error);
      toast.error('Failed to duplicate role');
    }
  };

  const toggleCategoryExpansion = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getPermissionsByCategory = (category: string) => {
    if (category === 'all') return Object.values(PERMISSIONS).flat();
    return Object.values(PERMISSIONS[category as keyof typeof PERMISSIONS] || []);
  };

  const filteredPermissions = getPermissionsByCategory(selectedCategory);

  const isDialogOpen = isCreateDialogOpen || !!editingRole;

  return (
    <PermissionGate permission={PERMISSIONS.SETTINGS.MANAGE_TEAM}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Roles & Permissions</h1>
            <p className="text-muted-foreground">
              Manage custom roles and their permissions
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Permissions</SelectItem>
                  {PERMISSION_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0) + category.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Preset Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Preset Roles
            </CardTitle>
            <CardDescription>
              Built-in roles with predefined permission sets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(ROLE_PRESETS).map(([roleType, permissions]) => (
                <Card key={roleType} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{getRoleDisplayName(roleType as keyof typeof ROLE_PRESETS)}</CardTitle>
                    <CardDescription>
                      {permissions.length} permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {permissions.slice(0, 3).map((permission) => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {permission.split(':')[1]}
                        </Badge>
                      ))}
                      {permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Custom Roles
            </CardTitle>
            <CardDescription>
              Roles you've created with custom permission sets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customRoles.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No custom roles</h3>
                <p className="text-muted-foreground">
                  Create your first custom role to get started
                </p>
                <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Role
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{role.permissions.length} permissions</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(role.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditRole(role)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateRole(role)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteRoleDialog(role)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Role Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingRole(null);
            reset();
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </DialogTitle>
              <DialogDescription>
                {editingRole 
                  ? 'Modify the role permissions and details'
                  : 'Create a custom role with specific permissions'
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={editingRole ? handleSubmit(handleUpdateRole) : handleSubmit(handleCreateRole)}>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Role Name *</Label>
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="name"
                          placeholder="e.g., Event Manager"
                        />
                      )}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="description"
                          placeholder="Brief description of the role"
                        />
                      )}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive">{errors.description.message}</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Permissions *</Label>
                  <div className="space-y-3">
                    {PERMISSION_CATEGORIES.map((category) => (
                      <Card key={category}>
                        <CardHeader 
                          className="pb-3 cursor-pointer"
                          onClick={() => toggleCategoryExpansion(category)}
                        >
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              {category.charAt(0) + category.slice(1).toLowerCase()}
                            </CardTitle>
                            {expandedCategories.has(category) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </CardHeader>
                        {expandedCategories.has(category) && (
                          <CardContent className="space-y-2">
                            {Object.values(PERMISSIONS[category as keyof typeof PERMISSIONS]).map((permission) => (
                              <div key={permission} className="flex items-start space-x-2">
                                <Controller
                                  name="permissions"
                                  control={control}
                                  render={({ field }) => (
                                    <Checkbox
                                      id={permission}
                                      checked={field.value.includes(permission)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([...field.value, permission]);
                                        } else {
                                          field.onChange(field.value.filter((p) => p !== permission));
                                        }
                                      }}
                                    />
                                  )}
                                />
                                <div className="flex-1">
                                  <Label htmlFor={permission} className="font-normal">
                                    {permission.split(':')[1].replace('_', ' ').toUpperCase()}
                                  </Label>
                                  <p className="text-sm text-muted-foreground">
                                    {getPermissionDescription(permission)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                  {errors.permissions && (
                    <p className="text-sm text-destructive">{errors.permissions.message}</p>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingRole(null);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRole ? 'Update Role' : 'Create Role'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Role Dialog */}
        <AlertDialog open={!!deleteRoleDialog} onOpenChange={() => setDeleteRoleDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Role</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the role "{deleteRoleDialog?.name}"? 
                This action cannot be undone and may affect users assigned to this role.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteRoleDialog && handleDeleteRole(deleteRoleDialog)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionGate>
  );
}
