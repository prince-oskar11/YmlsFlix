import http.server
import socketserver
import socket

PORT = 8080

# Function to get your local IP address on Wi-Fi
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
        # Enable CORS for all origins (necessary for PWAs)
        self.send_header('Access-Control-Allow-Origin', '*')
        # Disable caching during development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

# Update MIME types for manifest, json, js, css files
MyHandler.extensions_map.update({
    '.manifest': 'application/x-web-app-manifest+json',
    '.json': 'application/json',
    '.js': 'application/javascript',
    '.css': 'text/css',
})

if __name__ == "__main__":
    # Optional: change directory if your files are in a different folder
    # os.chdir('your/desired/directory')

    with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
        my_ip = get_ip()
        print("===============================================")
        print("   🚀 YMLSFLIX PRO - LOCAL DEV SERVER")
        print("===============================================")
        print(f"  LOCAL:    http://localhost:{PORT}")
        print(f"  MOBILE:   http://{my_ip}:{PORT}")
        print("-----------------------------------------------")
        print("  Note: Both devices must be on the same Wi-Fi.")
        print("  Press CTRL+C to shut down the server.")
        print("===============================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
