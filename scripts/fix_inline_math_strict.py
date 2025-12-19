#!/usr/bin/env python3
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), '..', 'docs')

# Match fenced code blocks (``` or ~~~) including their content
FENCE_RE = re.compile(r'(^([ \t]*)(`{3,}|~{3,}).*?\n.*?\n\2\3.*?$)', re.M | re.S)
# Match inline code spans using backticks: captures `+ ... `+
INLINE_CODE_RE = re.compile(r'(`+)(.+?)\1', re.S)
# Match single-$ inline math, not $$ display math; does not cross newlines
MATH_RE = re.compile(r'(?<!\$)\$(\s*)([^\n$]+?)(\s*)\$(?!\$)', re.S)


def ranges_from_iter(it):
    return [(m.start(), m.end()) for m in it]


def pos_in_ranges(pos, ranges):
    # ranges assumed sorted
    import bisect
    i = bisect.bisect_right(ranges, (pos, 10**18)) - 1
    if i >= 0:
        a, b = ranges[i]
        return a <= pos < b
    return False


def process_text(s):
    # collect fenced code ranges
    fence_ranges = ranges_from_iter(FENCE_RE.finditer(s))
    # collect inline code ranges
    inline_ranges = ranges_from_iter(INLINE_CODE_RE.finditer(s))
    # merge and sort
    skip_ranges = sorted(fence_ranges + inline_ranges)

    out = []
    last = 0
    # iterate over math matches and replace only when not inside skip ranges
    for m in MATH_RE.finditer(s):
        a, b = m.start(), m.end()
        if pos_in_ranges(a, skip_ranges):
            continue
        # append segment before match
        out.append(s[last:a])
        inner = m.group(2)
        # strip inner leading/trailing whitespace only
        new = f'${inner.strip()}$'
        out.append(new)
        last = b
    out.append(s[last:])
    new_s = ''.join(out)

    # compute how many replacements made (approx by counting occurrences difference)
    # safer: count number of matches outside skip ranges
    replaced = 0
    for m in MATH_RE.finditer(s):
        if not pos_in_ranges(m.start(), skip_ranges):
            # if inner had leading/trailing whitespace
            if m.group(1) or m.group(3):
                replaced += 1
    return new_s, replaced


def process_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            s = f.read()
    except Exception:
        return 0
    new_s, replaced = process_text(s)
    if replaced:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_s)
    return replaced


def main():
    modified = []
    total = 0
    for dirpath, dirs, files in os.walk(ROOT):
        for fn in files:
            if not fn.lower().endswith('.md'):
                continue
            path = os.path.join(dirpath, fn)
            r = process_file(path)
            if r:
                rel = os.path.relpath(path, os.path.join(os.path.dirname(__file__), '..'))
                modified.append((rel, r))
                total += r
    if modified:
        print('Modified files:')
        for p, n in modified:
            print(f'- {p}: {n} replacements')
        print(f'Total replacements: {total}')
    else:
        print('No replacements made.')

if __name__ == '__main__':
    main()
