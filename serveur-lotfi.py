#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import http.server
import socketserver
import os
import sys
from datetime import datetime

PORT = 8080

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Log des requêtes
        print(f"📡 {datetime.now().strftime('%H:%M:%S')} - GET {self.path}")
        
        # Si c'est la racine ou un chemin sans extension, servir index.html
        if self.path == '/' or ('.' not in os.path.basename(self.path)):
            self.path = '/index.html'
        
        return super().do_GET()
    
    def log_message(self, format, *args):
        # Personnaliser les logs
        print(f"🌐 {datetime.now().strftime('%H:%M:%S')} - {format % args}")

def main():
    # Changer vers le répertoire du projet
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print("🚀 ========================================")
    print("🎉 SERVEUR LOTFI v5 - PYTHON")
    print(f"🌐 URL: http://localhost:{PORT}")
    print(f"📂 Répertoire: {os.getcwd()}")
    print(f"⏰ Heure: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("🚀 ========================================")
    
    try:
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            print(f"✅ Serveur démarré sur le port {PORT}")
            print("🔗 Cliquez sur: http://localhost:8080")
            print("⏹️  Appuyez sur Ctrl+C pour arrêter")
            print()
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Arrêt du serveur...")
        print("✅ Serveur arrêté proprement")
    except Exception as e:
        print(f"❌ Erreur: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 