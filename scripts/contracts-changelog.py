from datetime import datetime
import re
import subprocess
import sys

# Configuration constants
TARGET_DIR = "contracts/contracts/streampay-stream/"


def get_git_log(directory: str) -> str:
    """Executes a native git command synchronously to fetch the commit history

    for a specific directory. Uses the format: "Subject Line (Short Hash)".
    """
    try:
        # Run git log command and capture the output string
        command = ["git", "log", '--pretty=format:%s (%h)', "--", directory]
        result = subprocess.run(
            command, capture_output=True, text=True, check=True, encoding="utf-8"
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        print(
            "Error executing git log. Ensure you are running this inside a valid git repository.",
            file=sys.stderr,
        )
        sys.exit(1)


def group_commits(log_output: str) -> dict:
    """Parses raw git log output line-by-line and groups the commits

    into conventional types (feat, fix, task, others).
    """
    groups = {"features": [], "fixes": [], "tasks": [], "others": []}

    if not log_output:
        return groups

    lines = log_output.split("\n")

    for line in lines:
        clean_line = line.strip()
        if not clean_line:
            continue

        # Regex to match conventional layouts like "feat(scope): desc" or "fix: desc"
        match = re.match(r"^([a-zA-Z0-9_-]+)(?:\([^\)]+\))?:\s*(.*)$", clean_line)

        if match:
            commit_type = match.group(1).lower()

            if commit_type == "feat":
                groups["features"].append(clean_line)
            elif commit_type == "fix":
                groups["fixes"].append(clean_line)
            elif commit_type == "task":
                groups["tasks"].append(clean_line)
            else:
                groups["others"].append(clean_line)
        else:
            # Fallback grouping for non-structured commit subjects
            groups["others"].append(clean_line)

    return groups


def generate_markdown(groups: dict) -> str:
    """Constructs a beautifully structured Markdown changelog entry string."""
    today_date = datetime.now().strftime("%Y-%m-%d")

    markdown = "# Draft Changelog Entry\n\n"
    markdown += f"Generated on: {today_date}\n"
    markdown += f"Target Directory: `{TARGET_DIR}`\n\n--- \n\n"

    def render_section(title: str, items: list):
        nonlocal markdown
        if items:
            markdown += f"### {title}\n"
            for item in items:
                markdown += f"- {item}\n"
            markdown += "\n"

    render_section("🚀 Features", groups["features"])
    render_section("🐛 Bug Fixes", groups["fixes"])
    render_section("🛠️ Tasks", groups["tasks"])
    render_section("📝 Other Changes", groups["others"])

    total_commits = sum(len(items) for items in groups.values())
    if total_commits == 0:
        markdown += "*No recent changes found in this directory.*\n"

    return markdown


def main():
    """Core execution pipeline coordinating log scanning and markdown printing."""
    print(f"Scanning commits for: {TARGET_DIR}...\n")

    log_output = get_git_log(TARGET_DIR)
    grouped_commits = group_commits(log_output)
    markdown_output = generate_markdown(grouped_commits)

    print(markdown_output)


if __name__ == "__main__":
    main()