class VramFieldtest < Formula
  desc "Bounded GPU memory pattern test with a local report"
  homepage "https://vram-fieldtest.sociobot.in"
  version "0.1.2"
  if Hardware::CPU.arm?
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.2/vram-fieldtest-macos-aarch64.tar.gz"
    sha256 "69d2ff1f8d881c1bcabd9e5c4a4074083e10bdc6a274deb14189460941a88bb9"
  else
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.2/vram-fieldtest-macos-x86_64.tar.gz"
    sha256 "77726c76242e89208668448ec816fcfb311d451ad05c0e4bfe0f610c4e6dbb69"
  end
  def install
    bin.install "vram-fieldtest"
  end
end
