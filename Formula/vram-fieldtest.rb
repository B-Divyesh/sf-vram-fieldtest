class VramFieldtest < Formula
  desc "Bounded GPU memory pattern test with a local report"
  homepage "https://vram-fieldtest.sociobot.in"
  version "0.1.3"
  if Hardware::CPU.arm?
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.3/vram-fieldtest-macos-aarch64.tar.gz"
    sha256 "336e3243293bb965909423b60290f0cc4566c65b8fa2df7d75197effbbcc1e1d"
  else
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.3/vram-fieldtest-macos-x86_64.tar.gz"
    sha256 "b076d00a6338621d4d7c0292f43768e095140f3ba85867ebdc0190ba2cdb9e58"
  end
  def install
    bin.install "vram-fieldtest"
  end
end
