export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = 'chatscope-akmuie5mpq-ew.a.run.app';
    return fetch(url, request);
  }
};
