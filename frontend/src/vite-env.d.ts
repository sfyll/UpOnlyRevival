/// <reference types="vite/client" />
interface Window {
  ethereum?: any; 
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
// For regular CSS files if you import them directly for side effects
declare module '*.css';
declare module '*.scss';
