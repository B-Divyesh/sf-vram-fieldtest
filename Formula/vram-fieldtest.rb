class VramFieldtest < Formula
  desc "Bounded GPU memory pattern test with a local report"
  homepage "https://vram-fieldtest.sociobot.in"
  version "0.1.6"
  if Hardware::CPU.arm?
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.6/vram-fieldtest-macos-aarch64.tar.gz"
    sha256 "2610356eecc3e9b92f837fb43dab0aaac99afb049eda2c2f7c024d1ed05e87b9"
  else
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.6/vram-fieldtest-macos-x86_64.tar.gz"
    sha256 "f59687d3ff301e032923f179fa36b51227a1e8d3ce9a004ec140daded35a80f0"
  end
  def install
    bin.install "vram-fieldtest"
  end
end
