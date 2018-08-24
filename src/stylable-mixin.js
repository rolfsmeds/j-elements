// Needed for ShadyCSS
// Module identifier
let moduleCounter = 0;
// Module class prefix
const MODULE_CLASS_PREFIX = '_smod_';

export const StylableMixin = superClass => class JStylableMixin extends superClass {
  _upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
      let value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  connectedCallback() {
    if (super.connectedCallback) super.connectedCallback();
    if (typeof ShadyCSS != 'undefined' && !ShadyCSS.nativeShadow) {
      ShadyCSS.styleElement(this);
    }
    this._gatherStyleModules();
  }

  _gatherStyleModules() {
    // Gather style modules (scoped and global)
    let styleModules = Array.from(this.getRootNode().querySelectorAll(`style[type=scoped]`));
    styleModules = styleModules.concat(Array.from(document.querySelectorAll(`style[type=global]`)));

    styleModules.forEach(style => {
      // Test if the `for` selector matches this element
      let match = false;
      if (this.matches) {
        match = this.matches(style.getAttribute('for'));
      } else if (this.msMatchesSelector) {
        match = this.msMatchesSelector(style.getAttribute('for'));
      }

      if (match) {
        const clone = style.cloneNode(true);
        clone.removeAttribute('for');
        clone.removeAttribute('type');
        clone.setAttribute('module', '');

        if (typeof ShadyCSS != 'undefined' && !ShadyCSS.nativeShadow) {
          if (style.__moduleId === undefined) {
            style.__moduleId = moduleCounter++;
          }
          if (style.__scopedFor === undefined) {
            // List of elements + module that this module has already been applied to
            // This is needed because ScopingShim always wants to scope based on a tag selector,
            // so we need separately scoped styles for each element type
            style.__scopedFor = [];
          }

          // F.e. 'x-foo._smod_0' (element-name + class-prefix + module-id)
          const scope = this.nodeName.toLowerCase() + '.' + MODULE_CLASS_PREFIX + style.__moduleId;

          if (style.__scopedFor.indexOf(scope) == -1) {
            style.__scopedFor.push(scope);
            const template = document.createElement('template');
            template.content.appendChild(clone);
            ShadyCSS.ScopingShim.prepareTemplate(template, scope);
            ShadyCSS.styleElement(this);
          }
          const scopeClass = MODULE_CLASS_PREFIX + style.__moduleId;
          this.classList.add(scopeClass);
          // TODO would like to use some method from ScopingShim but I can't find a suitable one
          // This should be recursive as well, not just the first level of children
          Array.from(this.shadowRoot.querySelectorAll('*')).forEach(child => {
            child.classList.add(scopeClass);
          });
        } else {
          this.shadowRoot.appendChild(clone);
        }
      }
    });
  }

  __removeStyleModuleClasses(el) {
    el.classList.forEach(c => {
      if (c.indexOf(MODULE_CLASS_PREFIX) == 0) {
        el.classList.remove(c);
      }
    });
  }

  disconnectedCallback() {
    if (super.disconnectedCallback) super.disconnectedCallback();

    this.__removeStyleModuleClasses(this);

    if (typeof ShadyCSS != 'undefined' && !ShadyCSS.nativeShadow) {
      Array.from(this.shadowRoot.querySelectorAll('*')).forEach(child => {
        this.__removeStyleModuleClasses(child);
      });
    } else {
      Array.from(this.shadowRoot.querySelectorAll('style[module]')).forEach(style => {
        this.shadowRoot.removeChild(style);
      });
    }
  }
}
