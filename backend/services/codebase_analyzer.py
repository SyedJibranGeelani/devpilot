"""
Codebase Analyzer — real implementation.

Gathers file-tree structure, language statistics, technology stack detection,
and a plain-text summary. LLM-powered narrative analysis is wired in a later task.
"""

from collections import Counter
from models.schemas import CodebaseResult, FileNode, LanguageStat, StackInfo
from services.file_reader import walk_project, build_file_tree, read_file_content
from services.stack_detector import detect_stack

EXTENSION_TO_LANGUAGE: dict[str, str] = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".cs": "C#",
    ".cpp": "C++",
    ".c": "C",
    ".rb": "Ruby",
    ".php": "PHP",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".md": "Markdown",
    ".sh": "Shell",
    ".sql": "SQL",
}


async def analyze_codebase(project_path: str) -> CodebaseResult:
    files = walk_project(project_path)

    # ── Language stats & line count ──────────────────────────────────────────
    lang_counter: Counter = Counter()
    total_lines = 0
    for f in files:
        lang = EXTENSION_TO_LANGUAGE.get(f["extension"], "Other")
        lang_counter[lang] += 1
        content = read_file_content(f["path"])
        if content:
            total_lines += content.count("\n") + 1

    total_files = len(files)
    lang_stats: list[LanguageStat] = [
        LanguageStat(
            language=lang,
            file_count=count,
            percentage=round(count / total_files * 100, 1) if total_files else 0.0,
        )
        for lang, count in lang_counter.most_common()
    ]

    # ── File tree ─────────────────────────────────────────────────────────────
    raw_tree = build_file_tree(project_path)
    file_tree = _dict_to_file_node(raw_tree)

    # ── Technology stack detection ────────────────────────────────────────────
    stack = detect_stack(project_path)

    # ── Summary ───────────────────────────────────────────────────────────────
    primary_lang = lang_stats[0].language if lang_stats else "unknown"
    lang_list = ", ".join(s.language for s in lang_stats[:5])
    summary_parts = [
        f"Project contains {total_files} file{'s' if total_files != 1 else ''} "
        f"({total_lines:,} lines of code) "
        f"across {len(lang_stats)} language{'s' if len(lang_stats) != 1 else ''}.",
    ]
    if lang_stats:
        summary_parts.append(
            f"Primary language: {primary_lang} "
            f"({lang_stats[0].percentage}% of files). "
            f"All detected languages: {lang_list}."
        )
    if not stack.is_empty():
        summary_parts.append(stack.summary_line())

    summary = "  ".join(summary_parts)

    stack_schema = StackInfo(
        languages=stack.languages,
        frameworks=stack.frameworks,
        tools=stack.tools,
        package_managers=stack.package_managers,
    )

    return CodebaseResult(
        file_tree=file_tree,
        language_stats=lang_stats,
        summary=summary,
        total_files=total_files,
        total_lines=total_lines,
        stack=stack_schema,
    )


def _dict_to_file_node(d: dict) -> FileNode:
    return FileNode(
        name=d["name"],
        path=d["path"],
        type=d["type"],
        children=[_dict_to_file_node(c) for c in d.get("children", [])],
    )
