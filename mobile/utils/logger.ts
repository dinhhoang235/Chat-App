const DEBUG_APP = process.env.EXPO_PUBLIC_DEBUG_APP === "true";

const log = (...args: any[]) => {
  if (DEBUG_APP) console.log(...args);
};

const warn = (...args: any[]) => {
  if (DEBUG_APP) console.warn(...args);
};

const error = (...args: any[]) => {
  if (DEBUG_APP) console.error(...args);
};

export { DEBUG_APP, log, warn, error };
