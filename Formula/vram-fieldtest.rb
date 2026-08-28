class VramFieldtest < Formula
  desc "Bounded GPU memory pattern test with a local report"
  homepage "https://vram-fieldtest.sociobot.in"
  version "0.1.1"
  if Hardware::CPU.arm?
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.1/vram-fieldtest-macos-aarch64.tar.gz"
    sha256 "REPLACE_WITH_ARM64_RELEASE_SHA256"
  else
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.1/vram-fieldtest-macos-x86_64.tar.gz"
    sha256 "REPLACE_WITH_X86_64_RELEASE_SHA256"
  end
  def install
    bin.install "vram-fieldtest"
  end
end
