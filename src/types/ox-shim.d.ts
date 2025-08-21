// src/types/ox-shim.d.ts
// Tell TypeScript to treat anything imported from "ox" as `any`,
// so it won't follow into node_modules/ox/core/Signature.ts and type-check it.

declare module 'ox' {
  const anything: any;
  export = anything;
  export default anything;
}

declare module 'ox/*' {
  const anything: any;
  export = anything;
  export default anything;
}
