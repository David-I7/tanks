export default class PageNotFoundError extends Error {
  path: string;
  constructor(path: string) {
    super(`Page not found: ${path}`);
    this.path = path;
    this.name = "PageNotFoundError";
  }
}
