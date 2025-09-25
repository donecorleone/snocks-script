// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      2025-09-24
// @description  try to take over the world!
// @author       You
// @match        https://snocks.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=snocks.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Warten bis die Seite geladen ist
    function waitForPage() {
        const drawer = document.querySelector('#sidebar-cart');
        if (!drawer) {
            setTimeout(waitForPage, 100);
            return;
        }

        // Master Checkbox hinzufügen
        addMasterCheckbox();

        // Item Checkboxes hinzufügen
        addItemCheckboxes();

        // Überwachen wenn sich der Warenkorb ändert
        watchForChanges();
    }

    // Master Checkbox erstellen
    function addMasterCheckbox() {
        const target = document.querySelector('#shopify-section-psh-cart-gift-with-purchase') ||
                      document.querySelector('.Drawer__Content');

        if (!target || document.getElementById('tm-giftwrap')) return;

        // Container für Master Checkbox
        const container = document.createElement('div');
        container.id = 'tm-giftwrap';
        container.style.cssText = 'padding:12px 16px;margin-top:8px;border-top:1px solid rgba(0,0,0,.08);display:flex;align-items:center;gap:8px;font-size:14px;';

        // Checkbox erstellen
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'tm-giftwrap-checkbox';
        checkbox.style.marginLeft = '15px';

        // Label erstellen
        const label = document.createElement('label');
        label.setAttribute('for', 'tm-giftwrap-checkbox');
        label.textContent = 'Geschenkbox';

        // Alles zusammenfügen
        container.append(checkbox, label);
        target.appendChild(container);

        // Event Listener für Master Checkbox
        checkbox.addEventListener('change', function() {
            const allItemCheckboxes = document.querySelectorAll('[id^="tm-item-geschenkbox-"]');
            allItemCheckboxes.forEach(itemCheckbox => {
                itemCheckbox.checked = checkbox.checked;
            });

            // Cart Attribut setzen
            updateCartAttribute('gift_wrap', checkbox.checked ? 'true' : '');
        });
    }

    // Item Checkboxes zu jedem Warenkorb-Item hinzufügen
    function addItemCheckboxes() {
        const cartItems = document.querySelectorAll('.CartItem');

        cartItems.forEach(cartItem => {
            // Prüfen ob Checkbox bereits existiert
            if (cartItem.querySelector('[id^="tm-item-geschenkbox-"]')) return;

            // Actions Container finden
            const actionsContainer = cartItem.querySelector('.CartItem__Actions');
            if (!actionsContainer) return;

            // Line ID aus dem Quantity Input extrahieren
            const quantityInput = cartItem.querySelector('input[name^="updates["]');
            if (!quantityInput) return;

            const lineId = quantityInput.getAttribute('data-line-id') ||
                          quantityInput.name.match(/updates\[([^\]]+)\]/)?.[1];
            if (!lineId) return;

            // Checkbox Container erstellen
            const checkboxContainer = document.createElement('div');
            checkboxContainer.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:8px;font-size:12px;';

            // Checkbox erstellen
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `tm-item-geschenkbox-${lineId.replace(/[^a-zA-Z0-9]/g, '_')}`;
            checkbox.checked = false; // Standardmäßig unchecked

            // Label erstellen
            const label = document.createElement('label');
            label.setAttribute('for', checkbox.id);
            label.textContent = 'Geschenkbox';
            label.style.cssText = 'cursor:pointer;font-size:12px;';

            // Alles zusammenfügen
            checkboxContainer.append(checkbox, label);
            actionsContainer.appendChild(checkboxContainer);

            // Event Listener für Item Checkbox
            checkbox.addEventListener('change', function() {
                // Master Checkbox Status aktualisieren
                updateMasterCheckbox();

                // Cart Attribut für dieses Item setzen
                const attrKey = `line_item_${lineId.replace(/[^a-zA-Z0-9]/g, '_')}_gift_wrap`;
                updateCartAttribute(attrKey, checkbox.checked ? 'true' : '');
            });
        });
    }

    // Master Checkbox Status basierend auf Item Checkboxes aktualisieren
    function updateMasterCheckbox() {
        const masterCheckbox = document.getElementById('tm-giftwrap-checkbox');
        const itemCheckboxes = document.querySelectorAll('[id^="tm-item-geschenkbox-"]');

        if (itemCheckboxes.length === 0) return;

        const allChecked = Array.from(itemCheckboxes).every(cb => cb.checked);
        const anyChecked = Array.from(itemCheckboxes).some(cb => cb.checked);

        if (allChecked) {
            masterCheckbox.checked = true;
            masterCheckbox.indeterminate = false;
        } else if (anyChecked) {
            masterCheckbox.checked = false;
            masterCheckbox.indeterminate = true;
        } else {
            masterCheckbox.checked = false;
            masterCheckbox.indeterminate = false;
        }
    }

    // Cart Attribut aktualisieren
    async function updateCartAttribute(name, value) {
        try {
            const body = { attributes: {} };
            body.attributes[name] = value;

            await fetch('/cart/update.js', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(body)
            });

            // Event für Theme auslösen
            document.dispatchEvent(new CustomEvent('cart:updated'));
        } catch (error) {
            console.warn('Fehler beim Aktualisieren des Cart Attributes:', error);
        }
    }

    // Überwachen wenn sich der Warenkorb ändert
    function watchForChanges() {
        const observer = new MutationObserver(function() {
            addMasterCheckbox();
            addItemCheckboxes();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // Script starten
    waitForPage();
})();