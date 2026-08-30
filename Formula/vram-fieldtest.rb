class VramFieldtest < Formula
  desc "Bounded GPU memory pattern test with a local report"
  homepage "https://vram-fieldtest.sociobot.in"
  version "0.1.7"
  if Hardware::CPU.arm?
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.7/vram-fieldtest-macos-aarch64.tar.gz"
    sha256 "7620786c85aad83fb60d653ee69fb92fdb8d5b3c1c2f3317dba65db94d4d39c1"
  else
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.7/vram-fieldtest-macos-x86_64.tar.gz"
    sha256 "b52f74560714c3e2de2da35953465c6f7812c37b1705e5c3e1d8b7241ab1786c"
  end
  def install
    bin.install "vram-fieldtest"
  end
end
