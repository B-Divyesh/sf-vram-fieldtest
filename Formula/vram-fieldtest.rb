class VramFieldtest < Formula
  desc "Bounded GPU memory pattern test with a local report"
  homepage "https://vram-fieldtest.sociobot.in"
  url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.0/vram-fieldtest-macos-aarch64.tar.gz"
  sha256 "REPLACE_WITH_RELEASE_SHA256"
  version "0.1.0"
  def install
    bin.install "vram-fieldtest"
  end
end
