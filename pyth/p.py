import csv
import random
import os
from collections import defaultdict

# ==============================
# CONFIGURATION
# ==============================
repeat = False  # 🔁 Change to True if a word can appear multiple times
max_display = 5  # Max number of combos to print
# ==============================

# --- Resolve CSV path (always relative to this script) ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "words.csv")

# --- Load words from CSV ---
def load_words(filename, word_length):
    words = []
    try:
        with open(filename, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    if int(row['length']) == word_length:
                        words.append(row['word'].strip().lower())
                except (KeyError, ValueError):
                    continue
        random.shuffle(words)  # Shuffle for randomness
        print(f"✅ Loaded {len(words)} words of length {word_length}")
    except FileNotFoundError:
        print(f"❌ Error: Could not find file '{filename}'")
        exit(1)
    return words

# --- Parse connection string like "01-10,02-23,13-30" ---
def parse_connections(conn_str):
    connections = []
    for part in conn_str.split(','):
        left, right = part.split('-')
        a, ai = int(left[0]), int(left[1])
        b, bi = int(right[0]), int(right[1])
        connections.append((a, ai, b, bi))
    return connections

# --- Check if a partial combination is still valid ---
def is_valid_partial(words_so_far, connections):
    for (a, ai, b, bi) in connections:
        if a < len(words_so_far) and b < len(words_so_far):
            if words_so_far[a][ai] != words_so_far[b][bi]:
                return False
    return True

# --- Main search function ---
def find_word_combinations(words, connections, word_length):
    num_words = max(max(a, b) for (a, _, b, _) in connections) + 1

    results = []
    found_count = 0
    used_words_by_position = [set() for _ in range(num_words)]

    def backtrack(current):
        nonlocal found_count
        if len(current) == num_words:
            # Check for repeats in same position for first 5 combos
            if found_count < max_display:
                can_print = True
                for i, w in enumerate(current):
                    if w in used_words_by_position[i]:
                        can_print = False
                        break
                if can_print:
                    found_count += 1
                    print(f"[{found_count}] Found:", tuple(current))
                    results.append(tuple(current))
                    # Mark words as used for this position
                    for i, w in enumerate(current):
                        used_words_by_position[i].add(w)
            else:
                results.append(tuple(current))
            return

        for w in words:
            if not repeat and w in current:
                continue
            new_combo = current + [w]
            if is_valid_partial(new_combo, connections):
                backtrack(new_combo)
                if found_count >= max_display:
                    return  # stop recursion early if we've printed enough

    backtrack([])
    return results

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    word_length = int(input("Enter word length: "))
    conn_str = input("Enter connection string (e.g. 01-10,02-23,13-30,22-33): ")

    words = load_words(CSV_PATH, word_length)
    connections = parse_connections(conn_str)

    print("🔍 Finding valid combinations... (progress will print as they are found)")
    matches = find_word_combinations(words, connections, word_length)

    print(f"\n✅ Total combinations found: {len(matches)}")
