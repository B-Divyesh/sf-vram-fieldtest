class VramFieldtest < Formula
  desc "Bounded GPU memory pattern test with a local report"
  homepage "https://vram-fieldtest.sociobot.in"
  version "0.1.10"
  if Hardware::CPU.arm?
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.10/vram-fieldtest-macos-aarch64.tar.gz"
    sha256 "84c995ce062cf48a75bfecaa4d93508b62a4f9ca9b81734b96dcbb36d4c0dd5d"
  else
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.10/vram-fieldtest-macos-x86_64.tar.gz"
    sha256 "213b882c0edb05cb7b62a6c34d1499b06928fb2ced023b0df5812435b3d9ba66"
  end
  def install
    bin.install "vram-fieldtest"
  end
end
