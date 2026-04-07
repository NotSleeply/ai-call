#!/usr/bin/env python3
import argparse
import os
import re
import sys
from typing import Tuple


def extract_quoted_parts(task: str) -> list[str]:
    matches = re.findall(r'["“\'](.+?)["”\']', task)
    return [item.strip() for item in matches if item.strip()]


def parse_task(task: str) -> Tuple[str, str]:
    quoted = extract_quoted_parts(task)
    if len(quoted) >= 2:
        return quoted[0], quoted[1]

    path_match = re.search(r'--path\s+([^\s]+)', task, flags=re.IGNORECASE)
    prefix_match = re.search(r'--prefix\s+([^\s]+)', task, flags=re.IGNORECASE)

    if path_match and prefix_match:
        return path_match.group(1).strip(), prefix_match.group(1).strip()

    cn_path_match = re.search(r'([A-Za-z]:[\\/][^\s，。；;]+)', task)
    cn_prefix_match = re.search(r'(?:前缀|prefix)(?:是|为|=|:)?\s*([^\s，。；;]+)', task, flags=re.IGNORECASE)

    folder_path = cn_path_match.group(1).strip() if cn_path_match else ""
    prefix = cn_prefix_match.group(1).strip() if cn_prefix_match else ""

    if folder_path and prefix:
        return folder_path, prefix

    raise ValueError(
        "参数解析失败。请使用示例：给 \"D:/Downloads\" 加前缀 \"202604_\"，或 --path D:/Downloads --prefix 202604_"
    )


def run(folder_path: str, prefix: str) -> str:
    if not os.path.exists(folder_path):
        return f"执行失败：文件夹不存在 -> {folder_path}"

    if not os.path.isdir(folder_path):
        return f"执行失败：目标不是文件夹 -> {folder_path}"

    renamed: list[str] = []
    skipped: list[str] = []

    for file_name in os.listdir(folder_path):
        old_path = os.path.join(folder_path, file_name)
        if not os.path.isfile(old_path):
            continue

        if file_name.startswith(prefix):
            skipped.append(file_name)
            continue

        new_name = f"{prefix}{file_name}"
        new_path = os.path.join(folder_path, new_name)

        if os.path.exists(new_path):
            skipped.append(file_name)
            continue

        os.rename(old_path, new_path)
        renamed.append(new_name)

    return "\n".join(
        [
            "执行完成：批量文件前缀",
            f"目录: {folder_path}",
            f"前缀: {prefix}",
            f"重命名成功: {len(renamed)} 个",
            f"跳过: {len(skipped)} 个（已带前缀或目标文件已存在）",
            f"示例结果: {renamed[:10]}",
        ]
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Batch add file prefix skill")
    parser.add_argument("--task", default="")
    parser.add_argument("--cwd", default="")
    parser.add_argument("--skill-id", default="")
    parser.add_argument("--now", default="")

    args = parser.parse_args()

    try:
        folder_path, prefix = parse_task(args.task)
        result = run(folder_path, prefix)
        print(result)
        return 0
    except Exception as exc:
        print(f"执行失败，错误原因：{exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
