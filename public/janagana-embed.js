/**
 * JanaGana Embed SDK
 * Add this script to any website to embed JanaGana features
 *
 * Usage:
 * <script src="https://janagana.namasteneedham.com/janagana-embed.js"></script>
 * <script>
 *   Janagana.init({
 *     tenantSlug: 'your-org-slug',
 *     apiUrl: 'https://janagana.namasteneedham.com'
 *   });
 * </script>
 */

(function(window) {
  'use strict';

  const Janagana = {
    config: {
      tenantSlug: null,
      apiUrl: 'https://janagana.namasteneedham.com',
      debug: false
    },

    init: function(options) {
      if (options.tenantSlug) {
        this.config.tenantSlug = options.tenantSlug;
      }
      if (options.apiUrl) {
        this.config.apiUrl = options.apiUrl;
      }
      if (options.debug) {
        this.config.debug = options.debug;
      }

      this.log('JanaGana initialized', this.config);
    },

    log: function(...args) {
      if (this.config.debug) {
        console.log('[JanaGana]', ...args);
      }
    },

    // Newsletter Signup Widget
    newsletter: function(containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('[JanaGana] Container not found:', containerId);
        return;
      }

      const widget = document.createElement('div');
      widget.className = 'janagana-newsletter-widget';
      widget.innerHTML = `
        <style>
          .janagana-newsletter-widget {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 400px;
            margin: 0 auto;
          }
          .janagana-newsletter-widget h3 {
            margin: 0 0 10px 0;
            font-size: 18px;
            color: #333;
          }
          .janagana-newsletter-widget p {
            margin: 0 0 15px 0;
            font-size: 14px;
            color: #666;
          }
          .janagana-newsletter-widget input {
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
          }
          .janagana-newsletter-widget button {
            width: 100%;
            padding: 10px;
            background: #4F46E5;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          }
          .janagana-newsletter-widget button:hover {
            background: #4338ca;
          }
          .janagana-newsletter-widget button:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          .janagana-newsletter-widget .success {
            color: #10b981;
            font-size: 14px;
            margin-top: 10px;
          }
          .janagana-newsletter-widget .error {
            color: #ef4444;
            font-size: 14px;
            margin-top: 10px;
          }
        </style>
        <h3>${options.title || 'Subscribe to our newsletter'}</h3>
        <p>${options.description || 'Get updates delivered to your inbox'}</p>
        <input type="text" id="janagana-newsletter-name" placeholder="Your name" />
        <input type="email" id="janagana-newsletter-email" placeholder="Your email" required />
        <button id="janagana-newsletter-submit">Subscribe</button>
        <div id="janagana-newsletter-message"></div>
      `;

      container.appendChild(widget);

      const submitBtn = widget.querySelector('#janagana-newsletter-submit');
      const emailInput = widget.querySelector('#janagana-newsletter-email');
      const nameInput = widget.querySelector('#janagana-newsletter-name');
      const messageDiv = widget.querySelector('#janagana-newsletter-message');

      submitBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const name = nameInput.value.trim();

        if (!email) {
          messageDiv.innerHTML = '<div class="error">Please enter your email</div>';
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Subscribing...';

        try {
          const response = await fetch(`${this.config.apiUrl}/api/embed/newsletter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantSlug: this.config.tenantSlug,
              email,
              firstName: name.split(' ')[0] || '',
              lastName: name.split(' ').slice(1).join(' ') || ''
            })
          });

          const result = await response.json();

          if (result.success) {
            messageDiv.innerHTML = '<div class="success">Successfully subscribed!</div>';
            emailInput.value = '';
            nameInput.value = '';
          } else {
            messageDiv.innerHTML = `<div class="error">${result.error || 'Subscription failed'}</div>`;
          }
        } catch (error) {
          this.log('Newsletter error:', error);
          messageDiv.innerHTML = '<div class="error">Something went wrong. Please try again.</div>';
        }

        submitBtn.disabled = false;
        submitBtn.textContent = 'Subscribe';
      });
    },

    escapeHtml: function(value) {
      if (value === null || value === undefined) return '';
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    safeUrl: function(url, fallbackUrl) {
      if (!url || typeof url !== 'string') return fallbackUrl;

      if (url.startsWith('/')) {
        return `${this.config.apiUrl}${url}`;
      }

      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return parsed.toString();
        }
      } catch (error) {
        this.log('Invalid URL provided:', url, error);
      }

      return fallbackUrl;
    },

    emitEventAction: function(widget, options, action, event, metadata = {}) {
      const payload = {
        action,
        tenantSlug: this.config.tenantSlug,
        containerId: widget && widget.getAttribute ? widget.getAttribute('data-container-id') : null,
        timestamp: new Date().toISOString(),
        event: event ? {
          id: event.id || null,
          title: event.title || null,
          startDate: event.startDate || null,
          endDate: event.endDate || null,
          location: event.location || null,
          detailsUrl: event.detailsUrl || null,
        } : null,
        metadata,
      };

      if (typeof options.onEventAction === 'function') {
        try {
          options.onEventAction(payload);
        } catch (error) {
          this.log('onEventAction callback failed:', error);
        }
      }

      try {
        window.dispatchEvent(new CustomEvent('janagana:event-action', { detail: payload }));
      } catch (error) {
        this.log('Failed to dispatch janagana:event-action:', error);
      }
    },

    getDefaultEventEndDate: function(startDate, endDate, fallbackMinutes = 60) {
      const start = new Date(startDate);
      const parsedEnd = endDate ? new Date(endDate) : null;

      if (parsedEnd && !Number.isNaN(parsedEnd.getTime()) && parsedEnd > start) {
        return parsedEnd;
      }

      return new Date(start.getTime() + fallbackMinutes * 60 * 1000);
    },

    toCalendarUtcTimestamp: function(date) {
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(date.getUTCDate()).padStart(2, '0');
      const hh = String(date.getUTCHours()).padStart(2, '0');
      const min = String(date.getUTCMinutes()).padStart(2, '0');
      const ss = String(date.getUTCSeconds()).padStart(2, '0');
      return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
    },

    escapeIcsText: function(value) {
      return String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
    },

    buildGoogleCalendarUrl: function(event, detailsUrl) {
      const start = new Date(event.startDate);
      const end = this.getDefaultEventEndDate(event.startDate, event.endDate, 60);
      const descriptionParts = [event.description || '', detailsUrl].filter(Boolean);
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title || 'Event',
        dates: `${this.toCalendarUtcTimestamp(start)}/${this.toCalendarUtcTimestamp(end)}`,
        details: descriptionParts.join('\n\n'),
        location: event.location || event.virtualLink || '',
      });
      return `https://calendar.google.com/calendar/render?${params.toString()}`;
    },

    buildIcsContent: function(event, detailsUrl) {
      const start = new Date(event.startDate);
      const end = this.getDefaultEventEndDate(event.startDate, event.endDate, 60);
      const now = new Date();
      const descriptionParts = [event.description || '', detailsUrl].filter(Boolean);
      const description = descriptionParts.join('\n\n');

      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//JanaGana//Events Embed//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${this.escapeIcsText(`${event.id || event.title}-${start.getTime()}@janagana`)}`,
        `DTSTAMP:${this.toCalendarUtcTimestamp(now)}`,
        `DTSTART:${this.toCalendarUtcTimestamp(start)}`,
        `DTEND:${this.toCalendarUtcTimestamp(end)}`,
        `SUMMARY:${this.escapeIcsText(event.title || 'Event')}`,
        `DESCRIPTION:${this.escapeIcsText(description)}`,
        `LOCATION:${this.escapeIcsText(event.location || event.virtualLink || '')}`,
        'END:VEVENT',
        'END:VCALENDAR',
        '',
      ].join('\r\n');
    },

    downloadEventIcs: function(event, detailsUrl) {
      const content = this.buildIcsContent(event, detailsUrl);
      const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      const slug = (event.title || 'event')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'event';

      link.href = URL.createObjectURL(blob);
      link.download = `${slug}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },

    formatEventDate: function(startDate, endDate) {
      const start = new Date(startDate);
      const parsedEnd = endDate ? new Date(endDate) : null;
      const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
      const timeOptions = { hour: 'numeric', minute: '2-digit' };

      const startDateText = start.toLocaleDateString(undefined, dateOptions);
      const startTimeText = start.toLocaleTimeString(undefined, timeOptions);

      if (parsedEnd && !Number.isNaN(parsedEnd.getTime())) {
        const endDateText = parsedEnd.toLocaleDateString(undefined, dateOptions);
        const endTimeText = parsedEnd.toLocaleTimeString(undefined, timeOptions);
        if (startDateText === endDateText) {
          return `${startDateText}, ${startTimeText} - ${endTimeText}`;
        }
        return `${startDateText}, ${startTimeText} - ${endDateText}, ${endTimeText}`;
      }

      return `${startDateText}, ${startTimeText}`;
    },

    resolveEventDetailsUrl: function(event, fallbackPortalUrl) {
      return this.safeUrl(event.detailsUrl || event.virtualLink, fallbackPortalUrl);
    },

    getEventRegisterUrl: function(event, fallbackPortalUrl) {
      return this.safeUrl(event.registrationUrl || event.portalUrl, fallbackPortalUrl);
    },

    renderEventsList: function(widget, eventsList, events, options) {
      const fallbackPortalUrl = `${this.config.apiUrl}/portal/${this.config.tenantSlug}/events`;

      if (!events.length) {
        eventsList.innerHTML = `
          <div class="janagana-events-state-card" role="status" aria-live="polite">
            <div class="janagana-events-state-title">No upcoming events</div>
            <p>${this.escapeHtml(options.emptyStateText)}</p>
          </div>
        `;
        return;
      }

      eventsList.innerHTML = events.map((event, index) => {
        const detailsUrl = this.resolveEventDetailsUrl(event, fallbackPortalUrl);
        const registerUrl = this.getEventRegisterUrl(event, fallbackPortalUrl);
        const googleCalendarUrl = this.buildGoogleCalendarUrl(event, detailsUrl);
        const hasLocation = Boolean(event.location && String(event.location).trim());
        const locationLabel = hasLocation
          ? this.escapeHtml(event.location)
          : ((event.isVirtual || event.virtualLink) ? 'Virtual event' : 'Location to be announced');
        const isFree = Number(event.priceCents || 0) <= 0;

        return `
          <article class="janagana-event-card" data-event-index="${index}">
            <div class="janagana-event-content">
              <div class="janagana-event-top-row">
                <h4 class="janagana-event-title">${this.escapeHtml(event.title || 'Untitled Event')}</h4>
                <span class="janagana-event-price-badge ${isFree ? 'is-free' : 'is-paid'}">${isFree ? 'Free' : `$${(Number(event.priceCents || 0) / 100).toFixed(2)}`}</span>
              </div>
              <p class="janagana-event-meta"><strong>Date:</strong> ${this.escapeHtml(this.formatEventDate(event.startDate, event.endDate))}</p>
              <p class="janagana-event-meta"><strong>Location:</strong> ${locationLabel}</p>
            </div>
            <div class="janagana-event-actions">
              <a class="janagana-btn janagana-btn-primary" href="${this.escapeHtml(registerUrl)}" target="_blank" rel="noopener noreferrer">Register</a>
              ${options.showDetails ? `<a class="janagana-btn janagana-btn-secondary" href="${this.escapeHtml(detailsUrl)}" target="_blank" rel="noopener noreferrer">Details</a>` : ''}
              ${options.showCalendar ? `
                <details class="janagana-calendar-menu">
                  <summary class="janagana-btn janagana-btn-secondary">Add to Calendar</summary>
                  <div class="janagana-calendar-menu-items">
                    <a href="${this.escapeHtml(googleCalendarUrl)}" target="_blank" rel="noopener noreferrer" data-event-index="${index}" class="janagana-calendar-google">Google Calendar</a>
                    <button type="button" class="janagana-calendar-ics" data-event-index="${index}">Download ICS</button>
                  </div>
                </details>
              ` : ''}
            </div>
          </article>
        `;
      }).join('');

      const registerLinks = eventsList.querySelectorAll('.janagana-btn-primary');
      registerLinks.forEach((link) => {
        link.addEventListener('click', () => {
          const parent = link.closest('.janagana-event-card');
          const idx = Number.parseInt(parent ? parent.getAttribute('data-event-index') : '-1', 10);
          if (idx >= 0 && idx < events.length) {
            this.emitEventAction(widget, options, 'register_click', events[idx]);
          }
        });
      });

      const detailsLinks = eventsList.querySelectorAll('.janagana-btn-secondary[href]');
      detailsLinks.forEach((link) => {
        if (link.textContent && link.textContent.trim() === 'Details') {
          link.addEventListener('click', () => {
            const parent = link.closest('.janagana-event-card');
            const idx = Number.parseInt(parent ? parent.getAttribute('data-event-index') : '-1', 10);
            if (idx >= 0 && idx < events.length) {
              this.emitEventAction(widget, options, 'details_click', events[idx]);
            }
          });
        }
      });

      const googleLinks = eventsList.querySelectorAll('.janagana-calendar-google');
      googleLinks.forEach((link) => {
        link.addEventListener('click', () => {
          const idx = Number.parseInt(link.getAttribute('data-event-index') || '-1', 10);
          if (idx >= 0 && idx < events.length) {
            this.emitEventAction(widget, options, 'calendar_google_click', events[idx]);
          }
        });
      });

      const downloadButtons = eventsList.querySelectorAll('.janagana-calendar-ics');
      downloadButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const idx = Number.parseInt(button.getAttribute('data-event-index') || '-1', 10);
          if (idx >= 0 && idx < events.length) {
            const event = events[idx];
            const detailsUrl = this.resolveEventDetailsUrl(event, fallbackPortalUrl);
            this.downloadEventIcs(event, detailsUrl);
            this.emitEventAction(widget, options, 'calendar_ics_download', event);
          }
        });
      });
    },

    // Events Widget
    events: function(containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('[JanaGana] Container not found:', containerId);
        return;
      }

      const mergedOptions = {
        title: options.title || 'Upcoming Events',
        showDetails: options.showDetails !== false,
        showCalendar: options.showCalendar !== false,
        maxItems: Number.isFinite(options.maxItems) ? options.maxItems : null,
        emptyStateText: options.emptyStateText || 'No upcoming events right now. Check back soon.',
      };

      const widget = document.createElement('div');
      widget.className = 'janagana-events-widget';
      widget.setAttribute('data-container-id', containerId);
      widget.innerHTML = `
        <style>
          .janagana-events-widget {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            color: #111827;
          }
          .janagana-events-widget .janagana-events-header {
            margin: 0 0 14px 0;
            font-size: 22px;
            font-weight: 700;
            line-height: 1.2;
            letter-spacing: -0.01em;
            color: #0f172a;
          }
          .janagana-events-widget .janagana-events-list {
            display: grid;
            gap: 12px;
          }
          .janagana-events-widget .janagana-event-card {
            border: 1px solid #dbe3ef;
            border-radius: 14px;
            background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
            padding: 16px;
            display: flex;
            gap: 14px;
            justify-content: space-between;
          }
          .janagana-events-widget .janagana-event-content {
            min-width: 0;
            flex: 1;
          }
          .janagana-events-widget .janagana-event-top-row {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
          }
          .janagana-events-widget .janagana-event-title {
            margin: 0;
            font-size: 17px;
            line-height: 1.35;
            font-weight: 700;
            color: #0f172a;
          }
          .janagana-events-widget .janagana-event-meta {
            margin: 4px 0;
            font-size: 14px;
            line-height: 1.45;
            color: #334155;
          }
          .janagana-events-widget .janagana-event-price-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 3px 9px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.01em;
          }
          .janagana-events-widget .janagana-event-price-badge.is-free {
            background: #e6ffef;
            color: #065f46;
          }
          .janagana-events-widget .janagana-event-price-badge.is-paid {
            background: #eff6ff;
            color: #1e40af;
          }
          .janagana-events-widget .janagana-event-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            align-items: flex-start;
            gap: 8px;
            min-width: 250px;
          }
          .janagana-events-widget .janagana-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 38px;
            border-radius: 10px;
            padding: 0 12px;
            border: 1px solid transparent;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
          }
          .janagana-events-widget .janagana-btn-primary {
            background: #1d4ed8;
            color: #ffffff;
          }
          .janagana-events-widget .janagana-btn-primary:hover {
            background: #1e40af;
          }
          .janagana-events-widget .janagana-btn-secondary {
            background: #ffffff;
            border-color: #cbd5e1;
            color: #0f172a;
          }
          .janagana-events-widget .janagana-btn-secondary:hover {
            background: #f8fafc;
          }
          .janagana-events-widget .janagana-btn:focus-visible,
          .janagana-events-widget .janagana-calendar-menu summary:focus-visible,
          .janagana-events-widget .janagana-calendar-menu-items a:focus-visible,
          .janagana-events-widget .janagana-calendar-menu-items button:focus-visible,
          .janagana-events-widget .janagana-retry-btn:focus-visible {
            outline: 3px solid #93c5fd;
            outline-offset: 2px;
          }
          .janagana-events-widget .janagana-calendar-menu {
            position: relative;
          }
          .janagana-events-widget .janagana-calendar-menu summary {
            list-style: none;
          }
          .janagana-events-widget .janagana-calendar-menu summary::-webkit-details-marker {
            display: none;
          }
          .janagana-events-widget .janagana-calendar-menu-items {
            position: absolute;
            right: 0;
            top: calc(100% + 6px);
            width: 185px;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            background: #ffffff;
            box-shadow: 0 10px 20px rgba(15, 23, 42, 0.13);
            overflow: hidden;
            z-index: 10;
          }
          .janagana-events-widget .janagana-calendar-menu-items a,
          .janagana-events-widget .janagana-calendar-menu-items button {
            display: block;
            width: 100%;
            border: 0;
            border-bottom: 1px solid #e5e7eb;
            background: #ffffff;
            color: #0f172a;
            text-align: left;
            font-size: 13px;
            font-weight: 600;
            line-height: 1.2;
            padding: 10px 12px;
            text-decoration: none;
            cursor: pointer;
          }
          .janagana-events-widget .janagana-calendar-menu-items button:last-child,
          .janagana-events-widget .janagana-calendar-menu-items a:last-child {
            border-bottom: 0;
          }
          .janagana-events-widget .janagana-calendar-menu-items a:hover,
          .janagana-events-widget .janagana-calendar-menu-items button:hover {
            background: #f8fafc;
          }
          .janagana-events-widget .janagana-events-state-card {
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            background: #f8fafc;
            padding: 16px;
            color: #334155;
          }
          .janagana-events-widget .janagana-events-state-title {
            color: #0f172a;
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .janagana-events-widget .janagana-loading {
            color: #475569;
            font-size: 14px;
          }
          .janagana-events-widget .janagana-retry-btn {
            margin-top: 10px;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            color: #0f172a;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
          }
          .janagana-events-widget .janagana-retry-btn:hover {
            background: #f8fafc;
          }
          @media (max-width: 700px) {
            .janagana-events-widget .janagana-events-header {
              font-size: 20px;
            }
            .janagana-events-widget .janagana-event-card {
              flex-direction: column;
            }
            .janagana-events-widget .janagana-event-actions {
              min-width: 0;
              width: 100%;
              justify-content: flex-start;
            }
            .janagana-events-widget .janagana-calendar-menu-items {
              left: 0;
              right: auto;
            }
          }
        </style>
        <h3 class="janagana-events-header">${this.escapeHtml(mergedOptions.title)}</h3>
        <div id="janagana-events-list" class="janagana-events-list">
          <div class="janagana-events-state-card janagana-loading" role="status" aria-live="polite">Loading events...</div>
        </div>
      `;

      container.appendChild(widget);
      this.loadEvents(widget, mergedOptions);
    },

    loadEvents: async function(widget, options = {}) {
      const eventsList = widget.querySelector('#janagana-events-list');
      if (!eventsList) return;

      if (!this.config.tenantSlug) {
        eventsList.innerHTML = `
          <div class="janagana-events-state-card" role="alert">
            <div class="janagana-events-state-title">Configuration required</div>
            <p>Please call Janagana.init({ tenantSlug: 'your-org-slug', apiUrl: '...' }) before loading events.</p>
          </div>
        `;
        return;
      }

      const query = new URLSearchParams({ tenantSlug: this.config.tenantSlug });
      if (Number.isFinite(options.maxItems) && options.maxItems > 0) {
        query.set('maxItems', String(Math.floor(options.maxItems)));
      }

      try {
        const response = await fetch(`${this.config.apiUrl}/api/embed/events?${query.toString()}`);
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
          this.renderEventsList(widget, eventsList, result.data, options);
          this.emitEventAction(widget, options, 'events_loaded', null, { count: result.data.length });
        } else {
          eventsList.innerHTML = `
            <div class="janagana-events-state-card" role="alert">
              <div class="janagana-events-state-title">Unable to load events</div>
              <p>Please refresh this page and try again.</p>
            </div>
          `;
          this.emitEventAction(widget, options, 'events_load_failed', null, { reason: 'invalid_response' });
        }
      } catch (error) {
        this.log('Events error:', error);
        this.emitEventAction(widget, options, 'events_load_failed', null, { reason: 'network_error' });
        eventsList.innerHTML = `
          <div class="janagana-events-state-card" role="alert">
            <div class="janagana-events-state-title">Could not load events</div>
            <p>Check your connection and try again.</p>
            <button type="button" class="janagana-retry-btn">Retry</button>
          </div>
        `;

        const retryButton = eventsList.querySelector('.janagana-retry-btn');
        if (retryButton) {
          retryButton.addEventListener('click', () => {
            eventsList.innerHTML = '<div class="janagana-events-state-card janagana-loading" role="status" aria-live="polite">Reloading events...</div>';
            this.loadEvents(widget, options);
          });
        }
      }
    },

    // Login Widget
    login: function(containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('[JanaGana] Container not found:', containerId);
        return;
      }

      const widget = document.createElement('div');
      widget.className = 'janagana-login-widget';
      widget.innerHTML = `
        <style>
          .janagana-login-widget {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 350px;
            margin: 0 auto;
          }
          .janagana-login-widget h3 {
            margin: 0 0 15px 0;
            font-size: 18px;
            color: #333;
            text-align: center;
          }
          .janagana-login-widget button {
            width: 100%;
            padding: 12px;
            background: #4F46E5;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .janagana-login-widget button:hover {
            background: #4338ca;
          }
        </style>
        <h3>${options.title || 'Member Login'}</h3>
        <button onclick="window.open('${this.config.apiUrl}/sign-in?redirect_url=${encodeURIComponent(window.location.href)}', '_blank')">
          Sign In
        </button>
      `;

      container.appendChild(widget);
    },

    // Course Enrollment Widget
    course: function(containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('[JanaGana] Container not found:', containerId);
        return;
      }

      const widget = document.createElement('div');
      widget.className = 'janagana-course-widget';
      widget.innerHTML = `
        <style>
          .janagana-course-widget {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 400px;
            margin: 0 auto;
          }
          .janagana-course-widget h3 {
            margin: 0 0 10px 0;
            font-size: 18px;
            color: #333;
          }
          .janagana-course-widget p {
            margin: 0 0 15px 0;
            font-size: 14px;
            color: #666;
          }
          .janagana-course-widget input {
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
          }
          .janagana-course-widget button {
            width: 100%;
            padding: 10px;
            background: #4F46E5;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          }
          .janagana-course-widget button:hover {
            background: #4338ca;
          }
          .janagana-course-widget button:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          .janagana-course-widget .success {
            color: #10b981;
            font-size: 14px;
            margin-top: 10px;
          }
          .janagana-course-widget .error {
            color: #ef4444;
            font-size: 14px;
            margin-top: 10px;
          }
        </style>
        <h3>${options.title || 'Enroll in Course'}</h3>
        <p>${options.description || 'Enter your details to enroll'}</p>
        <input type="text" id="janagana-course-name" placeholder="Your name" />
        <input type="email" id="janagana-course-email" placeholder="Your email" required />
        <button id="janagana-course-submit">Enroll Now</button>
        <div id="janagana-course-message"></div>
      `;

      container.appendChild(widget);

      const submitBtn = widget.querySelector('#janagana-course-submit');
      const emailInput = widget.querySelector('#janagana-course-email');
      const nameInput = widget.querySelector('#janagana-course-name');
      const messageDiv = widget.querySelector('#janagana-course-message');

      submitBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const name = nameInput.value.trim();

        if (!email) {
          messageDiv.innerHTML = '<div class="error">Please enter your email</div>';
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Enrolling...';

        try {
          const response = await fetch(`${this.config.apiUrl}/api/embed/course`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantSlug: this.config.tenantSlug,
              courseId: options.courseId,
              email,
              firstName: name.split(' ')[0] || '',
              lastName: name.split(' ').slice(1).join(' ') || ''
            })
          });

          const result = await response.json();

          if (result.success) {
            messageDiv.innerHTML = '<div class="success">Successfully enrolled!</div>';
            emailInput.value = '';
            nameInput.value = '';
          } else {
            messageDiv.innerHTML = `<div class="error">${result.error || 'Enrollment failed'}</div>`;
          }
        } catch (error) {
          this.log('Course enrollment error:', error);
          messageDiv.innerHTML = '<div class="error">Something went wrong. Please try again.</div>';
        }

        submitBtn.disabled = false;
        submitBtn.textContent = 'Enroll Now';
      });
    }
  };

  // Expose to global scope
  window.Janagana = Janagana;

})(window);
