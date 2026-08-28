class VramFieldtest < Formula
  desc "Bounded GPU memory pattern test with a local report"
  homepage "https://vram-fieldtest.sociobot.in"
  version "0.1.1"
  if Hardware::CPU.arm?
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.1/vram-fieldtest-macos-aarch64.tar.gz"
    sha256 "3a138c008e6a8e3e9334a8605979c6cb93ba0aaed64cf72256ac38501a6fad25"
  else
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.1/vram-fieldtest-macos-x86_64.tar.gz"
    sha256 "1187de63af88a1dcaf09b0ddd0058b92407789fdd26d7049640320c3b13966f4"
  end
  def install
    bin.install "vram-fieldtest"
  end
end
