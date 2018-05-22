declare module 'winston' {
  export const createLogger: any;
  export const transports: any;
  export const format: {
    combine: any;
    timestamp: any;
    label: any;
    printf: any;
  };
}
