/** Markdown files are bundled as plain text (angular.json `loader: { ".md": "text" }`). */
declare module '*.md' {
  const content: string;
  export default content;
}
