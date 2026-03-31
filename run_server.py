import json

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/manifest.json":
            # Generate your dynamic manifest here
            manifest_data = {
                "name": "YMLSFLIX PRO",
                "short_name": "YMLSFLIX",
                "description": "Premium Anime & Movie Streaming Platform",
                "start_url": "/index.html",
                "display": "standalone",
                "orientation": "any",
                "background_color": "#05070a",
                "theme_color": "#ef4444",
                "icons": [
                    {
                        "src": "https://your-cdn.com/icons/icon-192.png",
                        "sizes": "192x192",
                        "type": "image/png",
                        "purpose": "any"
                    },
                    {
                        "src": "https://your-cdn.com/icons/icon-512.png",
                        "sizes": "512x512",
                        "type": "image/png",
                        "purpose": "maskable"
                    }
                ],
                "screenshots": [
                    {
                        "src": "https://your-cdn.com/screenshots/screen-1080x1920.png",
                        "sizes": "1080x1920",
                        "type": "image/png",
                        "form_factor": "narrow",
                        "label": "Home Screen"
                    }
                ]
            }
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(manifest_data).encode())
        else:
            super().do_GET()
