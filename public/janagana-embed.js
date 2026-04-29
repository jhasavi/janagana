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

    // Events Widget
    events: function(containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('[JanaGana] Container not found:', containerId);
        return;
      }

      const widget = document.createElement('div');
      widget.className = 'janagana-events-widget';
      widget.innerHTML = `
        <style>
          .janagana-events-widget {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .janagana-events-widget h3 {
            margin: 0 0 15px 0;
            font-size: 18px;
            color: #333;
          }
          .janagana-events-widget .event-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            background: white;
          }
          .janagana-events-widget .event-title {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 5px;
            color: #111;
          }
          .janagana-events-widget .event-date {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
          }
          .janagana-events-widget .event-location {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
          }
          .janagana-events-widget .event-price {
            font-weight: 600;
            color: #4F46E5;
            margin-bottom: 10px;
          }
          .janagana-events-widget .register-btn {
            padding: 8px 16px;
            background: #4F46E5;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .janagana-events-widget .register-btn:hover {
            background: #4338ca;
          }
          .janagana-events-widget .loading {
            text-align: center;
            padding: 20px;
            color: #666;
          }
          .janagana-events-widget .no-events {
            text-align: center;
            padding: 20px;
            color: #666;
          }
        </style>
        <h3>${options.title || 'Upcoming Events'}</h3>
        <div id="janagana-events-list" class="loading">Loading events...</div>
      `;

      container.appendChild(widget);

      this.loadEvents(widget);
    },

    loadEvents: async function(widget) {
      const eventsList = widget.querySelector('#janagana-events-list');

      try {
        const response = await fetch(`${this.config.apiUrl}/api/embed/events?tenantSlug=${this.config.tenantSlug}`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
          eventsList.innerHTML = result.data.map(event => `
            <div class="event-card">
              <div class="event-title">${event.title}</div>
              <div class="event-date">${new Date(event.startDate).toLocaleDateString()}</div>
              ${event.location ? `<div class="event-location">${event.location}</div>` : ''}
              ${event.priceCents > 0 ? `<div class="event-price">$${(event.priceCents / 100).toFixed(2)}</div>` : ''}
              <button class="register-btn" onclick="window.open('${this.config.apiUrl}/portal/${this.config.tenantSlug}/events', '_blank')">
                Register
              </button>
            </div>
          `).join('');
        } else {
          eventsList.innerHTML = '<div class="no-events">No upcoming events</div>';
        }
      } catch (error) {
        this.log('Events error:', error);
        eventsList.innerHTML = '<div class="no-events">Failed to load events</div>';
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
