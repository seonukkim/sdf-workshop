// Tiny indirection so screens can navigate without importing the router (avoids import cycles).
let handler = () => {};
export const setNav = (fn) => { handler = fn; };
export const go = (path, opts) => handler(path, opts);
