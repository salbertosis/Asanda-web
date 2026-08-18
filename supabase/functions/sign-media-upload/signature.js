export const FOLDER_PATTERN = /^asanda\/[a-z0-9][a-z0-9/_-]{0,72}$/;

export function canonicalize(params) {
  return Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join('&');
}

export function createSignature(params, apiSecret, sha1Hex) {
  return sha1Hex(`${canonicalize(params)}${apiSecret}`);
}

export function validateFolder(folder) {
  return typeof folder === 'string' && FOLDER_PATTERN.test(folder);
}