/**
 * LeadFast AI - Lightweight Form Ingestion Script
 * Integrates into any website builder (Wix, Squarespace, Webflow, Custom HTML, etc.)
 * Intercepts submissions, extracts contact info heuristically, and sends to LeadFast AI API.
 */ 
(function () {
    // Prevent double initialization
    if (window.__LeadFastInitialized) return;
    window.__LeadFastInitialized = true;

    // 1. Get Configuration
    const currentScript = document.currentScript;
    const config = {
        businessId: currentScript ? currentScript.getAttribute('data-business-id') : null,
        apiUrl: (currentScript && currentScript.getAttribute('data-api-url')) || 'https://api.leadfast.ai/v1/leads',
        timeout: parseInt((currentScript && currentScript.getAttribute('data-timeout')) || '3000', 10),
        silentMode: currentScript ? currentScript.getAttribute('data-silent') === 'true' : false,
        successMessage: (currentScript && currentScript.getAttribute('data-success-message')) || 'Thank you! We will get back to you within 30 seconds.',
        themeColor: (currentScript && currentScript.getAttribute('data-theme-color')) || '#00b4d8'
    };

    // If global LeadFastConfig is defined, merge it
    if (window.LeadFastConfig) {
        Object.assign(config, window.LeadFastConfig);
    }

    if (!config.businessId) {
        console.warn('[LeadFast AI] Missing data-business-id attribute on the script tag. Ingestion may fail.');
    }

    // 2. Add Styles for Premium UI Feedback (Loading & Toasts)
    const style = document.createElement('style');
    style.textContent = `
        .lf-spinner-container {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            position: relative;
            vertical-align: middle;
        }
        .lf-spinner {
            width: 1.2em;
            height: 1.2em;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #ffffff;
            animation: lf-spin 0.6s linear infinite;
            margin-right: 8px;
        }
        @keyframes lf-spin {
            to { transform: rotate(360deg); }
        }
        .lf-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(18, 24, 38, 0.95);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            color: #ffffff;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.08);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            z-index: 999999;
            display: flex;
            align-items: center;
            gap: 12px;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .lf-toast.lf-show {
            transform: translateY(0);
            opacity: 1;
        }
        .lf-toast-success-icon {
            color: #10b981;
            font-weight: bold;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            background: rgba(16, 185, 129, 0.15);
            border-radius: 50%;
        }
    `;
    document.head.appendChild(style);

    // 3. UI Helpers
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'lf-toast';
        toast.innerHTML = `
            <div class="lf-toast-success-icon">✓</div>
            <div>${message}</div>
        `;
        document.body.appendChild(toast);

        // Force reflow
        toast.offsetHeight;
        toast.classList.add('lf-show');

        setTimeout(() => {
            toast.classList.remove('lf-show');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // 4. Heuristic Field Extraction
    function extractFormPayload(form) {
        const elements = form.querySelectorAll('input, textarea, select');
        let firstName = '';
        let lastName = '';
        let fullName = '';
        let email = '';
        let phone = '';
        const messages = [];

        // Match patterns (case-insensitive)
        const emailRegex = /email|mail/i;
        const phoneRegex = /phone|tel|mobile|contact|number/i;
        const firstNameRegex = /first.*name|fname|given.*name/i;
        const lastNameRegex = /last.*name|lname|sur.*name|family.*name/i;
        const fullNameRegex = /full.*name|name|recipient/i;
        const messageRegex = /message|msg|comment|desc|description|note|problem|issue|detail/i;

        elements.forEach(el => {
            const name = el.name || '';
            const id = el.id || '';
            const placeholder = el.placeholder || '';
            const type = el.type || '';
            const labelText = getLabelText(el);

            // Combine identifiers to match
            const matchString = `${name} ${id} ${placeholder} ${type} ${labelText}`.toLowerCase();
            const value = el.value ? el.value.trim() : '';

            if (!value) return;

            // 1. Email matching
            if (type === 'email' || emailRegex.test(matchString)) {
                if (!email) email = value;
            }
            // 2. Phone matching
            else if (type === 'tel' || phoneRegex.test(matchString)) {
                if (!phone) phone = value;
            }
            // 3. Name matching
            else if (firstNameRegex.test(matchString)) {
                if (!firstName) firstName = value;
            } else if (lastNameRegex.test(matchString)) {
                if (!lastName) lastName = value;
            } else if (fullNameRegex.test(matchString)) {
                if (!fullName) fullName = value;
            }
            // 4. Message / Content matching
            else if (el.tagName.toLowerCase() === 'textarea' || messageRegex.test(matchString)) {
                messages.push(`${labelText ? labelText + ': ' : ''}${value}`);
            }
            // Fallback: if it's a textarea and hasn't been matched yet, treat it as message
            else if (el.tagName.toLowerCase() === 'textarea') {
                messages.push(value);
            }
        });

        // Resolve Name
        let lead_name = fullName;
        if (!lead_name) {
            lead_name = [firstName, lastName].filter(Boolean).join(' ');
        }
        if (!lead_name) {
            lead_name = 'Anonymous Lead'; // Fallback
        }

        // Construct Message
        const message = messages.length > 0 ? messages.join('\n') : '';

        return {
            business_id: config.businessId,
            lead_name,
            lead_email: email || null,
            lead_phone: phone || null,
            message
        };
    }

    // Helper to get label text associated with an element
    function getLabelText(el) {
        if (!el.id) return '';
        // Look for <label for="id">
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label) return label.innerText;
        // Look for parent label
        const parentLabel = el.closest('label');
        if (parentLabel) {
            // Get text content, excluding input value
            return parentLabel.innerText.replace(el.value || '', '').trim();
        }
        return '';
    }

    // 5. Intercept submit events using global listener
    document.addEventListener('submit', function (event) {
        const form = event.target;

        // Skip check if the form is marked to be ignored or if it is our internal resubmit
        if (form.getAttribute('data-lf-ignore') === 'true' || form.__lfSubmitting) {
            return;
        }

        // Extract values
        const payload = extractFormPayload(form);

        // Heuristic to verify if it's a contact form (must have at least name, email, phone, or message)
        const hasContactFields = payload.lead_email || payload.lead_phone || payload.message;
        if (!hasContactFields) {
            return; // Not a contact/lead form, let it submit normally
        }

        console.log('[LeadFast AI] Intercepted lead submission:', payload);

        // Intercept form submission
        event.preventDefault();
        event.stopImmediatePropagation();

        // Visual feedback on the submit button
        const submitBtn = form.querySelector('[type="submit"], button:not([type="button"]):not([type="reset"])');
        let originalBtnHTML = '';
        if (submitBtn) {
            originalBtnHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="lf-spinner-container"><span class="lf-spinner"></span>Sending...</span>`;
        }

        // Helper to complete the interception process and resume
        let resolved = false;
        function finish(success = false) {
            if (resolved) return;
            resolved = true;

            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHTML;
            }

            if (success && !config.silentMode) {
                showToast(config.successMessage);
            }

            // Mark the form so the next submit doesn't trigger the interceptor again
            form.__lfSubmitting = true;

            // If the script is configured to act as a silent collector and pass control back
            // to the original handler (like Wix, Squarespace or default action), submit it.
            // Calling form.submit() bypasses event handlers, allowing natural submission.
            setTimeout(() => {
                try {
                    form.submit();
                } catch (e) {
                    // Fallback in case submit() is overridden by form elements named "submit"
                    HTMLFormElement.prototype.submit.call(form);
                }
            }, config.silentMode ? 0 : 1500); // Give user time to see success message unless silent
        }

        // Create AbortController to support timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn('[LeadFast AI] Request timed out. Resuming default form action.');
            controller.abort();
            finish(false);
        }, config.timeout);

        // POST Data to Backend API
        fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload),
            keepalive: true, // Crucial for forms that perform page unload/redirect immediately
            signal: controller.signal
        })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`Server returned status ${response.status}`);
                }
                return response.json().catch(() => ({}));
            })
            .then(data => {
                console.log('[LeadFast AI] Ingested lead successfully:', data);
                finish(true);
            })
            .catch(err => {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') return; // Handled in timeout
                console.error('[LeadFast AI] Error sending lead data:', err);
                finish(false); // Fallback to natural form submission to avoid losing the lead
            });

    }, true); // Use capture phase to catch submission before other scripts potentially stop it
})();
