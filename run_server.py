import http.server
import socketserver
import socket
import os

PORT = 8080

# This function finds your computer's IP address on your local Wi-Fi
def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Crucial for PWA: These headers help the browser recognize the Service Worker
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

# Fix for PWA MIME types
MyHandler.extensions_map.update({
    '.manifest': 'application/x-web-app-manifest+json',
    '.json': 'application/json',
    '.js': 'application/javascript',
    '.css': 'text/css',
})

with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    my_ip = get_ip()
    print("===============================================")
    print("   🚀 YMLSFLIX PRO - LOCAL DEV SERVER")
    print("===============================================")
    print(f"  COMPUTER: http://localhost:{PORT}")
    print(f"  MOBILE:   http://{my_ip}:{PORT}")
    print("-----------------------------------------------")
    print("  Note: Both devices must be on the same Wi-Fi.")
    print("  Press CTRL+C to shut down the server.")
    print("===============================================")
    httpd.serve_forever()
