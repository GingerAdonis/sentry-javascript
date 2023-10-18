/**
 * Helper function to create an element. Could be used as a JSX factory
 * (i.e. React-like syntax).
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes: { [key: string]: string | boolean | EventListenerOrEventListenerObject } | null,
  ...children: any
): HTMLElementTagNameMap[K] {
  // eslint-disable-next-line no-restricted-globals
  const element = document.createElement(tagName);

  if (attributes) {
    Object.entries(attributes).forEach(([attribute, attributeValue]) => {
      if (attribute === 'className' && typeof attributeValue === 'string') {
        // JSX does not allow class as a valid name
        element.setAttribute('class', attributeValue);
      } else if (typeof attributeValue === 'boolean' && attributeValue) {
        element.setAttribute(attribute, '');
      } else if (typeof attributeValue === 'string') {
        element.setAttribute(attribute, attributeValue);
      } else if (attribute.startsWith('on') && typeof attributeValue === 'function') {
        element.addEventListener(attribute.substring(2).toLowerCase(), attributeValue);
      }
    });
  }
  for (const child of children) {
    appendChild(element, child);
  }

  return element;
}

function appendChild(parent: Node, child: any): void {
  if (typeof child === 'undefined' || child === null) {
    return;
  }

  if (Array.isArray(child)) {
    for (const value of child) {
      appendChild(parent, value);
    }
  } else if (child === false) {
    // do nothing if child evaluated to false
  } else if (typeof child === 'string') {
    // eslint-disable-next-line no-restricted-globals
    parent.appendChild(document.createTextNode(child));
  } else if (child instanceof Node) {
    parent.appendChild(child);
  } else {
    // eslint-disable-next-line no-restricted-globals
    parent.appendChild(document.createTextNode(String(child)));
  }
}