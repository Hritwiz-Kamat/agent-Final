/**
 * AgentBridge — Action Mapper (Headless-Compatible Bundle)
 * Injected into pages via page.evaluate().
 *
 * Key differences from Chrome Extension version:
 * - isInteractable() uses attribute heuristic instead of getComputedStyle + pointerEvents
 * - No window.__agentBridge_actionMapper global — returns result directly
 */

(function () {
  'use strict';

  const ActionMapper = {
    /**
     * Main entry: scan the page and return tool definitions
     */
    mapActions() {
      const tools = [];
      const seen = new Set();

      this.mapButtons(tools, seen);
      this.mapNavigationLinks(tools, seen);
      this.mapForms(tools, seen);
      this.mapStandaloneInputs(tools, seen);
      this.mapAriaInteractives(tools, seen);

      return tools;
    },

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

    mapStandaloneInputs(tools, seen) {
      const inputs = document.querySelectorAll('input, textarea, select');

      inputs.forEach(el => {
        if (el.closest('form')) return;
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

    mapAriaInteractives(tools, seen) {
      const ariaElements = document.querySelectorAll(
        '[role="button"]:not(button), [role="tab"], [role="menuitem"], ' +
        '[role="switch"], [role="checkbox"], [role="radio"], ' +
        '[onclick], [tabindex="0"]'
      );

      ariaElements.forEach(el => {
        if (!this.isInteractable(el)) return;
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

    getInputLabel(el) {
      if (el.id) {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label) return label.textContent.trim();
      }

      const parentLabel = el.closest('label');
      if (parentLabel) {
        const text = parentLabel.textContent.trim().replace(el.value || '', '').trim();
        if (text) return text;
      }

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel;

      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl) return labelEl.textContent.trim();
      }

      return el.placeholder || el.name || '';
    },

    getElementText(el) {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel.trim();

      const title = el.getAttribute('title');
      if (title) return title.trim();

      let text = el.textContent.trim();
      if (!text) text = el.value || '';
      if (!text) {
        const img = el.querySelector('img[alt]');
        if (img) text = img.alt;
      }

      return text.trim();
    },

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

    getUniqueSelector(el) {
      if (el.id) return `#${CSS.escape(el.id)}`;

      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(c => c.length > 0);
        if (classes.length > 0) {
          const selector = `${el.tagName.toLowerCase()}.${classes.map(c => CSS.escape(c)).join('.')}`;
          try {
            if (document.querySelectorAll(selector).length === 1) return selector;
          } catch (e) { /* invalid selector */ }
        }
      }

      const path = [];
      let current = el;
      while (current && current !== document.body && path.length < 5) {
        let part = current.tagName.toLowerCase();

        if (current.id) {
          path.unshift(`#${CSS.escape(current.id)}`);
          break;
        }

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
     * Headless-compatible interactability check.
     * Replaces getComputedStyle + pointerEvents with attribute heuristics.
     */
    isInteractable(el) {
      if (!el) return false;
      if (el.disabled) return false;
      if (el.getAttribute('aria-disabled') === 'true') return false;

      // Check inline styles (works without layout engine)
      const inlineStyle = (el.getAttribute('style') || '').toLowerCase();
      if (inlineStyle.includes('display: none') || inlineStyle.includes('display:none')) return false;
      if (inlineStyle.includes('visibility: hidden') || inlineStyle.includes('visibility:hidden')) return false;
      // Note: pointerEvents check removed — Lightpanda has no layout engine

      // Check hidden attributes
      if (el.hasAttribute('hidden')) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;

      // Walk up ancestors
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        const pStyle = (parent.getAttribute('style') || '').toLowerCase();
        if (pStyle.includes('display: none') || pStyle.includes('display:none')) return false;
        if (parent.hasAttribute('hidden')) return false;
        if (parent.getAttribute('aria-hidden') === 'true') return false;
        parent = parent.parentElement;
      }

      // Try getComputedStyle if available
      try {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
      } catch (e) { /* Lightpanda may not support this fully */ }

      return true;
    },

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
