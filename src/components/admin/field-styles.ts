/**
 * Shared look for the admin's raw <input>/<select> controls (the ones that don't use <Input>):
 * visible keyboard focus, invalid and disabled states, matching the shared Input.
 */
export const adminField =
  "rounded-lg border border-input bg-surface text-base transition-colors duration-150 ease-out outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm";
