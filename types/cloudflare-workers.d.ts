declare module 'cloudflare:workers' {
  export const env: {
    AI?: {
      run(model:string,input:Record<string,unknown>):Promise<any>;
    };
    [key:string]:unknown;
  };
}
