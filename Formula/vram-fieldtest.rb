class VramFieldtest < Formula
  desc "Bounded GPU memory pattern test with a local report"
  homepage "https://vram-fieldtest.sociobot.in"
  version "0.1.8"
  if Hardware::CPU.arm?
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.8/vram-fieldtest-macos-aarch64.tar.gz"
    sha256 "c245da5b34bb89681ed7b3b85c09de94f3ac61249492aabd27a5f3ad5335960d"
  else
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.8/vram-fieldtest-macos-x86_64.tar.gz"
    sha256 "cab6424c581ac80eab8483a24d8f6aef9af7e06d1d49945500e71030385916a9"
  end
  def install
    bin.install "vram-fieldtest"
  end
end
