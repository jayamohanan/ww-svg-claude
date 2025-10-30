import csv
import re
import os
import sys

def find_matching_words(pattern, csv_file='words.csv'):
    # Always resolve CSV path relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, csv_file)

    if not os.path.exists(csv_path):
        print(f"Error: Could not find '{csv_path}'.")
        sys.exit(1)

    pattern = pattern.strip()
    pattern_length = len(pattern)

    # Build regex pattern — replace underscores with '.' (match any single char)
    regex_pattern = '^' + pattern.replace('_', '.') + '$'
    regex = re.compile(regex_pattern, re.IGNORECASE)

    matches = []
    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            word = row.get('word', '').strip()
            try:
                length = int(row.get('length', len(word)))
            except ValueError:
                continue

            if length == pattern_length and regex.match(word):
                matches.append(word)

    return matches


if __name__ == '__main__':
    user_input = input("Enter pattern (use _ for unknown letters, e.g. __r_): ").strip()
    results = find_matching_words(user_input)

    if results:
        print(f"\nMatching words for pattern '{user_input}':")
        for w in results:
            print("-", w)
    else:
        print(f"No matches found for pattern '{user_input}'.")
