"""Check an explicit URL list and produce a reviewable CSV report."""

import argparse
import csv
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


FIELDS = ("url", "final_url", "status", "result", "duration_ms", "note")


def load_urls(path):
    """Read a UTF-8 list, ignoring blank/comment lines and exact duplicates."""
    seen = set()
    urls = []
    for line in Path(path).read_text(encoding="utf-8-sig").splitlines():
        url = line.strip()
        if not url or url.startswith("#") or url in seen:
            continue
        urls.append(url)
        seen.add(url)
    return urls


def audit_url(url, timeout=5):
    """Use HEAD first; use GET for servers that reject HEAD with 405/501."""
    try:
        parts = urlsplit(url)
        valid = parts.scheme in ("http", "https") and bool(parts.hostname)
    except ValueError:
        valid = False
    if not valid:
        return dict(url=url, final_url="", status="", result="invalid", duration_ms=0,
                    note="只支持带主机名的 http:// 或 https:// 地址")
    if timeout <= 0:
        raise ValueError("timeout 必须大于 0")

    started = time.monotonic()
    for method in ("HEAD", "GET"):
        request = Request(url, method=method, headers={"User-Agent": "MiniLinkAuditor/1.0"})
        try:
            with urlopen(request, timeout=timeout) as response:
                status = response.status
                final_url = response.geturl()
                result = "redirected" if final_url != url else "ok"
                return dict(url=url, final_url=final_url, status=status, result=result,
                            duration_ms=round((time.monotonic() - started) * 1000), note="")
        except HTTPError as error:
            if method == "HEAD" and error.code in (405, 501):
                error.close()
                continue
            try:
                return dict(url=url, final_url=error.geturl(), status=error.code, result="broken",
                            duration_ms=round((time.monotonic() - started) * 1000), note=error.reason)
            finally:
                error.close()
        except (URLError, TimeoutError, OSError) as error:
            return dict(url=url, final_url="", status="", result="error",
                        duration_ms=round((time.monotonic() - started) * 1000), note=str(error))

    raise RuntimeError("HEAD 和 GET 均未产生结果")


def write_report(path, rows):
    """Write UTF-8-SIG CSV, neutralizing spreadsheet formulas in text fields."""
    def safe(value):
        text = str(value)
        return "'" + text if text.startswith(("=", "+", "-", "@")) else text

    with Path(path).open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: safe(row.get(field, "")) for field in FIELDS})


def main():
    parser = argparse.ArgumentParser(description="检查 URL 列表，并输出 CSV 报告。")
    parser.add_argument("input", type=Path, help="UTF-8 文本文件，每行一个 URL")
    parser.add_argument("--output", "-o", type=Path, default=Path("link-report.csv"), help="报告路径")
    parser.add_argument("--timeout", type=float, default=5, help="每个请求的超时秒数（默认 5）")
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error("--timeout 必须大于 0")

    urls = load_urls(args.input)
    if not urls:
        parser.error("输入文件中没有 URL")
    rows = []
    for index, url in enumerate(urls, start=1):
        result = audit_url(url, timeout=args.timeout)
        rows.append(result)
        print(f"[{index}/{len(urls)}] {result['result']:10} {result['status']!s:>3} {url}")
    write_report(args.output, rows)
    failures = sum(row["result"] in ("broken", "error", "invalid") for row in rows)
    print(f"报告：{args.output}；共 {len(rows)} 条，需处理 {failures} 条。")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
