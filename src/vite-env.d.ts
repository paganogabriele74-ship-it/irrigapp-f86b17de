/// <reference types="vite/client" />

declare module "*.asset.json" {
  const content: { url: string; [key: string]: unknown };
  export default content;
}

