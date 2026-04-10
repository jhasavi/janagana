import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { pdf, Document, Page, StyleSheet, View, Text, Image } from '@react-pdf/renderer';
import Papa from 'papaparse';
import QRCode from 'qrcode';
import { Workbook } from 'exceljs';
import { ReportFormat, ReportQueryDto, DateRangeDto, ImportOptionsDto } from './dto/report-filters.dto';
import { MembershipCertificateDocument } from '../../reports/templates/MembershipCertificate';
import { VolunteerCertificateDocument } from '../../reports/templates/VolunteerCertificate';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  private escapeCsv(value: unknown): string {
    if (value === null || value === undefined) return '';
    const text = String(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  private formatCurrency(cents: number | null | undefined): string {
    if (cents == null) return '$0.00';
    return `$${(cents / 100).toFixed(2)}`;
  }

  private buildCsv(headers: string[], rows: string[][]): string {
    const lines = [headers.map((header) => this.escapeCsv(header)).join(',')];
    for (const row of rows) {
      lines.push(row.map((cell) => this.escapeCsv(cell)).join(','));
    }
    return lines.join('\r\n');
  }

  private async createQrDataUrl(payload: string) {
    return QRCode.toDataURL(payload, { errorCorrectionLevel: 'M' });
  }

  async sendReportResponse(
    res: any,
    baseFilename: string,
    format: ReportFormat,
    payload: unknown,
  ) {
    const contentType = format === ReportFormat.PDF
      ? 'application/pdf'
      : format === ReportFormat.XLSX
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv';

    const filename = `${baseFilename}.${format === ReportFormat.XLSX ? 'xlsx' : format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(payload as any);
  }

  async generateMembersReport(tenantId: string, filters: ReportQueryDto, format: ReportFormat) {
    const memberFilter: any = { tenantId };
    if (filters.status) memberFilter.status = filters.status;
    if (filters.tierId) {
      memberFilter.membershipSubscriptions = { some: { tierId: filters.tierId } };
    }
    if (filters.fromDate || filters.toDate) {
      memberFilter.joinedAt = {};
      if (filters.fromDate) memberFilter.joinedAt.gte = new Date(filters.fromDate);
      if (filters.toDate) memberFilter.joinedAt.lte = new Date(filters.toDate);
    }

    const [members, customFields, attendanceTotals, volunteerTotals, paymentTotals, subscriptions] = await Promise.all([
      this.db.member.findMany({
        where: memberFilter,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          countryCode: true,
          status: true,
          joinedAt: true,
          createdAt: true,
          updatedAt: true,
          customFieldValues: {
            select: {
              value: true,
              field: { select: { name: true } },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      this.db.memberCustomField.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } }),
      this.db.eventAttendance.groupBy({ where: { tenantId }, by: ['memberId'], _count: { id: true } }),
      this.db.volunteerHours.groupBy({ where: { tenantId }, by: ['memberId'], _sum: { hours: true } }),
      this.db.payment.groupBy({ where: { tenantId, status: { in: ['SUCCEEDED'] } }, by: ['memberId'], _sum: { amountCents: true } }),
      this.db.membershipSubscription.findMany({
        where: { tenantId, status: 'ACTIVE' },
        include: { tier: true },
      }),
    ]);

    const attendanceMap = new Map(attendanceTotals.map((item) => [item.memberId, item._count.id]));
    const volunteerMap = new Map(volunteerTotals.map((item) => [item.memberId, item._sum.hours ?? 0]));
    const paymentMap = new Map(paymentTotals.map((item) => [item.memberId, item._sum.amountCents ?? 0]));
    const tierMap = new Map<string, { name: string; endsAt: Date | null }[]>();
    for (const subscription of subscriptions) {
      const list = tierMap.get(subscription.memberId) ?? [];
      list.push({ name: subscription.tier?.name ?? 'Unknown', endsAt: subscription.endsAt ?? null });
      tierMap.set(subscription.memberId, list);
    }

    const customFieldNames = customFields.map((field) => field.name);
    const rows = members.map((member) => {
      const fieldsByName = Object.fromEntries(
        member.customFieldValues.map((value) => [value.field.name, value.value ?? '']),
      );
      const subscriptionData = tierMap.get(member.id) ?? [];
      const activeTier = subscriptionData.sort((a, b) => {
        if (!a.endsAt) return -1;
        if (!b.endsAt) return 1;
        return b.endsAt.getTime() - a.endsAt.getTime();
      })[0];

      return [
        member.id,
        member.email,
        member.firstName,
        member.lastName,
        member.phone ?? '',
        member.address ?? '',
        member.city ?? '',
        member.state ?? '',
        member.postalCode ?? '',
        member.countryCode ?? '',
        member.status,
        member.joinedAt.toISOString(),
        activeTier?.name ?? '',
        activeTier?.endsAt ? activeTier.endsAt.toISOString() : '',
        String(attendanceMap.get(member.id) ?? 0),
        String(volunteerMap.get(member.id) ?? 0),
        this.formatCurrency(paymentMap.get(member.id) ?? 0),
        ...customFieldNames.map((name) => String(fieldsByName[name] ?? '')),
      ];
    });

    const headers = [
      'Member ID',
      'Email',
      'First Name',
      'Last Name',
      'Phone',
      'Address',
      'City',
      'State',
      'Postal Code',
      'Country',
      'Status',
      'Join Date',
      'Membership Tier',
      'Membership Expiry',
      'Event Attendance Count',
      'Volunteer Hours Total',
      'Payment Total',
      ...customFieldNames,
    ];

    if (format === ReportFormat.PDF) {
      const document = (
        <Document>
          <Page size="A4" style={styles.page} wrap>
            <Text style={styles.header}>Member Report</Text>
            <View style={styles.tableHeader}>
              {headers.slice(0, 8).map((label, index) => (
                <Text key={index} style={styles.cell}>{label}</Text>
              ))}
            </View>
            {rows.slice(0, 40).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.tableRow}>
                {row.slice(0, 8).map((cell, cellIndex) => (
                  <Text key={cellIndex} style={styles.cell}>{cell}</Text>
                ))}
              </View>
            ))}
          </Page>
        </Document>
      );
      return pdf(document).toBuffer() as unknown as Promise<Buffer>;
    }

    if (format === ReportFormat.XLSX) {
      const workbook = new Workbook();
      const sheet = workbook.addWorksheet('Members');
      sheet.addRow(headers);
      rows.forEach((row) => sheet.addRow(row));
      sheet.columns?.forEach((column: any) => {
        column.width = Math.max(15, String(column.header).length + 4);
      });
      return workbook.xlsx.writeBuffer();
    }

    return this.buildCsv(headers, rows);
  }

  async generateEventsReport(tenantId: string, filters: ReportQueryDto, format: ReportFormat) {
    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.fromDate || filters.toDate) {
      where.startsAt = {};
      if (filters.fromDate) where.startsAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.startsAt.lte = new Date(filters.toDate);
    }

    const [events, registrationTotals, attendanceTotals] = await Promise.all([
      this.db.event.findMany({ where, orderBy: { startsAt: 'desc' } }),
      this.db.eventRegistration.groupBy({ where: { tenantId, status: { in: ['CONFIRMED', 'ATTENDED'] } }, by: ['eventId'], _count: { id: true }, _sum: { amountCents: true } }),
      this.db.eventAttendance.groupBy({ where: { tenantId }, by: ['eventId'], _count: { id: true } }),
    ]);

    const regMap = new Map(registrationTotals.map((item) => [item.eventId, item]));
    const attendanceMap = new Map(attendanceTotals.map((item) => [item.eventId, item._count.id]));

    const headers = ['Event ID', 'Title', 'Starts At', 'Ends At', 'Status', 'Registrations', 'Attendance', 'Revenue'];
    const rows = events.map((event) => {
      const registration = regMap.get(event.id);
      return [
        event.id,
        event.title,
        event.startsAt.toISOString(),
        event.endsAt?.toISOString() ?? '',
        event.status,
        String(registration?._count.id ?? 0),
        String(attendanceMap.get(event.id) ?? 0),
        this.formatCurrency(registration?._sum.amountCents ?? 0),
      ];
    });

    if (format === ReportFormat.PDF) {
      const document = (
        <Document>
          <Page size="A4" style={styles.page} wrap>
            <Text style={styles.header}>Event Report</Text>
            {rows.slice(0, 50).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                <Text style={styles.cell}>{row[1]}</Text>
                <Text style={styles.cell}>{row[5]}</Text>
                <Text style={styles.cell}>{row[6]}</Text>
                <Text style={styles.cell}>{row[7]}</Text>
              </View>
            ))}
          </Page>
        </Document>
      );
      return pdf(document).toBuffer() as unknown as Promise<Buffer>;
    }

    if (format === ReportFormat.XLSX) {
      const workbook = new Workbook();
      const sheet = workbook.addWorksheet('Events');
      sheet.addRow(headers);
      rows.forEach((row) => sheet.addRow(row));
      sheet.columns?.forEach((column: any) => {
        column.width = Math.max(15, String(column.header).length + 4);
      });
      return workbook.xlsx.writeBuffer();
    }

    return this.buildCsv(headers, rows);
  }

  async generateVolunteerReport(tenantId: string, filters: ReportQueryDto, format: ReportFormat) {
    const where: any = { tenantId };
    if (filters.memberId) where.memberId = filters.memberId;
    if (filters.opportunityId) where.opportunityId = filters.opportunityId;
    if (filters.fromDate || filters.toDate) {
      where.date = {};
      if (filters.fromDate) where.date.gte = new Date(filters.fromDate);
      if (filters.toDate) where.date.lte = new Date(filters.toDate);
    }

    const records = await this.db.volunteerHours.findMany({
      where,
      include: {
        member: { select: { firstName: true, lastName: true, email: true } },

      },
      orderBy: { date: 'desc' },
    });

    const headers = ['Date', 'Member', 'Email', 'Opportunity', 'Hours', 'Status', 'Description'];
const rows = records.map((item: any) => [
      item.date.toISOString(),
      `${item.member.firstName} ${item.member.lastName}`,
      item.member.email,
      item.opportunityId ?? '',
      String(item.hours),
      item.isApproved ? 'Approved' : 'Pending',
      item.description ?? '',
    ]);

    if (format === ReportFormat.PDF) {
      const document = (
        <Document>
          <Page size="A4" style={styles.page} wrap>
            <Text style={styles.header}>Volunteer Hours Report</Text>
            {rows.slice(0, 50).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                <Text style={styles.cell}>{row[0]}</Text>
                <Text style={styles.cell}>{row[1]}</Text>
                <Text style={styles.cell}>{row[4]}</Text>
              </View>
            ))}
          </Page>
        </Document>
      );
      return pdf(document).toBuffer() as unknown as Promise<Buffer>;
    }

    if (format === ReportFormat.XLSX) {
      const workbook = new Workbook();
      const sheet = workbook.addWorksheet('Volunteers');
      sheet.addRow(headers);
      rows.forEach((row) => sheet.addRow(row));
      sheet.columns?.forEach((column: any) => {
        column.width = Math.max(15, String(column.header).length + 4);
      });
      return workbook.xlsx.writeBuffer();
    }

    return this.buildCsv(headers, rows);
  }

  async generateFinancialReport(tenantId: string, range: DateRangeDto, format: ReportFormat) {
    const paymentWhere: any = { tenantId };
    const invoiceWhere: any = { tenantId };

    if (range.fromDate || range.toDate) {
      paymentWhere.paidAt = {};
      invoiceWhere.createdAt = {};
      if (range.fromDate) {
        paymentWhere.paidAt.gte = new Date(range.fromDate);
        invoiceWhere.createdAt.gte = new Date(range.fromDate);
      }
      if (range.toDate) {
        paymentWhere.paidAt.lte = new Date(range.toDate);
        invoiceWhere.createdAt.lte = new Date(range.toDate);
      }
    }

    const [payments, invoices, outstanding] = await Promise.all([
      this.db.payment.findMany({
        where: paymentWhere,
        include: { member: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { paidAt: 'desc' },
      }),
      this.db.invoice.findMany({
        where: invoiceWhere,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.invoice.findMany({
        where: { tenantId, status: { not: 'PAID' } },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const statusSummary = payments.reduce<Record<string, { count: number; total: number }>>((summary, item) => {
      const status = item.status;
      const existing = summary[status] ?? { count: 0, total: 0 };
      existing.count += 1;
      existing.total += item.amountCents;
      summary[status] = existing;
      return summary;
    }, {});

    const headers = ['Type', 'Date', 'Member', 'Reference', 'Amount', 'Status'];
    const paymentRows = payments.map((payment) => [
      'Payment',
      payment.paidAt?.toISOString() ?? payment.createdAt.toISOString(),
      payment.member ? `${payment.member.firstName} ${payment.member.lastName}` : 'Guest',
      payment.id,
      this.formatCurrency(payment.amountCents),
      payment.status,
    ]);
    const invoiceRows = invoices.map((invoice) => [
      'Invoice',
      invoice.createdAt.toISOString(),
      invoice.memberId ? `${invoice.memberId}` : 'Guest',
      invoice.invoiceNumber,
      this.formatCurrency(invoice.totalCents),
      invoice.status,
    ]);

    const summaryLines = Object.entries(statusSummary).map(([status, item]) => `${status}: ${item.count} transactions / ${this.formatCurrency(item.total)}`);
    const outstandingRows = outstanding.map((invoice) => [
      invoice.invoiceNumber,
      invoice.status,
      invoice.dueDate?.toISOString() ?? '',
      this.formatCurrency(invoice.totalCents),
    ]);

    if (format === ReportFormat.PDF) {
      const document = (
        <Document>
          <Page size="A4" style={styles.page} wrap>
            <Text style={styles.header}>Financial Report</Text>
            <View style={styles.section}>
              <Text style={styles.subheader}>Summary</Text>
              {summaryLines.map((line, index) => (
                <Text key={index} style={styles.text}>{line}</Text>
              ))}
            </View>
            <View style={styles.section}>
              <Text style={styles.subheader}>Outstanding Invoices</Text>
              {outstandingRows.slice(0, 20).map((row, index) => (
                <View key={index} style={styles.row}>
                  <Text style={styles.cell}>{row[0]}</Text>
                  <Text style={styles.cell}>{row[1]}</Text>
                  <Text style={styles.cell}>{row[3]}</Text>
                </View>
              ))}
            </View>
          </Page>
        </Document>
      );
      return pdf(document).toBuffer() as unknown as Promise<Buffer>;
    }

    if (format === ReportFormat.XLSX) {
      const workbook = new Workbook();
      const sheet = workbook.addWorksheet('Financial');
      sheet.addRow(headers);
      paymentRows.forEach((row) => sheet.addRow(row));
      invoiceRows.forEach((row) => sheet.addRow(row));
      sheet.columns?.forEach((column: any) => {
        column.width = Math.max(15, String(column.header).length + 4);
      });
      return workbook.xlsx.writeBuffer();
    }

    return this.buildCsv(headers, [...paymentRows, ...invoiceRows]);
  }

  async generateClubReport(tenantId: string, format: ReportFormat) {
    const [clubs, membershipCounts, eventCounts] = await Promise.all([
      this.db.club.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } }),
      this.db.clubMembership.groupBy({ where: { tenantId }, by: ['clubId'], _count: { id: true } }),
      this.db.clubEvent.groupBy({ where: { tenantId }, by: ['clubId'], _count: { id: true } }),
    ]);

    const memberships = new Map(membershipCounts.map((item) => [item.clubId, item._count.id]));
    const events = new Map(eventCounts.map((item) => [item.clubId, item._count.id]));

    const headers = ['Club ID', 'Name', 'Members', 'Active Events'];
    const rows = clubs.map((club) => [
      club.id,
      club.name,
      String(memberships.get(club.id) ?? 0),
      String(events.get(club.id) ?? 0),
    ]);

    if (format === ReportFormat.PDF) {
      const document = (
        <Document>
          <Page size="A4" style={styles.page} wrap>
            <Text style={styles.header}>Club Activity Report</Text>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                <Text style={styles.cell}>{row[1]}</Text>
                <Text style={styles.cell}>{row[2]}</Text>
                <Text style={styles.cell}>{row[3]}</Text>
              </View>
            ))}
          </Page>
        </Document>
      );
      return pdf(document).toBuffer() as unknown as Promise<Buffer>;
    }

    if (format === ReportFormat.XLSX) {
      const workbook = new Workbook();
      const sheet = workbook.addWorksheet('Clubs');
      sheet.addRow(headers);
      rows.forEach((row) => sheet.addRow(row));
      sheet.columns?.forEach((column: any) => {
        column.width = Math.max(15, String(column.header).length + 4);
      });
      return workbook.xlsx.writeBuffer();
    }

    return this.buildCsv(headers, rows);
  }

  async generateMemberCertificate(tenantId: string, memberId: string) {
    const member = await this.db.member.findFirst({
      where: { id: memberId, tenantId },
      include: {
        membershipSubscriptions: { include: { tier: true }, where: { status: 'ACTIVE' } },
      },
    });

    if (!member) {
      throw new BadRequestException('Member not found for certificate generation.');
    }

    const tier = member.membershipSubscriptions.sort((a, b) => {
      if (!a.endsAt) return -1;
      if (!b.endsAt) return 1;
      return b.endsAt.getTime() - a.endsAt.getTime();
    })[0];

    const qrCode = await this.createQrDataUrl(`member:${memberId}:${tenantId}`);
    const document = (
      <MembershipCertificateDocument
        member={member}
        tier={tier?.tier?.name ?? 'Member'}
        expiry={tier?.endsAt ?? null}
        qrCode={qrCode}
      />
    );

    return pdf(document).toBuffer() as unknown as Promise<Buffer>;
  }

  async generateVolunteerCertificate(tenantId: string, memberId: string) {
    const member = await this.db.member.findFirst({ where: { id: memberId, tenantId } });
    if (!member) {
      throw new BadRequestException('Member not found for volunteer certificate.');
    }

    const approvedHours = await this.db.volunteerHours.aggregate({
      where: { tenantId, memberId, isApproved: true },
      _sum: { hours: true },
    });

    const totalHours = Math.round((approvedHours._sum.hours ?? 0) * 100) / 100;
    const qrCode = await this.createQrDataUrl(`volunteer:${memberId}:${tenantId}`);
    const document = (
      <VolunteerCertificateDocument
        member={member}
        totalHours={totalHours}
        qrCode={qrCode}
      />
    );

    return pdf(document).toBuffer() as unknown as Promise<Buffer>;
  }

  downloadImportTemplate(type: string): string {
    const templates: Record<string, { headers: string[]; example: string[] }> = {
      members: {
        headers: [
          'email',
          'firstName',
          'lastName',
          'phone',
          'address',
          'city',
          'state',
          'postalCode',
          'countryCode',
          'status',
          'joinedAt',
          'tierSlug',
          'custom:favoriteColor',
        ],
        example: [
          'jane.doe@example.com',
          'Jane',
          'Doe',
          '555-1234',
          '123 Main St',
          'Austin',
          'TX',
          '78701',
          'US',
          'ACTIVE',
          '2026-04-01',
          'gold',
          'Purple',
        ],
      },
      events: {
        headers: [
          'title',
          'slug',
          'description',
          'startsAt',
          'endsAt',
          'status',
          'location',
          'format',
          'isPublic',
          'capacity',
        ],
        example: [
          'Spring Fundraiser',
          'spring-fundraiser',
          'A fundraiser gala event',
          '2026-06-15T18:00:00.000Z',
          '2026-06-15T21:00:00.000Z',
          'PUBLISHED',
          'Community Center',
          'IN_PERSON',
          'true',
          '150',
        ],
      },
      volunteers: {
        headers: ['memberEmail', 'opportunityTitle', 'hours', 'date', 'status', 'description'],
        example: ['jane.doe@example.com', 'Food bank shift', '3', '2026-04-08', 'APPROVED', 'Assisted with food packing'],
      },
      financial: {
        headers: ['type', 'memberEmail', 'amountCents', 'description', 'date', 'status'],
        example: ['payment', 'jane.doe@example.com', '1200', 'Membership fee', '2026-04-01', 'SUCCEEDED'],
      },
      clubs: {
        headers: ['name', 'slug', 'description', 'visibility', 'isActive'],
        example: ['Neighborhood Connect', 'neighborhood-connect', 'Local meetup group', 'PUBLIC', 'true'],
      },
    };

    const template = templates[type];
    if (!template) {
      throw new BadRequestException('Unsupported template type.');
    }

    return this.buildCsv(template.headers, [template.example]);
  }

  parseAndValidateCsv(fileContents: string, mapping: Record<string, string> = {}) {
    const parsed = Papa.parse<Record<string, string>>(fileContents, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length) {
      return {
        valid: false,
        errors: parsed.errors.map((error: Papa.ParseError) => ({ row: error.row, message: error.message })),
        rows: [],
      };
    }

    const rows = parsed.data.map((row: Record<string, string>) => {
      const normalized: Record<string, string> = {};
      for (const [column, value] of Object.entries(row)) {
        const key = mapping[column] ?? column;
        normalized[key] = value ?? '';
      }
      return normalized;
    });

    const errors: Array<{ row: number; message: string }> = [];
    rows.forEach((row: Record<string, string>, index: number) => {
      if (!row.email) {
        errors.push({ row: index + 2, message: 'email is required' });
      }
    });

    return { valid: errors.length === 0, errors, rows };
  }

  async importMembers(tenantId: string, rows: Record<string, unknown>[], options?: ImportOptionsDto) {
    const results = { imported: 0, skipped: 0, errors: [] as string[] };
    for (const row of rows) {
      const email = String(row.email ?? '').trim();
      if (!email) {
        results.errors.push('Missing email on row.');
        continue;
      }

      const existing = await this.db.member.findFirst({ where: { tenantId, email } });
      if (existing && options?.duplicateStrategy === 'skip') {
        results.skipped += 1;
        continue;
      }

      const memberData: any = {
        tenantId,
        email,
        firstName: String(row.firstName ?? '').trim() || 'Member',
        lastName: String(row.lastName ?? '').trim() || 'Imported',
        phone: String(row.phone ?? '').trim() || null,
        address: String(row.address ?? '').trim() || null,
        city: String(row.city ?? '').trim() || null,
        state: String(row.state ?? '').trim() || null,
        postalCode: String(row.postalCode ?? '').trim() || null,
        countryCode: String(row.countryCode ?? 'US').trim(),
        status: String(row.status ?? 'ACTIVE') as any,
        joinedAt: row.joinedAt ? new Date(String(row.joinedAt)) : new Date(),
      };

      const operation = existing
        ? this.db.member.update({ where: { id: existing.id }, data: memberData })
        : this.db.member.create({ data: memberData });

      const member = await operation;
      results.imported += 1;

      const customFieldUpdates = Object.entries(row)
        .filter(([key]) => key.startsWith('custom:'))
        .map(([key, value]) => ({ fieldSlug: key.replace('custom:', ''), value: String(value ?? '') }));

      for (const item of customFieldUpdates) {
        const field = await this.db.memberCustomField.findFirst({ where: { tenantId, slug: item.fieldSlug } });
        if (!field) continue;
        await this.db.memberCustomFieldValue.upsert({
          where: { memberId_fieldId: { memberId: member.id, fieldId: field.id } },
          create: { memberId: member.id, fieldId: field.id, value: item.value },
          update: { value: item.value },
        });
      }
    }

    return results;
  }

  async importEvents(tenantId: string, rows: Record<string, unknown>[]) {
    const results = { imported: 0, skipped: 0, errors: [] as string[] };
    for (const row of rows) {
      const title = String(row.title ?? '').trim();
      const slug = String(row.slug ?? '').trim();
      if (!title || !slug) {
        results.errors.push('Missing title or slug.');
        continue;
      }

      const existing = await this.db.event.findFirst({ where: { tenantId, slug } });
      if (existing) {
        results.skipped += 1;
        continue;
      }

      const category = row.categorySlug
        ? await this.db.eventCategory.findFirst({ where: { tenantId, slug: String(row.categorySlug).trim() } })
        : null;

      await this.db.event.create({
        data: {
          tenantId,
          title,
          slug,
          description: String(row.description ?? '').trim() || null,
          startsAt: row.startsAt ? new Date(String(row.startsAt)) : new Date(),
          endsAt: row.endsAt ? new Date(String(row.endsAt)) : null,
          status: (String(row.status ?? 'DRAFT') as any) || 'DRAFT',
          location: String(row.location ?? '').trim() || null,
          format: (String(row.format ?? 'IN_PERSON') as any) || 'IN_PERSON',
          isPublic: String(row.isPublic ?? 'true').toLowerCase() === 'true',
          capacity: row.capacity ? Number(row.capacity) : null,
          categoryId: category?.id ?? null,
        },
      });
      results.imported += 1;
    }

    return results;
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 20,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  subheader: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  tableRow: {
    flexDirection: 'row',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  cell: {
    width: '25%',
    fontSize: 9,
    marginRight: 8,
  },
  text: {
    marginBottom: 4,
  },
});
