interface PagesFunction<Env = unknown> {
  (context: {
    request: Request;
    env: Env;
    waitUntil: (promise: Promise<unknown>) => void;
  }): Response | Promise<Response>;
}

interface CacheStorage {
  default: Cache;
}
