import http.server
import socketserver
import requests
import threading
import time
import json
from urllib.parse import urlparse

# --- CONFIGURATION ---
BACKEND_CONFIG_URL = "http://localhost:5001/api/firewall/config"
CHECK_INTERVAL = 30  # Seconds to poll backend for new rules
PORT = 8080

class FirewallState:
    def __init__(self):
        self.allowed_domains = ["google.com", "github.com", "stackoverflow.com", "localhost"]
        self.is_enabled = True
        self.lock = threading.Lock()

    def update_rules(self):
        """Poll the backend for the latest firewall configuration"""
        while True:
            try:
                response = requests.get(BACKEND_CONFIG_URL, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    with self.lock:
                        self.allowed_domains = data.get("allowed_domains", [])
                        self.is_enabled = data.get("is_enabled", True)
                    print(f"🔄 [FIREWALL] Config updated: {len(self.allowed_domains)} allowed domains.")
            except Exception as e:
                print(f"⚠️ [FIREWALL] Failed to sync with backend: {e}")
            
            time.sleep(CHECK_INTERVAL)

# Global State
state = FirewallState()

class FirewallHandler(http.server.BaseHTTPRequestHandler):
    """
    Enhanced Firewall Handler
    Acts as a proxy and blocks non-allowed domains.
    """
    
    def do_CONNECT(self):
        """Handle HTTPS (Simple filtering of domain only)"""
        # We don't decrypt, just check the destination domain before proxying
        hostname = self.path.split(":")[0]
        
        if self.is_allowed(hostname):
            # In a real production proxy, we'd establish a tunnel here.
            # For this custom local educational firewall, we simulate a 403 
            # if blocked, but HTTPS tunneling is complex for a simple script.
            self.send_error(501, "HTTPS Tunneling not supported in this lightweight mode. Use HTTP or white-list the app.")
        else:
            self.send_blocked()

    def do_GET(self):
        """Handle HTTP requests with filtering"""
        parsed_url = urlparse(self.path)
        hostname = parsed_url.hostname or ""
        
        if self.is_allowed(hostname):
            try:
                # Forward the request
                headers = {k: v for k, v in self.headers.items()}
                resp = requests.get(self.path, headers=headers, stream=True, timeout=10)
                
                self.send_response(resp.status_code)
                for k, v in resp.headers.items():
                    if k.lower() not in ['content-encoding', 'transfer-encoding', 'content-length']:
                        self.send_header(k, v)
                self.end_headers()
                
                for chunk in resp.iter_content(chunk_size=8192):
                    self.wfile.write(chunk)
            except Exception as e:
                self.send_error(502, f"Proxy Error: {str(e)}")
        else:
            self.send_blocked()

    def is_allowed(self, hostname):
        if not state.is_enabled:
            return True
        
        with state.lock:
            # Check if hostname or any parent domain is allowed
            for allowed in state.allowed_domains:
                if hostname == allowed or hostname.endswith(f".{allowed}"):
                    return True
        return False

    def send_blocked(self):
        self.send_response(403)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        html = f"""
        <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #f8f9fa;">
                <h1 style="color: #dc3545;">✋ Access Blocked by EduLearn</h1>
                <p>This site has not been approved by your teacher for this session.</p>
                <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; display: inline-block; border: 1px solid #dee2e6;">
                    <strong>Requested Domain:</strong> {self.path}
                </div>
            </body>
        </html>
        """
        self.wfile.write(html.encode())

def run_firewall():
    # Start the rule updater thread
    updater = threading.Thread(target=state.update_rules, daemon=True)
    updater.start()

    # Start the server
    with socketserver.ThreadingTCPServer(("", PORT), FirewallHandler) as httpd:
        print(f"🔥 [FIREWALL] Perfected Firewall active on port {PORT}")
        print(f"📺 Teachers can manage this from the Web Dashboard.")
        httpd.serve_forever()

if __name__ == "__main__":
    run_firewall()