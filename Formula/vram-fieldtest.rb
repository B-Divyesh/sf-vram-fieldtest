class VramFieldtest < Formula
  desc "Bounded GPU memory pattern test with a local report"
  homepage "https://vram-fieldtest.sociobot.in"
  version "0.1.10"
  if Hardware::CPU.arm?
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.10/vram-fieldtest-macos-aarch64.tar.gz"
    sha256 "faf6ce01e9cabb58d1d2584b5ee54a90f6965aeefa2b5811d004bc934a237ce1"
  else
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.10/vram-fieldtest-macos-x86_64.tar.gz"
    sha256 "e9170f9cf71c10c835495c2ad244e2796ac49f3d8b5dc27c50fb05222f8c2417"
  end
  def install
    bin.install "vram-fieldtest"
  end
end
