// Allow importing CSS files without TypeScript errors
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
