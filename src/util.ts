export const base64UrlEncode = (input: string) => input
  .replace(/\+/g, '.')
  .replace(/\//g, '_')
  .replace(/=/g, '-');

export const base64UrlDecode = (input: string) => input
  .replace(/./g, '+')
  .replace(/_/g, '/')
  .replace(/-/g, '=');
 