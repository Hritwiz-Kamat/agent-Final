/**
 * AgentBridge — Action Mapper
 * Scans DOM for interactive elements and generates
 * AI-callable tool definitions for each.
 */

(function () {
  'use strict';

  if (window.__agentBridge_actionMapper) return;

  const ActionMapper = {
    /**
     * Main entry: scan the page and return tool definitions
     */
    mapActions() {
      const tools = [];
      const seen = new Set();

      // Map buttons
      this.mapButtons(tools, seen);

      // Map links (navigation actions)
      this.mapNavigationLinks(tools, seen);

      // Map forms
      this.mapForms(tools, seen);

      // Map inputs, textareas, selects outside forms
      this.mapStandaloneInputs(tools, seen);

      // Map ARIA/JS interactive elements
      this.mapAriaInteractives(tools, seen);

      return tools;
    },

    /**
     * Map all button elements to click tools
     */
    mapButtons(tools, seen) {
      const buttons = document.querySelectorAll(
        'button, [type="button"], [type="submit"], [type="reset"]'
      );

      buttons.forEach(el => {
        if (!this.isInteractable(el)) return;

        const text = this.getElementText(el);
        const name = this.generateToolName('click', text, el);

        if (seen.has(name)) return;
        seen.add(name);

        tools.push({
          name,
          description: `Click the '${text}' button`,
          input_schema: { type: 'object', properties: {}, required: [] },
          element: {
            selector: this.getUniqueSelector(el),
            type: 'button',
            text: text.substring(0, 100),
            disabled: el.disabled || undefined,
            form: el.form?.id || undefined
          }
        });
      });
    },

    /**
     * Map important navigation links
     */
    mapNavigationLinks(tools, seen) {
      const navLinks = document.querySelectorAll('nav a[href], header a[href], [role="navigation"] a[href]');

      navLinks.forEach(el => {
        if (!this.isInteractable(el)) return;

        const text = this.getElementText(el);
        if (!text || text.length < 2) return;

        const href = el.href;
        if (!href || href.startsWith('javascript:') || href === '#') return;

        const name = this.generateToolName('navigate', text, el);
        if (seen.has(name)) return;
        seen.add(name);

        tools.push({
          name,
          description: `Navigate to '${text}' (${href})`,
          input_schema: { type: 'object', properties: {}, required: [] },
          element: {
            selector: this.getUniqueSelector(el),
            type: 'link',
            text: text.substring(0, 100),
            href
          }
        });
      });
    },

    /**
     * Map forms to submit tools with field schemas
     */
    mapForms(tools, seen) {
      document.querySelectorAll('form').forEach(form => {
        const formName = form.getAttribute('name') || form.id || '';
        const action = form.action || window.location.href;
        const method = (form.method || 'GET').toUpperCase();

        const fields = this.extractFormFields(form);
        if (fields.length === 0) return;

        const name = this.generateToolName('submit', formName || 'form', form);
        if (seen.has(name)) return;
        seen.add(name);

        // Build input schema from form fields
        const properties = {};
        const required = [];

        fields.forEach(field => {
          properties[field.name] = {
            type: this.mapInputTypeToJsonType(field.inputType),
            description: field.label || field.placeholder || field.name
          };

          if (field.options) {
            properties[field.name].enum = field.options;
          }
          if (field.pattern) {
            properties[field.name].pattern = field.pattern;
          }
          if (field.min !== undefined) properties[field.name].minimum = field.min;
          if (field.max !== undefined) properties[field.name].maximum = field.max;

          if (field.required) {
            required.push(field.name);
          }
        });

        tools.push({
          name,
          description: `Submit the '${formName || 'form'}' form (${method} ${action})`,
          input_schema: {
            type: 'object',
            properties,
            required
          },
          element: {
            selector: this.getUniqueSelector(form),
            type: 'form',
            method,
            action,
            fieldCount: fields.length
          }
        });
      });
    },

    /**
     * Map standalone inputs not inside forms
     */
    mapStandaloneInputs(tools, seen) {
      const inputs = document.querySelectorAll(
        'input:not(form input), textarea:not(form textarea), select:not(form select)'
      );

      inputs.forEach(el => {
        if (!this.isInteractable(el)) return;
        if (el.type === 'hidden') return;

        const label = this.getInputLabel(el);
        const name = this.generateToolName('fill', label || el.name || el.type, el);

        if (seen.has(name)) return;
        seen.add(name);

        const tool = {
          name,
          description: `Fill the '${label || el.name || el.type}' field`,
          input_schema: {
            type: 'object',
            properties: {
              value: {
                type: this.mapInputTypeToJsonType(el.type),
                description: label || el.placeholder || 'Value to enter'
              }
            },
            required: ['value']
          },
          element: {
            selector: this.getUniqueSelector(el),
            type: el.tagName.toLowerCase(),
            inputType: el.type || undefined,
            label: label || undefined,
            placeholder: el.placeholder || undefined
          }
        };

        // Add options for select elements
        if (el.tagName === 'SELECT') {
          const options = [];
          el.querySelectorAll('option').forEach(opt => {
            if (opt.value) options.push({ value: opt.value, label: opt.textContent.trim() });
          });
          tool.input_schema.properties.value.enum = options.map(o => o.value);
          tool.element.options = options;
        }

        tools.push(tool);
      });
    },

    /**
     * Map ARIA/JS interactive elements
     */
    mapAriaInteractives(tools, seen) {
      const ariaElements = document.querySelectorAll(
        '[role="button"]:not(button), [role="tab"], [role="menuitem"], ' +
        '[role="switch"], [role="checkbox"], [role="radio"], ' +
        '[onclick], [tabindex="0"]'
      );

      ariaElements.forEach(el => {
        if (!this.isInteractable(el)) return;
        // Skip if already a standard interactive element
        if (['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;

        const text = this.getElementText(el);
        if (!text) return;

        const role = el.getAttribute('role') || 'interactive';
        const name = this.generateToolName('click', text, el);

        if (seen.has(name)) return;
        seen.add(name);

        tools.push({
          name,
          description: `Click the '${text}' ${role} element`,
          input_schema: { type: 'object', properties: {}, required: [] },
          element: {
            selector: this.getUniqueSelector(el),
            type: role,
            text: text.substring(0, 100),
            ariaLabel: el.getAttribute('aria-label') || undefined
          }
        });
      });
    },

    // ─── Helper Methods ───────────────────────────────────────────

    /**
     * Extract form field information
     */
    extractFormFields(form) {
      const fields = [];

      form.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;

        const label = this.getInputLabel(el);
        fields.push({
          name: el.name || el.id || label || `field_${fields.length}`,
          inputType: el.type || 'text',
          label: label,
          placeholder: el.placeholder || undefined,
          required: el.required || el.getAttribute('aria-required') === 'true',
          pattern: el.pattern || undefined,
          min: el.min !== '' ? Number(el.min) : undefined,
          max: el.max !== '' ? Number(el.max) : undefined,
          options: el.tagName === 'SELECT'
            ? Array.from(el.options).filter(o => o.value).map(o => o.value)
            : undefined
        });
      });

      return fields;
    },

    /**
     * Get text label for an input element
     */
    getInputLabel(el) {
      // Check for associated label
      if (el.id) {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label) return label.textContent.trim();
      }

      // Check for wrapping label
      const parentLabel = el.closest('label');
      if (parentLabel) {
        const text = parentLabel.textContent.trim().replace(el.value || '', '').trim();
        if (text) return text;
      }

      // Check aria-label
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel;

      // Check aria-labelledby
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl) return labelEl.textContent.trim();
      }

      return el.placeholder || el.name || '';
    },

    /**
     * Get visible text content from an element
     */
    getElementText(el) {
      // Try aria-label first
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel.trim();

      // Try title
      const title = el.getAttribute('title');
      if (title) return title.trim();

      // Get text content
      let text = el.textContent.trim();

      // If no text, try value (for input buttons)
      if (!text) text = el.value || '';

      // If still no text, try alt of child img
      if (!text) {
        const img = el.querySelector('img[alt]');
        if (img) text = img.alt;
      }

      return text.trim();
    },

    /**
     * Generate a unique, descriptive tool name
     */
    generateToolName(action, text, el) {
      let base = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 40)
        .replace(/_+$/, '');

      if (!base) {
        base = el.id || el.className.split(' ')[0] || el.tagName.toLowerCase();
        base = base.replace(/[^a-z0-9_]/g, '').substring(0, 30);
      }

      return `${action}_${base}`;
    },

    /**
     * Get a unique CSS selector for an element
     */
    getUniqueSelector(el) {
      // Try ID
      if (el.id) return `#${CSS.escape(el.id)}`;

      // Try unique class combo
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(c => c.length > 0);
        if (classes.length > 0) {
          const selector = `${el.tagName.toLowerCase()}.${classes.map(c => CSS.escape(c)).join('.')}`;
          try {
            if (document.querySelectorAll(selector).length === 1) return selector;
          } catch (e) { /* invalid selector */ }
        }
      }

      // Build path-based selector
      const path = [];
      let current = el;
      while (current && current !== document.body && path.length < 5) {
        let part = current.tagName.toLowerCase();

        if (current.id) {
          path.unshift(`#${CSS.escape(current.id)}`);
          break;
        }

        // Add nth-child for disambiguation
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            part += `:nth-of-type(${index})`;
          }
        }

        path.unshift(part);
        current = current.parentElement;
      }

      return path.join(' > ');
    },

    /**
     * Check if an element is interactable
     */
    isInteractable(el) {
      if (!el) return false;
      if (el.disabled) return false;
      if (el.getAttribute('aria-disabled') === 'true') return false;

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (style.pointerEvents === 'none') return false;

      return true;
    },

    /**
     * Map HTML input types to JSON Schema types
     */
    mapInputTypeToJsonType(inputType) {
      const typeMap = {
        'text': 'string',
        'email': 'string',
        'password': 'string',
        'url': 'string',
        'tel': 'string',
        'search': 'string',
        'textarea': 'string',
        'number': 'number',
        'range': 'number',
        'date': 'string',
        'datetime-local': 'string',
        'time': 'string',
        'month': 'string',
        'week': 'string',
        'color': 'string',
        'checkbox': 'boolean',
        'radio': 'string',
        'file': 'string',
        'select': 'string'
      };
      return typeMap[inputType] || 'string';
    }
  };

  window.__agentBridge_actionMapper = ActionMapper;
})();
