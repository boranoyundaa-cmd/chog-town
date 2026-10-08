"""Static server with no-cache headers and a POST /save endpoint for full-res PNG captures."""
import http.server, os, urllib.parse

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
        with open(os.path.join('shots', name), 'wb') as f:
            f.write(data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', 8766), H).serve_forever()
