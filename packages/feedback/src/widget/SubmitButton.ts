import type { FeedbackComponent } from '../types';
import { createElement } from './util/createElement';

export interface SubmitButtonProps {
  label: string;
}

interface SubmitButtonComponent extends FeedbackComponent<HTMLButtonElement> {
  /**
   * Disables the submit button
   */
  setDisabled: () => void;

  /**
   * Enables the submit button
   */
  setEnabled: () => void;
}

/**
 *
 */
export function SubmitButton({ label }: SubmitButtonProps): SubmitButtonComponent {
  const el = createElement(
    'button',
    {
      type: 'submit',
      className: 'btn btn--primary',
      disabled: true,
      ariaDisabled: 'true',
    },
    label,
  );

  return {
    el,
    setDisabled: () => {
      el.disabled = true;
      el.ariaDisabled = 'true';
    },
    setEnabled: () => {
      el.disabled = false;
      el.ariaDisabled = 'false';
    },
  };
}