'use client';

import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Mail, Link2, Megaphone } from 'lucide-react';
import { AvatarUpload } from '@/components/common/AvatarUpload';
import { FileUpload } from '@/components/common/FileUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useUploadDocument, UploadResponse } from '@/hooks/useUploads';

function ProfileEditor() {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>('');
  const [uploadedDocument, setUploadedDocument] = useState<UploadResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('Alex Morgan');
  const [email, setEmail] = useState('alex@yourorg.com');
  const [phone, setPhone] = useState('+1 555 123 4567');
  const [bio, setBio] = useState('Passionate club member and volunteer lead.');
  const [twitter, setTwitter] = useState('https://twitter.com/alex');
  const [linkedin, setLinkedin] = useState('https://linkedin.com/in/alex');

  const [showInDirectory, setShowInDirectory] = useState(true);
  const [emailReminders, setEmailReminders] = useState(true);
  const [shiftReminders, setShiftReminders] = useState(true);
  const [clubPosts, setClubPosts] = useState(false);
  const [expiryAlerts, setExpiryAlerts] = useState(true);
  const [announcements, setAnnouncements] = useState(true);
  const uploadDocumentMutation = useUploadDocument('member-documents');

  const handleUpload = async (files: File[]) => {
    if (!files.length) return;
    setUploadError(null);

    try {
      const document = await uploadDocumentMutation.mutateAsync(files[0]);
      setUploadedDocument(document);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed.');
    }
  };

  const handleSave = () => {
    toast.success('Profile saved');
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-shrink-0">
            <AvatarUpload
              currentUrl={avatarUrl}
              fallbackText={fullName.charAt(0)}
              onUpload={async (file) => {
                const url = URL.createObjectURL(file);
                setAvatarUrl(url);
                return url;
              }}
            />
          </div>
          <div className="grow space-y-4">
            <div>
              <h1 className="text-2xl font-semibold">My Profile</h1>
              <p className="text-sm text-muted-foreground mt-1">Update your public profile details and contact preferences.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">About me</h2>
            <p className="text-sm text-muted-foreground">A short bio that appears on your public profile.</p>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-input bg-background p-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Membership documents</h2>
            <p className="text-sm text-muted-foreground">Upload ID, agreement, or proof documents for your membership.</p>
          </div>
          <FileUpload
            onFilesSelected={handleUpload}
            accept={{
              'application/pdf': ['.pdf'],
              'application/msword': ['.doc'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            }}
            maxFiles={1}
            maxSize={10 * 1024 * 1024}
          />
          {uploadDocumentMutation.isLoading ? (
            <p className="text-sm text-muted-foreground">Uploading document…</p>
          ) : uploadedDocument ? (
            <div className="rounded-2xl border border-border bg-background p-4 text-sm">
              <p className="font-medium">Uploaded file</p>
              <a href={uploadedDocument.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                View document
              </a>
            </div>
          ) : null}
          {uploadError ? (
            <p className="text-sm text-destructive">{uploadError}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Social links</h2>
              <p className="text-sm text-muted-foreground">Add links to your public profile.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>LinkedIn</Label>
                <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Privacy settings</h2>
              <p className="text-sm text-muted-foreground">Control what appears in the member directory.</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Show my profile</p>
                  <p className="text-sm text-muted-foreground">Allow other members to find you in the directory.</p>
                </div>
                <Switch checked={showInDirectory} onCheckedChange={setShowInDirectory} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Show contact info</p>
                  <p className="text-sm text-muted-foreground">Let other members see your email and phone.</p>
                </div>
                <Switch checked={announcements} onCheckedChange={setAnnouncements} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Notification preferences</h2>
            <p className="text-sm text-muted-foreground">Choose which emails you receive.</p>
          </div>
          {[
            { label: 'Event reminders', value: emailReminders, setter: setEmailReminders, icon: Mail },
            { label: 'Volunteer shift reminders', value: shiftReminders, setter: setShiftReminders, icon: ShieldCheck },
            { label: 'Club posts', value: clubPosts, setter: setClubPosts, icon: Link2 },
            { label: 'Membership expiry', value: expiryAlerts, setter: setExpiryAlerts, icon: ShieldCheck },
            { label: 'Announcements', value: announcements, setter: setAnnouncements, icon: Megaphone },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">Receive this update by email</p>
                </div>
              </div>
              <Switch checked={item.value} onCheckedChange={item.setter} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Want to change your password or account security settings?</p>
        </div>
        <Button onClick={handleSave} className="w-full sm:w-auto">
          Save profile
        </Button>
      </div>
    </div>
  );
}
