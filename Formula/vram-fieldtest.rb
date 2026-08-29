class VramFieldtest < Formula
  desc "Bounded GPU memory pattern test with a local report"
  homepage "https://vram-fieldtest.sociobot.in"
  version "0.1.5"
  if Hardware::CPU.arm?
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.5/vram-fieldtest-macos-aarch64.tar.gz"
    sha256 "6b31086f12e57712e287fd4ffc314e3c968c317f0d43008fc9b2ec1bd0831cb1"
  else
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.5/vram-fieldtest-macos-x86_64.tar.gz"
    sha256 "d3ee4a29db4da372c2d938fe42e65d86f29d0d11b3a2f7f2776a37a9a1fc11ce"
  end
  def install
    bin.install "vram-fieldtest"
  end
end
