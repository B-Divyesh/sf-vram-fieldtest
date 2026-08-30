#!/bin/sh
set -eu
repo="B-Divyesh/sf-vram-fieldtest"
expected="v0.1.10"
api="${VRAM_FIELDTEST_RELEASE_API:-https://api.github.com/repos/$repo/releases/latest}"
identity_api="${VRAM_FIELDTEST_IDENTITY_URL:-https://vram-fieldtest.sociobot.in/release.json}"
commit_api="${VRAM_FIELDTEST_COMMIT_API:-https://api.github.com/repos/$repo/commits/$expected}"
case "$(uname -s)" in Linux) os="linux";; Darwin) os="macos";; *) echo "Unsupported operating system: $(uname -s)" >&2; exit 1;; esac
arch="$(uname -m)"
case "$arch" in x86_64) arch="x86_64";; aarch64|arm64) arch="aarch64";; *) echo "Unsupported architecture: $arch" >&2; exit 1;; esac
[ "$os-$arch" != "linux-aarch64" ] || { echo "Linux aarch64 is not published yet." >&2; exit 1; }
json="$(curl -fsSL "$api")"
tag="$(printf '%s' "$json" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -1)"
[ "$tag" = "$expected" ] || { echo "Downloads for $expected are not published yet. See https://github.com/$repo/releases" >&2; exit 1; }
identity="$(curl -fsSL "$identity_api")"
identity_tag="$(printf '%s' "$identity" | sed -n 's/.*"tag": *"\([^"]*\)".*/\1/p' | head -1)"
expected_commit="$(printf '%s' "$identity" | sed -n 's/.*"source_commit": *"\([^"]*\)".*/\1/p' | head -1)"
commit_json="$(curl -fsSL "$commit_api")"
published_commit="$(printf '%s' "$commit_json" | tr ',' '\n' | sed -n 's/.*"sha"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
[ "$identity_tag" = "$expected" ] && [ -n "$expected_commit" ] && [ "$published_commit" = "$expected_commit" ] || { echo "Downloads for $expected do not match this site build yet. See https://github.com/$repo/releases" >&2; exit 1; }
url="$(printf '%s' "$json" | sed -n "s/.*\"browser_download_url\": \"\([^\"]*${os}-${arch}\.tar\.gz\)\".*/\1/p" | head -1)"
sumurl="$(printf '%s' "$json" | sed -n 's/.*"browser_download_url": "\([^"]*SHA256SUMS\)".*/\1/p' | head -1)"
provenance_url="$(printf '%s' "$json" | sed -n 's/.*"browser_download_url": "\([^"]*PROVENANCE\.json\)".*/\1/p' | head -1)"
[ -n "$url" ] && [ -n "$sumurl" ] && [ -n "$provenance_url" ] || { echo "Matching download is being published. See https://github.com/$repo/releases" >&2; exit 1; }
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
file="$(basename "$url")"
curl -fsSL "$url" -o "$tmp/$file"; curl -fsSL "$sumurl" -o "$tmp/SHA256SUMS"; curl -fsSL "$provenance_url" -o "$tmp/PROVENANCE.json"
provenance_commit="$(sed -n 's/.*"source_commit": *"\([^"]*\)".*/\1/p' "$tmp/PROVENANCE.json" | head -1)"
[ "$provenance_commit" = "$expected_commit" ] || { echo "Release provenance does not match this site build." >&2; exit 1; }
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$tmp" && grep " $file$" SHA256SUMS | sha256sum -c -)
else
  (cd "$tmp" && grep " $file$" SHA256SUMS | shasum -a 256 -c -)
fi
tar -xzf "$tmp/$file" -C "$tmp"
dest="${VRAM_FIELDTEST_INSTALL_DIR:-${HOME}/.local/bin}"; mkdir -p "$dest"; install "$tmp/vram-fieldtest" "$dest/vram-fieldtest"
echo "Installed vram-fieldtest to $dest/vram-fieldtest"
echo "Add $dest to PATH if it is not already there. Run: vram-fieldtest demo"
