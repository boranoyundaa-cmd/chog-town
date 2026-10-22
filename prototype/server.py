"""Static server with no-cache headers and a POST /save endpoint for full-res PNG captures."""
import http.server, os, time, urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
os.makedirs('shots', exist_ok=True)


class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        q = urllib.parse.urlparse(self.path)
        name = os.path.basename(urllib.parse.parse_qs(q.query).get('name', ['shot.png'])[0])
        n = int(self.headers.get('Content-Length', 0))
        data = self.rfile.read(n)
        path, ok = os.path.join('shots', name), False
        for i in range(20):                                   # a scanner may hold a new file for a moment: write beside it, then swap it in
            try:
                tmp = path + '.part'
                with open(tmp, 'wb') as f:
                    f.write(data)
                os.replace(tmp, path); ok = True; break
            except OSError as e:
                print('save retry', name, e, flush=True); time.sleep(0.25 * (i + 1))
        self.send_response(200 if ok else 500)
        self.end_headers()
        self.wfile.write(b'ok' if ok else b'failed')

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', 8766), H).serve_forever()
