#!/usr/bin/env python3
"""Create byte-reproducible single-binary release archives."""

from __future__ import annotations

import argparse
import gzip
import io
import stat
import tarfile
import zipfile
from pathlib import Path


FIXED_ZIP_TIME = (2024, 1, 1, 0, 0, 0)


def build_tar(source: Path, output: Path, archived_name: str) -> None:
    payload = source.read_bytes()
    with output.open("wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode="w") as archive:
                info = tarfile.TarInfo(archived_name)
                info.size = len(payload)
                info.mode = 0o755
                info.uid = 0
                info.gid = 0
                info.uname = "root"
                info.gname = "root"
                info.mtime = 0
                archive.addfile(info, io.BytesIO(payload))


def build_zip(source: Path, output: Path, archived_name: str) -> None:
    info = zipfile.ZipInfo(archived_name, FIXED_ZIP_TIME)
    info.create_system = 3
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = (stat.S_IFREG | 0o755) << 16
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        archive.writestr(info, source.read_bytes())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("format", choices=("tar.gz", "zip"))
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("archived_name")
    args = parser.parse_args()
    if not args.source.is_file():
        parser.error(f"source binary does not exist: {args.source}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.format == "tar.gz":
        build_tar(args.source, args.output, args.archived_name)
    else:
        build_zip(args.source, args.output, args.archived_name)


if __name__ == "__main__":
    main()
