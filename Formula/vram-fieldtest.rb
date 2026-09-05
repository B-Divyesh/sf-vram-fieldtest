class VramFieldtest < Formula
  desc "Bounded GPU memory pattern test with a local report"
  homepage "https://vram-fieldtest.sociobot.in"
  version "0.1.11"
  if Hardware::CPU.arm?
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.11/vram-fieldtest-macos-aarch64.tar.gz"
    sha256 "87cbe1cf89fd178d0af086bb203a23eb14f61db1d38da4f3954b0acf238ae1b0"
  else
    url "https://github.com/B-Divyesh/sf-vram-fieldtest/releases/download/v0.1.11/vram-fieldtest-macos-x86_64.tar.gz"
    sha256 "9eef9a98fa9eb5b5099022bb1477b3e1242a5ca73d4bc059b14ad8d637858e7c"
  end
  def install
    bin.install "vram-fieldtest"
  end
end
