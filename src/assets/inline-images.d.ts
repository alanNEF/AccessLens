/** Vite inlines `?inline` images as data: URLs, so the content script needs no web_accessible_resources. */
declare module '*.png?inline' {
  const src: string;
  export default src;
}
