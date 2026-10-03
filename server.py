#!/usr/bin/env python3
import http.server
import socket
import socketserver
import os
import sys

PORT = 8080

def get_local_ip():
    # macOS の ipconfig / ifconfig から取得
    try:
        import subprocess
        out = subprocess.check_output("ipconfig getifaddr en0 2>/dev/null || ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1", shell=True).decode().strip()
        if out:
            return out
    except Exception:
        pass

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_local_ip()

    port = PORT
    for p in range(PORT, PORT + 10):
        try:
            handler = http.server.SimpleHTTPRequestHandler
            httpd = socketserver.TCPServer(("", p), handler)
            port = p
            break
        except OSError:
            continue

    print("=" * 60)
    print(" 🚀 CYBER ARENA: 3D SURVIVOR - ローカルサーバー起動中")
    print("=" * 60)
    print(f" 💻 Macのブラウザで遊ぶ:")
    print(f"    👉 http://localhost:{port}")
    print()
    print(f" 📱 iPhone実機のSafariで遊ぶ（同一Wi-Fiからアクセス）:")
    print(f"    👉 http://{local_ip}:{port}")
    print("=" * 60)
    print(" 終了するには Ctrl + C を押してください。\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nサーバーを停止しました。")
        httpd.server_close()

if __name__ == '__main__':
    main()
