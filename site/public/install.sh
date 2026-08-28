#!/bin/sh
set -eu
repo="B-Divyesh/sf-vram-fieldtest"
api="https://api.github.com/repos/$repo/releases/latest"
os="linux"; arch="$(uname -m)"
case "$arch" in x86_64) arch="x86_64";; aarch64|arm64) arch="aarch64";; *) echo "Unsupported architecture: $arch" >&2; exit 1;; esac
json="$(curl -fsSL "$api")"
url="$(printf '%s' "$json" | sed -n "s/.*\"browser_download_url\": \"\([^\"]*${os}-${arch}\.tar\.gz\)\".*/\1/p" | head -1)"
sumurl="$(printf '%s' "$json" | sed -n 's/.*"browser_download_url": "\([^"]*SHA256SUMS\)".*/\1/p' | head -1)"
[ -n "$url" ] && [ -n "$sumurl" ] || { echo "Matching download is being published. See https://github.com/$repo/releases" >&2; exit 1; }
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$url" -o "$tmp/tool.tar.gz"; curl -fsSL "$sumurl" -o "$tmp/SHA256SUMS"
file="$(basename "$url")"; (cd "$tmp" && grep " $file$" SHA256SUMS | sha256sum -c -)
tar -xzf "$tmp/tool.tar.gz" -C "$tmp"
dest="${HOME}/.local/bin"; mkdir -p "$dest"; install "$tmp/vram-fieldtest" "$dest/vram-fieldtest"
echo "Installed vram-fieldtest to $dest/vram-fieldtest"
echo "Add $dest to PATH if it is not already there. Run: vram-fieldtest demo"
